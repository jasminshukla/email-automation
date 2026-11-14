import { Resend } from 'resend';

export function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing. Add it to your .env file.');
  }

  return new Resend(apiKey);
}

export function getDefaultFrom() {
  return process.env.RESEND_FROM_EMAIL || '';
}

export async function resendFetch(path: string, init: RequestInit = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing. Add it to your .env file.');
  }

  const response = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'jasmin-growth-engine',
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && (payload.message || payload.error)) ||
      `Resend request failed (${response.status})`;
    const error = new Error(
      typeof message === 'string' ? message : 'Resend request failed',
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return payload as { id?: string; name?: string };
}

export function unwrap<T>(result: {
  data: T | null;
  error: { message?: string; name?: string; statusCode?: number } | null;
}): T {
  if (result.error) {
    const error = new Error(result.error.message || 'Resend request failed');
    (error as Error & { status?: number }).status = result.error.statusCode || 400;
    throw error;
  }

  if (result.data == null) {
    throw new Error('Resend returned no data');
  }

  return result.data;
}

export function jsonError(error: unknown, fallbackStatus = 500) {
  const message =
    error instanceof Error ? error.message : 'Unexpected server error';
  const status =
    typeof error === 'object' &&
    error &&
    'status' in error &&
    typeof (error as { status?: number }).status === 'number'
      ? (error as { status: number }).status
      : fallbackStatus;

  return Response.json({ error: message }, { status });
}
