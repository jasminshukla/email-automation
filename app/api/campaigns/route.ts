import { getDefaultFrom, getResend, jsonError, unwrap } from '../../../lib/resend';
import { listFrom, normalizeCampaign, normalizeTemplate } from '../../../lib/normalize';
import { ensureHtmlHasUnsubscribe } from '../../../lib/route-utils';

export async function GET() {
  try {
    const resend = getResend();
    const campaigns = listFrom(
      unwrap(await resend.broadcasts.list({ limit: 100 })),
    ).map(normalizeCampaign);

    return Response.json({ data: campaigns });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const segmentId = String(body.segmentId || '').trim();
    const templateId = String(body.templateId || '').trim();
    const mode = String(body.mode || 'draft') as 'draft' | 'now' | 'schedule';
    const scheduledAt = body.scheduledAt ? String(body.scheduledAt) : '';

    if (!segmentId) {
      return Response.json({ error: 'Select an audience' }, { status: 400 });
    }

    if (!templateId) {
      return Response.json({ error: 'Select a Resend template' }, { status: 400 });
    }

    if (mode === 'schedule' && !scheduledAt) {
      return Response.json(
        { error: 'Pick a date and time to schedule this campaign' },
        { status: 400 },
      );
    }

    const resend = getResend();
    const template = normalizeTemplate(
      unwrap(await resend.templates.get(templateId)),
    );

    if (template.status && template.status !== 'published') {
      return Response.json(
        { error: 'Only published Resend templates can be used in a campaign' },
        { status: 400 },
      );
    }

    const from =
      String(body.from || '').trim() ||
      template.from ||
      getDefaultFrom();
    const subject =
      String(body.subject || '').trim() || template.subject || name || 'Campaign';

    if (!from) {
      return Response.json(
        {
          error:
            'A from address is required. Set RESEND_FROM_EMAIL or enter one in the form.',
        },
        { status: 400 },
      );
    }

    if (!template.html) {
      return Response.json(
        { error: 'This template has no HTML yet. Publish it in Resend first.' },
        { status: 400 },
      );
    }

    const html = ensureHtmlHasUnsubscribe(template.html);
    const base = {
      name: name || template.name,
      segmentId,
      from,
      subject,
      html,
    };
    const created =
      mode === 'schedule'
        ? await resend.broadcasts.create({
            ...base,
            send: true,
            scheduledAt,
          })
        : mode === 'now'
          ? await resend.broadcasts.create({
              ...base,
              send: true,
            })
          : await resend.broadcasts.create(base);

    const data = unwrap(created);

    return Response.json(
      {
        data,
        template: {
          id: template.id,
          name: template.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
