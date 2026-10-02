# Test Patterns

## Layers

Tests are composed from five shared layers plus the test files themselves:

- **testData/** — all test input values and expected results. Never define data inline in test files.
- **config/** — named constants for URLs, HTTP status codes, and SOAP operations. Never use raw strings or numbers in tests.
- **helpers/** — thin project-local wiring (`makeRequest`, `makeSoapRequest`, `makeMockRequest`) around `@jirivondra/chronos-test-toolkit-api-ts`, which owns the actual HTTP/SOAP client logic and response wrappers (`ApiResponse`, `SoapResponse`).
- **schemas/** — response body shape definitions used for JSON validation.
- **types/** — TypeScript interfaces for domain entities.

## Making requests

`makeRequest` exposes `get`, `post`, `put`, `del`. Each returns `ApiResponse`. Pass `authenticated = false` to send an unauthenticated request (used for 401 test cases).

## Asserting responses

`ApiResponse` provides two chainable assertion methods:

- `expectStatus(code)` — asserts the HTTP status code
- `expectJsonSchema(schema)` — validates response body field types, required fields, and nullability

To read a value from the response body, cast `response.json` to the appropriate type.

For content the fluent API doesn't cover — e.g. "every returned item matches a filter", "two responses differ" — assert on that value with Node's built-in `assert/strict`, chained after `expectStatus`/`expectJsonSchema` rather than instead of them:

```ts
const response = await get(todoUrls.todos.withQuery({ completed: true }));
const todos = response.expectStatus(HTTP_STATUS.OK).json as Todo[];
assert.ok(todos.every((todo) => todo.completed));
```

## Test data

All test input data lives in `testData/`, one file per protocol:

- `restTestData.ts` — organized by endpoint (`postTodo`, `putTodo`, …), with scenario keys within (`valid`, `create`, `update`, `invalidDescription`). Dynamic values use `faker`.
- `soapTestData.ts` — organized by operation (`add`, `subtract`, …). Shared invalid-input cases live under `common`. Values are static for deterministic results.
- `mockTestData.ts` — organized by endpoint (`postTodo`, `putTodo`, `deleteTodo`). Values are static, mirroring `soapTestData.ts`'s reasoning: WireMock matches requests by their exact literal content, so a `faker`-generated body would never hit a stub.

Test files import the named export and never define data inline:

```ts
import { restTestData } from '../../../testData/restTestData';
import { soapTestData } from '../../../testData/soapTestData';
```

Smoke tests reuse the first entry from regression cases instead of duplicating data:

```ts
const { a, b, expected } = soapTestData.add.cases[0]!;
```

## Data-driven tests

When the same operation is verified across many input combinations, use `forEach` over a `cases` array from `testData/`. Each entry in the array produces one `it` block.

```ts
soapTestData.add.cases.forEach(({ a, b, expected }) => {
    it(`Add(${a}, ${b}) = ${expected}`, async function () {
        const response = await callOperation(SOAP_OPERATIONS.ADD, { a, b });
        response.expectStatus(HTTP_STATUS.OK).expectResult(expected);
    });
});
```

The `it` name is generated from the actual values using a template literal — this makes every failing test immediately identifiable in the output without inspecting the data file.

The same pattern applies to invalid-input (rainy day) cases:

```ts
soapTestData.common.invalidCases.forEach(({ a, b, description }) => {
    it(`Add with ${description} → SOAP Fault`, async function () {
        const response = await callOperation(SOAP_OPERATIONS.ADD, { a, b });
        response
            .expectStatus(HTTP_STATUS.INTERNAL_SERVER_ERROR)
            .expectFaultContains(soapTestData.common.invalidTypeFault);
    });
});
```

Each `forEach` iteration is still a single independent `it` block — the same rules apply: one concern per test, AAA structure, no shared mutable state between iterations.

## Regression tests

One file per endpoint or operation. Each `it` block covers exactly one scenario. Resources created during a test are cleaned up in `after`.

## Shared state via `this` vs variables

The Mocha context (`this`) belongs to one `describe` and its nested `describe`s — it is never shared between files. What goes where depends on **when the value becomes known**:

| Value                                                                                                        | Where                                                 |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Used by a single test (`response`, data destructured from `testData/`)                                       | `const` inside the `it`                               |
| Known only at runtime and read by other hooks or tests (id of a created resource, result of a previous step) | `this.xyz`, set in a hook or in the flow's first `it` |
| Known when the file loads and shared by several tests                                                        | `const` in the `describe` scope                       |

Never declare a `let` in the `describe` scope to pass state between hooks and tests — use `this` (`this.todoId = ...` in `before`/`beforeEach`, read as `this.todoId` in `it`/`after`). This is also why every `describe`/`it`/hook uses `function () {}`: in an arrow function `this` is not the Mocha context.

Every `this` property is declared once in `types/mocha.ts`, which augments `Mocha.Context`, so `this.todoId` is typed `number` instead of `any`. Add a property there when a new test needs one.

## Smoke tests

One file per flow. Sequential `it` blocks share state via the Mocha context (see [Shared state via `this` vs variables](#shared-state-via-this-vs-variables)). Only the status code is asserted — detailed validation belongs in regression tests.

## Mock tests (WireMock)

One file per mutating endpoint (POST/PUT/DELETE), living in `test/rest/mock/`. Instead of `makeRequest`, tests import `makeMockRequest`, which points at a local WireMock instance (`WIREMOCK_URL`) instead of `BASE_URL`:

```ts
import { post } from '../../../helpers/makeMockRequest';
import { mockTestData } from '../../../testData/mockTestData';

const response = await post(todoUrls.todos.base, mockTestData.postTodo.valid);
response.expectStatus(HTTP_STATUS.CREATED).expectJsonSchema(todoSchema);
```

The request body must exactly match what's configured in the corresponding `wiremock/mappings/*.json` stub, which is why `mockTestData.ts` uses static values instead of `faker`. Since WireMock never persists anything, these tests need no `before`/`after` cleanup — there's nothing created to delete. `task test-mock` (or `npm run test:mock`) starts the WireMock container from `docker-compose.yml`, runs the tests, and stops the container again — no manual setup step required.

### Debugging mock tests

A stub mismatch surfaces in Mocha as a plain assertion error — e.g. `AssertionError: expected 404 to equal 201` — because WireMock's own diagnostics live in the response body, which `expectStatus`/`expectJsonSchema` never inspect. To see the actual reason, use WireMock's admin API directly. Start the container standalone first (`task wiremock-up` — `task test-mock` tears it down as soon as the run finishes):

- **Reproduce by hand** — take the exact body from the failing test's `testData/mockTestData.ts` entry and send it with `curl` against `WIREMOCK_URL`. A non-matching request gets a human-readable diff back, showing the closest stub side-by-side with what was actually sent:

    ```bash
    curl -i -X POST http://localhost:8080/todos \
      -H "Content-Type: application/json" \
      -d '{"title":"Something else","completed":false}'
    ```

- **`GET /__admin/mappings`** — lists every stub currently loaded, useful to confirm a mapping file was picked up at all.
- **`GET /__admin/requests/unmatched`** — the journal of requests WireMock received but couldn't match to any stub, including their raw body. Handy when you don't know what was actually sent (e.g. from a CI log) rather than reproducing by hand. It accumulates for the container's lifetime; clear it with `POST /__admin/requests/reset`.
- **`Matched-Stub-Id` response header** — present on every successful (matched) response; identifies which mapping answered, useful when several stubs could plausibly overlap.

There is no bundled visual UI in the open-source `wiremock/wiremock` Docker image (`/__admin/webapp` doesn't exist) — the admin endpoints above are plain JSON, readable directly in a browser, via `curl`, or through a REST client like Postman.

---

For step-by-step guidance when writing new tests, use:

- `/add-regression-test`
- `/add-smoke-test`
