/**
 * Every Appwrite credential is read here and nowhere else.
 *
 * Only modules under `src/server/` import this file, and those modules are only
 * ever reached through a server function, so nothing in here is reachable from
 * the browser bundle.
 *
 * A missing value throws on first use rather than turning into a puzzling 401
 * from Appwrite several layers later.
 */

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
  endpoint: required('APPWRITE_ENDPOINT'),
  projectId: required('APPWRITE_PROJECT_ID'),
  apiKey: required('APPWRITE_API_KEY'),
  functionId: process.env.APPWRITE_FUNCTION_ID || 'personal-account',
}
