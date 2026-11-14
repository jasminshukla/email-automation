import { getResend, jsonError, unwrap } from '../../../../../lib/resend';
import { resolveId } from '../../../../../lib/route-utils';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const id = await resolveId(context);
    const resend = getResend();
    const data = unwrap(
      await resend.post<{ id: string; object: 'broadcast' }>(
        `/broadcasts/${id}/cancel`,
      ),
    );
    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
