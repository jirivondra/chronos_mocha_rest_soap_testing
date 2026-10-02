import assert from 'node:assert/strict';
import { get, post, del } from '../../../helpers/makeRequest';
import { todoSchema } from '../../../schemas/todo.schema';
import type { Todo } from '../../../types/todo';
import { HTTP_STATUS } from '../../../config/httpStatus';
import { todoUrls } from '../../../config/urls';
import { restTestData } from '../../../testData/restTestData';

describe('GET /todos', function () {
    before(async function () {
        const completed = await post(todoUrls.todos.base, restTestData.getTodos.completed);
        this.completedTodoId = (completed.json as Todo).id;
        const notCompleted = await post(todoUrls.todos.base, restTestData.getTodos.notCompleted);
        this.notCompletedTodoId = (notCompleted.json as Todo).id;
    });

    after(async function () {
        await del(todoUrls.todoById.valid(this.completedTodoId));
        await del(todoUrls.todoById.valid(this.notCompletedTodoId));
    });

    it('Test for GET - 200', async function () {
        const response = await get(todoUrls.todos.base);
        response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema);
    });

    it('Test for GET - 401', async function () {
        const response = await get(todoUrls.todos.base, false);
        response.expectStatus(HTTP_STATUS.UNAUTHORIZED);
    });

    it('Test for GET with completed=true - 200', async function () {
        const response = await get(todoUrls.todos.withQuery({ completed: true }));
        const todos = response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema).json as Todo[];
        assert.ok(todos.every((todo) => todo.completed));
    });

    it('Test for GET with completed=false - 200', async function () {
        const response = await get(todoUrls.todos.withQuery({ completed: false }));
        const todos = response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema).json as Todo[];
        assert.ok(todos.every((todo) => !todo.completed));
    });

    it('Test for GET with limit - 200', async function () {
        const response = await get(todoUrls.todos.withQuery({ limit: restTestData.getTodos.limit }));
        const todos = response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema).json as Todo[];
        assert.strictEqual(todos.length, restTestData.getTodos.limit);
    });

    it('Test for GET with a limit outside the frontend-fixed options - 200', async function () {
        const response = await get(todoUrls.todos.withQuery({ limit: restTestData.getTodos.unrestrictedLimit }));
        const todos = response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema).json as Todo[];
        assert.ok(todos.length <= restTestData.getTodos.unrestrictedLimit);
    });

    it('Test for GET pagination - page 2 returns a different item than page 1', async function () {
        const page1 = await get(todoUrls.todos.withQuery({ page: 1, limit: 1 }));
        const page2 = await get(todoUrls.todos.withQuery({ page: 2, limit: 1 }));
        const [first] = page1.expectStatus(HTTP_STATUS.OK).json as Todo[];
        const [second] = page2.expectStatus(HTTP_STATUS.OK).json as Todo[];
        assert.notStrictEqual(first!.id, second!.id);
    });

    restTestData.getTodos.invalidQueryParams.forEach(({ params, description }) => {
        it(`Test for GET with ${description} - 422`, async function () {
            const response = await get(todoUrls.todos.withQuery(params));
            response.expectStatus(HTTP_STATUS.UNPROCESSABLE_ENTITY);
        });
    });
});
