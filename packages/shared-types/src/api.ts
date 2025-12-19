/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error?: string;
  message?: string;
  statusCode?: number;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  data: T;
  message?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}
