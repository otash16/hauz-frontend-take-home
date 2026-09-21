/**
 * The brief says to send people, after sign-in, to whatever page the `redirect`
 * query parameter names. Followed literally that is an open redirect:
 * `/signin?redirect=https://hauz.example.evil` would bounce someone who just
 * signed in onto a copy of our own site, which is how phishing links get their
 * credibility. See NOTES.md.
 *
 * So only same-origin paths are honoured. Anything else falls back to home.
 *
 * This runs on both sides, which is on purpose: the client uses it to navigate
 * and the server uses it to guard. It holds no secrets, only a rule.
 */

export function safeRedirect(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string' || target === '') {
    return fallback
  }

  // Must be a path on this site, so no "https://elsewhere" and no "javascript:".
  if (!target.startsWith('/')) {
    return fallback
  }

  // "//elsewhere.example" and "/\elsewhere.example" are protocol-relative URLs.
  // They start with a slash but still leave the site.
  if (target.startsWith('//') || target.startsWith('/\\')) {
    return fallback
  }

  return target
}
