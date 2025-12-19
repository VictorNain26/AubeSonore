/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return 'Unknown error';
}

/**
 * Check if error is an instance of Error
 */
export function isError(err: unknown): err is Error {
  return err instanceof Error;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown, statusCode = 500): {
  error: string;
  message: string;
  statusCode: number;
} {
  return {
    error: 'Error',
    message: getErrorMessage(error),
    statusCode,
  };
}
