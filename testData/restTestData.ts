import { faker } from '@faker-js/faker';
import dayjs from 'dayjs';

const randomFutureDate = () =>
    dayjs()
        .add(faker.number.int({ min: 1, max: 365 }), 'day')
        .format('YYYY-MM-DD');

export const restTestData = {
    getTodoById: {
        create: { title: faker.lorem.words(3), completed: false },
    },
    getTodos: {
        completed: { title: faker.lorem.words(3), completed: true },
        notCompleted: { title: faker.lorem.words(3), completed: false },
        limit: 1,
        // not one of the frontend's fixed items-per-page options (10/30/50) — the backend only requires limit >= 1
        unrestrictedLimit: 7,
        invalidQueryParams: [
            { params: { page: 0 }, description: 'page = 0' },
            { params: { page: -1 }, description: 'page = -1' },
            { params: { limit: 0 }, description: 'limit = 0' },
            { params: { limit: -1 }, description: 'limit = -1' },
            { params: { completed: 'not-a-boolean' }, description: 'completed is not a boolean' },
        ],
    },
    postTodo: {
        valid: { title: faker.lorem.words(3), completed: false },
        withDueDate: { title: faker.lorem.words(3), completed: false, due_date: randomFutureDate() },
        invalidDescription: { title: faker.lorem.words(3), description: 'x'.repeat(5001), completed: false },
    },
    putTodo: {
        create: { title: faker.lorem.words(3), completed: false },
        update: { title: faker.lorem.words(3), completed: true },
        updateWithDueDate: { due_date: randomFutureDate() },
        invalidDescription: { title: faker.lorem.words(3), description: 'x'.repeat(5001) },
    },
    deleteTodo: {
        create: { title: faker.lorem.words(3), completed: false },
    },
    smoke: {
        create: { title: faker.lorem.words(3), completed: false },
        update: { title: faker.lorem.words(3), completed: true },
    },
};
