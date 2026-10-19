# Project Structure

## Directory Overview

```
config/       # constants and static configuration
docs/         # project documentation
helpers/      # shared helpers used across all tests
schemas/      # schema definitions for response body validation
testData/     # centralized test input data, one file per protocol
types/        # TypeScript interfaces
wiremock/
  mappings/     # static WireMock stub mapping files
test/
  rest/
    regression/   # regression tests — detailed assertions per endpoint
    smoke/        # smoke tests — full happy-path flows
    mock/         # WireMock-backed tests for mutating endpoints
  soap/
    regression/   # SOAP regression tests — detailed assertions per operation
    smoke/        # SOAP smoke tests — basic functional verification
```

## config/

Static, reusable constants shared across the project.

- `httpStatus.ts` — re-exports `HTTP_STATUS` from `@jirivondra/chronos-test-toolkit-api-ts`, which sources its values from axios's `HttpStatusCode` enum. Always use these instead of raw numbers.
- `urls.ts` — named URL path constants. Always use these instead of inline strings.
- `soapOperations.ts` — named SOAP operation constants (`SOAP_OPERATIONS.ADD`, `SOAP_OPERATIONS.DIVIDE`, …). Always use these instead of raw strings.

## helpers/

Thin, project-local wiring around `@jirivondra/chronos-test-toolkit-api-ts`. No request/response logic lives here — that's the shared package's job.

- `apiClient.ts` — wires `createHttpClients` from the toolkit with this project's `.env` (`BASE_URL`, `API_USERNAME`, `API_PASSWORD`), exporting `clients: HttpClients`.
- `makeRequest.ts` — wires `createRequestHelpers(clients)` from the toolkit, re-exporting `get`, `post`, `put`, `del`. Each function accepts an `authenticated` flag (default `true`) and returns `ApiResponse`.
- `soapClient.ts` — wires `createSoapClient` from the toolkit against the WSDL at `SOAP_URL`.
- `makeSoapRequest.ts` — wires `createSoapRequestHelper` from the toolkit, re-exporting `callOperation(operation, params)`.
- `mockApiClient.ts` — wires `createHttpClients` against `WIREMOCK_URL` instead of `BASE_URL`, exporting `mockClients: HttpClients`.
- `makeMockRequest.ts` — wires `createRequestHelpers(mockClients)`, re-exporting `get`, `post`, `put`, `del` for use against the local WireMock stub server.

`ApiResponse` (fluent `expectStatus`/`expectJsonSchema`) and `SoapResponse` (fluent `expectStatus`/`expectResult`/`expectFault`/`expectFaultContains`) live entirely in `@jirivondra/chronos-test-toolkit-api-ts` — see that package's README for their full API.

## testData/

Centralized test input data shared across all test files. One file per protocol.

- `restTestData.ts` — input data for REST tests, organized by endpoint. Dynamic values are generated with `faker`.
- `soapTestData.ts` — input data for SOAP tests, organized by operation. Contains `common` for shared invalid-input cases used across all operations.
- `mockTestData.ts` — input data for WireMock-backed REST tests. Values are static, matching the request bodies and URLs baked into the corresponding `wiremock/mappings/*.json` stub files.

Test files import the named export and reference data by key — never define input values inline in test files.

## schemas/

Schema definitions used by `ApiResponse.expectJsonSchema()` to validate response body shape and types. Written as standard JSON Schema objects, validated at runtime with `ajv`.

- `todo.schema.ts` — JSON Schema for the Todo entity, generated from Chronost_App's own `/openapi.json` by `scripts/generate-schema.ts` (see `scripts/`) and committed as-is — not hand-edited. Regenerate with `npm run generate-schema` (or `task generate-schema`) and copy `schemas/generated/todo.schema.ts` over this file whenever the `Todo` response model changes on the API side.
- `generated/` — output of `scripts/generate-schema.ts` (git- and lint-ignored, see `scripts/`), regenerated fresh on every run. `todo.schema.ts` above started as a copy of this directory's `todo.schema.ts`.

## scripts/

Standalone dev tooling, not part of the compiled test build (excluded in `tsconfig.json`) and not run by any `npm test*`/`task test*` command.

- `generate-schema.ts` — extracts every entity's shape from the live API's own `/openapi.json` (OpenAPI 3.1, which is JSON-Schema-compatible) and writes each one as a `SchemaObject` to `schemas/generated/<name>.schema.ts`. Strips OpenAPI-only keywords (`example`, …) that ajv's strict mode would otherwise reject. Run via `npm run generate-schema` or `task generate-schema` — no arguments needed, it generates everything `/openapi.json` currently defines. Chronost_App's `/todos` GET endpoints now declare `response_model=Todo`, so `Todo` is one of the generated files alongside `TodoCreate`/`TodoUpdate` (the POST/PUT request bodies) — `schemas/todo.schema.ts` is a committed copy of the generated `Todo` schema, kept in sync by hand whenever the API's response model changes.

## types/

TypeScript interfaces for domain entities used in tests and helpers.

- `todo.ts` — `Todo` interface (id, title, completed, …).
- `mocha.ts` — augments `Mocha.Context` with the typed properties tests share through `this` (`todoId`, `result`, …).

## wiremock/

Static configuration for the local [WireMock](https://wiremock.org) stub server used by `test/rest/mock/`.

- `mappings/*.json` — one file per stubbed request: matches a method/URL/body and returns a fixed response. Loaded automatically when the container starts (see `docker-compose.yml`, task `wiremock-up`). Values here are declarative external config, not application code — matched request bodies are exempt from the "no hardcoded values" rule the same way `config/soapOperations.ts` constants are.

## test/

All test files live here, organized by protocol and test type.

### test/rest/regression/

One file per endpoint. Each file covers all scenarios for that endpoint: happy path, authentication, validation errors, not found, etc.

### test/rest/smoke/

End-to-end flows that verify the system works as a whole. A single test typically creates, reads, updates, and deletes a resource in sequence.

### test/rest/mock/

One file per mutating endpoint (POST/PUT/DELETE), run against a local WireMock instance instead of `BASE_URL`. Verifies the request/response contract without ever touching the real backend, so no data is created — no `before`/`after` cleanup is needed. `task test-mock` / `npm run test:mock` start the WireMock container, run the tests, and stop the container automatically.

### test/soap/regression/

One file per SOAP operation. Each file covers all scenarios for that operation: valid inputs, edge cases (e.g. division by zero), invalid values. Cross-operation tests that verify mathematical properties (round-trip, commutativity) live in `combined-operations.spec.ts`.

### test/soap/smoke/

Basic functional verification that each SOAP operation responds. Only the status code is asserted.

## .env

Runtime secrets and environment-specific config. Never committed to git.

```
BASE_URL=http://localhost:8000
API_USERNAME=your_username
API_PASSWORD=your_password
SOAP_URL=http://localhost:8001
WIREMOCK_URL=http://localhost:8080
```
