import { getResend, jsonError, unwrap } from '../../../../../lib/resend';
import { resolveId } from '../../../../../lib/route-utils';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const contactId = await resolveId(context);
    const body = await request.json();
    const segmentId = String(body.segmentId || '').trim();

    if (!segmentId) {
      return Response.json({ error: 'Audience is required' }, { status: 400 });
    }

    const resend = getResend();
    const data = unwrap(
      await resend.contacts.segments.add({
        contactId,
        segmentId,
      }),
    );

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const contactId = await resolveId(context);
    const segmentId = new URL(request.url).searchParams.get('segmentId') || '';

    if (!segmentId) {
      return Response.json({ error: 'Audience is required' }, { status: 400 });
    }

    const resend = getResend();
    const data = unwrap(
      await resend.contacts.segments.remove({
        contactId,
        segmentId,
      }),
    );

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
