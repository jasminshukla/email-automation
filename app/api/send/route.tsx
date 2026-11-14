import { EmailTemplate } from '../../../components/email-template';
import { getDefaultFrom, getResend, jsonError, unwrap } from '../../../lib/resend';
import * as React from 'react';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const to = String(body.to || '').trim();
    const templateId = String(body.templateId || '').trim();
    const from = String(body.from || '').trim() || getDefaultFrom();
    const subject = String(body.subject || '').trim();
    const scheduledAt = body.scheduledAt ? String(body.scheduledAt) : undefined;

    if (!to) {
      return Response.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    if (!from) {
      return Response.json(
        { error: 'A from address is required to send a test' },
        { status: 400 },
      );
    }

    const resend = getResend();

    if (templateId) {
      const data = unwrap(
        await resend.emails.send({
          from,
          to: [to],
          template: { id: templateId },
          subject: subject || undefined,
          scheduledAt,
        }),
      );

      return Response.json({ data });
    }

    const data = unwrap(
      await resend.emails.send({
        from,
        to: [to],
        subject: subject || 'Hello from Email Automation',
        react: <EmailTemplate firstName={body.firstName || 'there'} />,
        scheduledAt,
      }),
    );

    return Response.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
