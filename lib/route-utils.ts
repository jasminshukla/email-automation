export async function resolveId(
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const params = await Promise.resolve(context.params);
  return params.id;
}

export function ensureHtmlHasUnsubscribe(html: string) {
  if (html.includes('RESEND_UNSUBSCRIBE_URL')) return html;

  return `${html}
<p style="margin-top:32px;font-size:12px;color:#6b6458;">
  <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#6b6458;">Unsubscribe</a>
</p>`;
}
