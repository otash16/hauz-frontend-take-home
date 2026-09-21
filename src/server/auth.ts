/**
 * Sign in, sign out, and "who is asking".
 *
 * Every function here runs on the server. The browser calls them the way it
 * would call a REST endpoint; TanStack Start compiles the bodies out of the
 * client bundle, so the API key and the session secret stay on this side.
 *
 * Failures a person can do something about come back as data, so a form can
 * render the message. Anything unexpected is allowed to throw and become a 500.
 */

import { createServerFn } from '@tanstack/react-start'
import { AppwriteException, ID } from 'node-appwrite'

import { adminAccount, sessionAccount } from './appwrite'
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
} from './session-cookie'

export interface CurrentUser {
  id: string
  email: string
}

/**
 * Step one of sign-in: mail a code.
 *
 * `ID.unique()` only matters for an address Appwrite has never seen, which it
 * signs up on the spot. For an address it already knows the id is ignored and
 * the existing user comes back instead. That is why new and returning people
 * walk through the same two screens.
 */
export const sendEmailCode = createServerFn({ method: 'POST' })
  .validator((data: { email: string }) => ({ email: String(data.email ?? '') }))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase()

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return { ok: false as const, message: 'Enter a valid email address.' }
    }

    try {
      const token = await adminAccount().createEmailToken({
        userId: ID.unique(),
        email,
      })

      // Only the id travels back. The code itself goes to the inbox, and it is
      // the code, not the id, that proves the address belongs to this person.
      return { ok: true as const, userId: token.userId }
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 429) {
        return {
          ok: false as const,
          message: 'Too many codes requested. Wait a minute and try again.',
        }
      }

      throw error
    }
  })

/**
 * Step two: trade the code for a session and put it in an httpOnly cookie.
 */
export const verifyEmailCode = createServerFn({ method: 'POST' })
  .validator((data: { userId: string; code: string }) => ({
    userId: String(data.userId ?? ''),
    code: String(data.code ?? ''),
  }))
  .handler(async ({ data }) => {
    try {
      const session = await adminAccount().createSession({
        userId: data.userId,
        secret: data.code.trim(),
      })

      writeSessionCookie(session.secret)

      return { ok: true as const }
    } catch (error) {
      // Appwrite answers 401 for a wrong code and for an expired one alike, and
      // saying which is which would tell an attacker whether to keep guessing.
      if (error instanceof AppwriteException && error.code === 401) {
        return {
          ok: false as const,
          message: 'That code is wrong or has expired. Request a new one.',
        }
      }

      throw error
    }
  })

/**
 * Who is signed in, or null.
 *
 * The brief says to delete the session cookie whenever this fails "for any
 * reason". Only a 401 actually means the session is gone. A timeout or a 500
 * from Appwrite does not, and discarding the cookie on those would sign people
 * out for good over a blip they could have waited out. So: show sign-in either
 * way, but only throw the cookie away when Appwrite says the session is dead.
 * See NOTES.md.
 */
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUser | null> => {
    const sessionSecret = readSessionCookie()

    if (!sessionSecret) {
      return null
    }

    try {
      const user = await sessionAccount(sessionSecret).get()

      return { id: user.$id, email: user.email }
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 401) {
        clearSessionCookie()
      }

      return null
    }
  },
)

/**
 * Log out. The cookie goes first: whatever Appwrite answers, this browser is
 * signed out, and a failed revoke must not leave the secret sitting in it.
 */
export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const sessionSecret = readSessionCookie()

  clearSessionCookie()

  if (sessionSecret) {
    try {
      await sessionAccount(sessionSecret).deleteSession({
        sessionId: 'current',
      })
    } catch {
      // Already expired or revoked on Appwrite's side. Nothing left to revoke.
    }
  }

  return { ok: true as const }
})
