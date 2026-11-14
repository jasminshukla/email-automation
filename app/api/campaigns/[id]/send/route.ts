import { getResend, jsonError, unwrap } from '../../../../../lib/resend';
import { resolveId } from '../../../../../lib/route-utils';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const id = await resolveId(context);
    const body = await request.json().catch(() => ({}));
    const scheduledAt = body.scheduledAt ? String(body.scheduledAt) : undefined;
    const resend = getResend();
    const data = unwrap(
      await resend.broadcasts.send(id, scheduledAt ? { scheduledAt } : undefined),
    );

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
