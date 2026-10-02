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
    getTodos: {
        createOpen: { title: faker.lorem.words(3), completed: false },
        createCompleted: { title: faker.lorem.words(3), completed: true },
    },
    smoke: {
        create: { title: faker.lorem.words(3), completed: false },
        update: { title: faker.lorem.words(3), completed: true },
    },
};
