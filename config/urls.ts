export const todoUrls = {
    todos: {
        base: '/todos',
        /**
         * Builds `/todos` with a query string, e.g. `withQuery({ completed: true, page: 2 })`
         * → `/todos?completed=true&page=2`.
         * @param params - query parameter values, keyed by name
         */
        withQuery: (params: Record<string, string | number | boolean>) => {
            const entries = Object.entries(params).map(([key, value]) => [key, String(value)]);
            return `/todos?${new URLSearchParams(entries).toString()}`;
        },
    },
    todoById: {
        /**
         * Builds the path of a single todo, e.g. `/todos/42`.
         * @param id - id of an existing todo
         */
        valid: (id: number) => `/todos/${id}`,
        notFound: '/todos/99999',
        invalidId: '/todos/{id}',
    },
};
