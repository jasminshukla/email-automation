import { getResend, jsonError, unwrap } from '../../../lib/resend';
import { listFrom, normalizeAudience } from '../../../lib/normalize';

export async function GET() {
  try {
    const resend = getResend();
    const audiences = listFrom(unwrap(await resend.segments.list())).map(
      normalizeAudience,
    );
    return Response.json({ data: audiences });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();

    if (!name) {
      return Response.json({ error: 'Audience name is required' }, { status: 400 });
    }

    const resend = getResend();
    const data = unwrap(await resend.segments.create({ name }));
    return Response.json({ data: normalizeAudience(data) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
