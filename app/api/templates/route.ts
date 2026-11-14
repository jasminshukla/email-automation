import { getDefaultFrom, getResend, jsonError, unwrap } from '../../../lib/resend';
import { listFrom, normalizeTemplate } from '../../../lib/normalize';
import { ensureHtmlHasUnsubscribe } from '../../../lib/route-utils';

export async function GET() {
  try {
    const resend = getResend();
    const templates = listFrom(
      unwrap(await resend.templates.list({ limit: 100 })),
    ).map(normalizeTemplate);

    return Response.json({ data: templates });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const subject = String(body.subject || '').trim();
    const from = String(body.from || '').trim() || getDefaultFrom();
    const html = String(body.html || '').trim();
    const publish = body.publish !== false;

    if (!name) {
      return Response.json({ error: 'Template name is required' }, { status: 400 });
    }

    if (!html) {
      return Response.json({ error: 'Template content is required' }, { status: 400 });
    }

    const resend = getResend();
    const created = unwrap(
      await resend.templates.create({
        name,
        html: ensureHtmlHasUnsubscribe(html),
        subject: subject || undefined,
        from: from || undefined,
      }),
    );

    if (publish) {
      unwrap(await resend.templates.publish(created.id));
    }

    const template = normalizeTemplate(
      unwrap(await resend.templates.get(created.id)),
    );

    return Response.json({ data: template }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
