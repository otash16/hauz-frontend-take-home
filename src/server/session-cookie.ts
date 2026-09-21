/**
 * The Appwrite session secret lives in an httpOnly cookie and nowhere else.
 *
 * httpOnly is the point: `document.cookie` cannot see it, so browser
 * JavaScript never holds the secret and neither does anything injected into
 * the page. Only this server reads it, and only to talk to Appwrite.
 *
 * SameSite=Lax keeps the cookie off cross-site requests while still surviving
 * the ordinary case of someone following a link back into the app from their
 * email client.
 */

import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'

const COOKIE_NAME = 'hauz_session'
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

/** The same flags on write and on delete, or the browser keeps the old cookie. */
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
} as const

export function readSessionCookie(): string | undefined {
  return getCookie(COOKIE_NAME)
}

export function writeSessionCookie(sessionSecret: string): void {
  setCookie(COOKIE_NAME, sessionSecret, {
    ...COOKIE_OPTIONS,
    maxAge: THIRTY_DAYS_IN_SECONDS,
  })
}

export function clearSessionCookie(): void {
  deleteCookie(COOKIE_NAME, COOKIE_OPTIONS)
}
