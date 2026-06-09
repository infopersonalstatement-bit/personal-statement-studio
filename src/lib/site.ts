/** URL pubblico del sito, usato per redirect OAuth e conferma email. */
export function getSiteUrl(requestUrl?: string): string {
  const configured = (import.meta.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');

  if (configured && !configured.includes('localhost')) {
    return configured;
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return configured || 'https://personalstatementstudio.com';
}

export function authCallbackUrl(requestUrl?: string): string {
  return `${getSiteUrl(requestUrl)}/auth/callback`;
}
