// Generated from /openapi.json by scripts/generate-schema.ts — do not edit by hand.
import type { SchemaObject } from '@jirivondra/chronos-test-toolkit-api-ts';

export const todoSchema: SchemaObject = {
    properties: {
        title: {
            type: 'string',
            minLength: 1,
            title: 'Title',
        },
        description: {
            anyOf: [
                {
                    type: 'string',
                    maxLength: 5000,
                },
                {
                    type: 'null',
                },
            ],
            title: 'Description',
        },
        completed: {
            type: 'boolean',
            title: 'Completed',
            default: false,
        },
        due_date: {
            anyOf: [
                {
                    type: 'string',
                },
                {
                    type: 'null',
                },
            ],
            title: 'Due Date',
        },
        id: {
            type: 'integer',
            title: 'Id',
        },
    },
    type: 'object',
    required: ['title', 'description', 'completed', 'due_date', 'id'],
    title: 'Todo',
};
