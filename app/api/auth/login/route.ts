import { NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_PASSWORD, AUTH_USERNAME, sessionToken } from '../../../../lib/auth';

export async function POST(request: Request) {
  const { username, password } = await request.json().catch(() => ({}));
  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
