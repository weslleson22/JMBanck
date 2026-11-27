import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

export function zodResolver<T extends FieldValues>(schema: z.ZodType<T, any, any>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {
        values: result.data,
        errors: {},
      };
    }

    const fieldErrors: FieldErrors<T> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path && !(fieldErrors as Record<string, unknown>)[path]) {
        (fieldErrors as Record<string, unknown>)[path] = {
          type: issue.code,
          message: issue.message,
        };
      }
    }

    return {
      values: {},
      errors: fieldErrors,
    };
  };
}

