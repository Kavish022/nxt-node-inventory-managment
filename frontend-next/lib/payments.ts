import axios from 'axios';
import { apiClient } from './api-client';
import { ApiResponse } from '@/types';

export function paymentError(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error))
    return (
      error.response?.data?.message ||
      'The request could not be completed. Please try again.'
    );
  return 'The request could not be completed. Please try again.';
}

export async function paymentPost<T>(
  path: string,
  body: unknown = {},
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const csrf =
      await apiClient.get<ApiResponse<{ csrfToken: string }>>('/auth/csrf');
    try {
      const response = await apiClient.post<ApiResponse<T>>(path, body, {
        headers: { 'X-CSRF-Token': csrf.data.data.csrfToken },
      });
      return response.data.data;
    } catch (error) {
      // A session refresh rotates the CSRF cookie. Refetch it once before retrying a rejected request.
      if (
        attempt === 0 &&
        axios.isAxiosError(error) &&
        error.response?.status === 403 &&
        error.response.data?.message === 'Invalid or missing CSRF token'
      )
        continue;
      throw error;
    }
  }
  throw new Error('Could not refresh the request token');
}

export function paymentAmount(amount: string, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(Number(amount));
}
