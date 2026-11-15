import { getResend, jsonError, resendFetch, unwrap } from '../../../../lib/resend';
import { normalizeCampaign } from '../../../../lib/normalize';
import { resolveId } from '../../../../lib/route-utils';
import type { Campaign, CampaignStats } from '../../../../lib/types';

type MetricsPayload = {
  totals?: Record<string, unknown>;
};

type ContactPage = {
  has_more?: boolean;
  data?: Array<{ id?: string }>;
};

function countOf(totals: Record<string, unknown>, key: string) {
  const value = Number(totals[key]);
  return Number.isFinite(value) ? value : 0;
}

async function audienceSize(segmentId: string) {
  let total = 0;
  let after = '';
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ limit: '100' });
    if (after) query.set('after', after);
    const payload = (await resendFetch(
      `/segments/${segmentId}/contacts?${query}`,
    )) as ContactPage;
    const rows = Array.isArray(payload.data) ? payload.data : [];
    total += rows.length;
    const cursor = rows.length ? String(rows[rows.length - 1]?.id || '') : '';
    if (!payload.has_more || !cursor || cursor === after) break;
    after = cursor;
  }
  return total;
}

async function campaignStats(campaign: Campaign): Promise<CampaignStats> {
  const end = new Date().toISOString();
  const query = new URLSearchParams({
    broadcast_id: campaign.id,
    metrics: 'sent,delivered,bounced',
    start_date: '2020-01-01T00:00:00.000Z',
    end_date: end,
  });
  let delivered = 0;
  let bounced = 0;
  let sent = 0;
  try {
    const payload = (await resendFetch(`/emails/metrics?${query}`)) as MetricsPayload;
    const totals = payload.totals || {};
    delivered = countOf(totals, 'delivered');
    bounced = countOf(totals, 'bounced');
    sent = countOf(totals, 'sent');
  } catch {
    // Delivery counts stay at zero when metrics are unavailable.
  }

  const segmentId = campaign.segmentId || campaign.audienceId || '';
  let audience = 0;
  if (segmentId) {
    try {
      audience = await audienceSize(segmentId);
    } catch {
      audience = 0;
    }
  }

  const reached = Math.max(sent, delivered + bounced);
  const notSent =
    audience > 0
      ? Math.max(0, audience - reached)
      : campaign.status === 'draft' ||
          campaign.status === 'scheduled' ||
          campaign.status === 'queued'
        ? 0
        : Math.max(0, sent - delivered - bounced);

  return { delivered, bounced, notSent };
}

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
    const stats = await campaignStats(campaign);
    return Response.json({ data: campaign, stats });
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
