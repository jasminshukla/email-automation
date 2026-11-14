import { getResend, jsonError, unwrap } from '../../../../lib/resend';
import { normalizeTemplate } from '../../../../lib/normalize';
import { resolveId } from '../../../../lib/route-utils';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const id = await resolveId(context);
    const resend = getResend();
    const template = normalizeTemplate(
      unwrap(await resend.templates.get(id)),
    );

    return Response.json({ data: template });
  } catch (error) {
    return jsonError(error);
  }
}
