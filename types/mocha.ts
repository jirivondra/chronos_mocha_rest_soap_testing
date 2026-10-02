declare module 'mocha' {
    interface Context {
        todoId: number;
        todoIdWithDueDate: number;
        completedTodoId: number;
        notCompletedTodoId: number;
        result: number;
    }
}

export {};
