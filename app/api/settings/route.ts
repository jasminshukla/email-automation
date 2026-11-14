import { getDefaultFrom } from '../../../lib/resend';

export async function GET() {
  return Response.json({
    data: {
      hasApiKey: Boolean(process.env.RESEND_API_KEY),
      fromEmail: getDefaultFrom(),
    },
  });
}
