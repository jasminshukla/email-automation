import { getResend, jsonError, unwrap } from '../../../../../lib/resend';
import { listFrom, normalizeContact } from '../../../../../lib/normalize';
import { resolveId } from '../../../../../lib/route-utils';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const segmentId = await resolveId(context);
    const resend = getResend();
    const contacts = listFrom(
      unwrap(await resend.contacts.list({ segmentId })),
    ).map(normalizeContact);

    return Response.json({ data: contacts });
  } catch (error) {
    return jsonError(error);
  }
}
