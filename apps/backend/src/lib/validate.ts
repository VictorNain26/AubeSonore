import { safeParse, BaseSchema, BaseIssue } from 'valibot';

interface ValidationError {
  status: number;
  error: string;
}

export function validateBody<T>(
  schema: BaseSchema<any, T, BaseIssue<unknown>>,
  body: unknown,
): T | ValidationError {
  const result = safeParse(schema, body);

  if (!result.success) {
    const messages = result.issues.map(issue => issue.message).join(', ');
    return { status: 400, error: `Validation échouée : ${messages}` };
  }

  return result.output;
}
