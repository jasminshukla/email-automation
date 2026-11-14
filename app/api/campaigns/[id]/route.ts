import { getResend, jsonError, unwrap } from '../../../../lib/resend';
import { normalizeCampaign } from '../../../../lib/normalize';
import { resolveId } from '../../../../lib/route-utils';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const id = await resolveId(context);
    const resend = getResend();
    const campaign = normalizeCampaign(
      unwrap(await resend.broadcasts.get(id)),
    );
    return Response.json({ data: campaign });
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
    const data = unwrap(await resend.broadcasts.remove(id));
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
