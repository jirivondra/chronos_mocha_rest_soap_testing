import assert from 'node:assert';
import { get, post, del } from '../../../helpers/makeRequest';
import { todoSchema } from '../../../schemas/todo.schema';
import { HTTP_STATUS } from '../../../config/httpStatus';
import { todoUrls } from '../../../config/urls';
import { restTestData } from '../../../testData/restTestData';
import type { Todo } from '../../../types/todo';

describe('GET /todos', function () {
    it('Test for GET - 200', async function () {
        const response = await get(todoUrls.todos.base);
        response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema);
    });

    it('Test for GET - 401', async function () {
        const response = await get(todoUrls.todos.base, false);
        response.expectStatus(HTTP_STATUS.UNAUTHORIZED);
    });

    describe('with an open and a completed TODO', function () {
        beforeEach(async function () {
            const openResponse = await post(todoUrls.todos.base, restTestData.getTodos.createOpen);
            this.openTodoId = (openResponse.json as Todo).id;
            const completedResponse = await post(todoUrls.todos.base, restTestData.getTodos.createCompleted);
            this.completedTodoId = (completedResponse.json as Todo).id;
        });

        afterEach(async function () {
            await del(todoUrls.todoById.valid(this.openTodoId));
            await del(todoUrls.todoById.valid(this.completedTodoId));
        });

        it('Test for GET - filters by completed status', async function () {
            const response = await get(`${todoUrls.todos.base}?completed=true`);
            response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema);
            const todos = response.json as Todo[];
            assert.ok(todos.every((todo) => todo.completed === true));
            assert.ok(todos.some((todo) => todo.id === this.completedTodoId));
            assert.ok(!todos.some((todo) => todo.id === this.openTodoId));
        });

        it('Test for GET - limits the number of returned items', async function () {
            const response = await get(`${todoUrls.todos.base}?limit=1`);
            response.expectStatus(HTTP_STATUS.OK).expectJsonSchema(todoSchema);
            const todos = response.json as Todo[];
            assert.strictEqual(todos.length, 1);
        });
    });
});
