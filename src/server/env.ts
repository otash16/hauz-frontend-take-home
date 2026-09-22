/**
 * Every Appwrite credential is read here and nowhere else.
 *
 * Only modules under `src/server/` import this file, and those are only ever
 * reached through a server function, so nothing here is in the browser bundle.
 *
 * The values are getters rather than constants so a missing one is reported the
 * moment something actually needs it. Read eagerly, a half-filled `.env` would
 * take down even the pages that never talk to Appwrite, and the message would
 * arrive far from whatever asked for it.
 */

// The dev server happens to load `.env` on its own, but that is its behaviour,
// not a guarantee the built server shares. Loading it here makes both the same.
import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and fill it in. See README.md.`,
    )
  }

  return value
}

export const env = {
  get endpoint() {
    return required('APPWRITE_ENDPOINT')
  },
  get projectId() {
    return required('APPWRITE_PROJECT_ID')
  },
  get apiKey() {
    return required('APPWRITE_API_KEY')
  },
  get functionId() {
    return process.env.APPWRITE_FUNCTION_ID || 'personal-account'
  },
}
