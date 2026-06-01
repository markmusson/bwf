// Pure URL builders for the standard web share intents. Used by the
// thanks-page share row so the donor can post their seat to X,
// LinkedIn, WhatsApp, Facebook or email in one click. Tested in
// shareIntents.test.ts.

export interface UrlAndText {
  url: string;
  text: string;
}

export interface UrlOnly {
  url: string;
}

export interface EmailShare {
  url: string;
  subject: string;
  text: string;
}

export function buildTwitterShareUrl({ url, text }: UrlAndText): string {
  const params = new URLSearchParams({ url, text });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildLinkedInShareUrl({ url }: UrlOnly): string {
  const params = new URLSearchParams({ url });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

export function buildFacebookShareUrl({ url }: UrlOnly): string {
  const params = new URLSearchParams({ u: url });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function buildWhatsAppShareUrl({ url, text }: UrlAndText): string {
  // WhatsApp's wa.me endpoint takes the whole message as `text` so we
  // bundle text + url with a single space.
  const params = new URLSearchParams({ text: `${text} ${url}` });
  return `https://wa.me/?${params.toString()}`;
}

export function buildEmailShareUrl({
  url,
  subject,
  text,
}: EmailShare): string {
  const params = new URLSearchParams({ subject, body: `${text}\n\n${url}` });
  return `mailto:?${params.toString()}`;
}
