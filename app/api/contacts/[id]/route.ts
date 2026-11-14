import { jsonError, getResend, unwrap } from '../../../../lib/resend';
import { resolveId } from '../../../../lib/route-utils';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const id = await resolveId(context);
    const body = await request.json();
    const resend = getResend();
    const data = unwrap(
      await resend.contacts.update({
        id,
        firstName:
          body.firstName !== undefined ? String(body.firstName) : undefined,
        lastName:
          body.lastName !== undefined ? String(body.lastName) : undefined,
        unsubscribed:
          body.unsubscribed !== undefined
            ? Boolean(body.unsubscribed)
            : undefined,
      }),
    );

    return Response.json({ data });
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
    const data = unwrap(await resend.contacts.remove({ id }));
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
