import { getResend, jsonError, resendFetch, unwrap } from '../../../../lib/resend';
import { resolveId } from '../../../../lib/route-utils';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const id = await resolveId(context);
    const body = await request.json();
    const name = String(body.name || '').trim();

    if (!name) {
      return Response.json({ error: 'Audience name is required' }, { status: 400 });
    }

    await resendFetch(`/segments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });

    return Response.json({ data: { id, name } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const id = await resolveId(context);
    const resend = getResend();
    const data = unwrap(await resend.segments.remove(id));
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
