import { API_BASE_URL } from './config';

export interface ApiFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include', // ⚠️ Important pour que le cookie HttpOnly soit envoyé
    mode: 'cors', // Assure le CORS pour frontend-backend séparés
  };

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[apiFetch] Request:', url, fetchOptions);
  }

  let response: Response | undefined;
  let responseBody: unknown;

  try {
    response = await fetch(url, fetchOptions);

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    responseBody = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorResponse = responseBody as ApiErrorResponse;
      const errorMessage = errorResponse?.error ?? errorResponse?.message ?? response.statusText;
      throw new Error(errorMessage);
    }

    return responseBody as T;
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[apiFetch Error]', error);

    if (response === undefined) {
      throw new Error('Impossible de contacter le serveur.');
    }

    const errorResponse = responseBody as ApiErrorResponse;
    throw new Error(
      errorResponse?.error ??
        errorResponse?.message ??
        response.statusText ??
        'Erreur réseau inconnue.',
    );
  }
}
