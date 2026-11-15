import { getResend, jsonError, unwrap } from '../../../lib/resend';
import { listFrom, normalizeContact } from '../../../lib/normalize';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const segmentId = searchParams.get('segmentId') || undefined;
    const resend = getResend();
    const result = segmentId
      ? await resend.contacts.list({ segmentId })
      : await resend.contacts.list();
    const contacts = listFrom(unwrap(result)).map(normalizeContact);

    return Response.json({ data: contacts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const resend = getResend();
    const segmentId = body.segmentId ? String(body.segmentId) : '';
    const payload = {
      email,
      firstName: body.firstName ? String(body.firstName) : undefined,
      lastName: body.lastName ? String(body.lastName) : undefined,
      unsubscribed: Boolean(body.unsubscribed),
      segments: segmentId ? [{ id: segmentId }] : undefined,
    };
    const result = await resend.contacts.create(payload);
    let created;
    if (result.error) {
      const message = (result.error.message || '').toLowerCase();
      const duplicate =
        result.error.statusCode === 409 || message.includes('already exist');
      if (!duplicate) unwrap(result);
      created = unwrap(await resend.contacts.get({ email }));
    } else {
      created = unwrap(result);
    }

    if (segmentId && created.id) {
      try {
        await resend.contacts.segments.add({
          contactId: created.id,
          segmentId,
        });
      } catch {
        // Contact may already be attached via create({ segments }).
      }
    }

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
