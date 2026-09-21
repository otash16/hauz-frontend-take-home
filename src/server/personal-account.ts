/**
 * The only door to profile data.
 *
 * The web app never touches the `personal_accounts` table. Every read and write
 * is an execution of the `personal-account` Function, run with the caller's own
 * session so Appwrite injects them as `x-appwrite-user-id`.
 *
 * Note what is never sent: the user's id. The brief asks the profile form to
 * send it along with the changes so the Function knows whose profile to update.
 * It must not. A body field is whatever the browser chose to put in it, so a
 * request naming someone else's id would edit someone else's profile. The
 * Function already reads identity from the header Appwrite fills in, which the
 * caller cannot forge. See NOTES.md.
 */

import { createServerFn } from '@tanstack/react-start'
import { ExecutionMethod } from 'node-appwrite'

import { sessionFunctions } from './appwrite'
import { env } from './env'
import { readSessionCookie } from './session-cookie'

export type PersonalRole = 'property_owner' | 'realtor'

export interface PersonalAccount {
  personalAccountId: string
  firstName: string
  lastName: string
  role: PersonalRole
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

/** The error shape every route of the Function answers with. */
interface FunctionError {
  error: string
  message: string
  issues?: Array<{ field: string; message: string }>
}

interface FunctionResponse {
  status: number
  body: unknown
}

/** One place that speaks to the Function, so the three routes below stay short. */
async function callFunction(
  method: ExecutionMethod,
  body?: unknown,
): Promise<FunctionResponse> {
  const sessionSecret = readSessionCookie()

  // No cookie means no session to execute with. The Function would answer 401
  // anyway; this just saves the round trip.
  if (!sessionSecret) {
    return { status: 401, body: null }
  }

  const execution = await sessionFunctions(sessionSecret).createExecution({
    functionId: env.functionId,
    xpath: '/personal-account',
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    async: false,
  })

  // "completed" means the Function ran and answered, whatever status it chose.
  // Anything else is the Function crashing or timing out, which is our bug.
  if (execution.status !== 'completed') {
    throw new Error(
      `personal-account did not complete (${execution.status}): ${execution.errors}`,
    )
  }

  return {
    status: execution.responseStatusCode,
    body: execution.responseBody ? JSON.parse(execution.responseBody) : null,
  }
}

/** Turns a status nobody planned for into an error with the detail attached. */
function unexpected({ status, body }: FunctionResponse): Error {
  const detail = (body as FunctionError | null)?.message ?? ''

  return new Error(`personal-account answered ${status}. ${detail}`)
}

/** Field-level complaints from the Function, flattened into one line. */
function readableIssues(body: unknown): string {
  const error = body as FunctionError | null

  if (error?.issues?.length) {
    return error.issues
      .map((issue) => (issue.field ? `${issue.field}: ${issue.message}` : issue.message))
      .join(' ')
  }

  return error?.message ?? 'The form could not be saved.'
}

/**
 * The caller's account, or null.
 *
 * 404 is the ordinary answer for someone who has not onboarded yet, and 401 for
 * someone whose session went away. Neither is an error here; both mean there is
 * no account to show.
 */
export const fetchPersonalAccount = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PersonalAccount | null> => {
    const response = await callFunction(ExecutionMethod.GET)

    if (response.status === 200) {
      return response.body as PersonalAccount
    }

    if (response.status === 404 || response.status === 401) {
      return null
    }

    throw unexpected(response)
  },
)

/**
 * Onboarding.
 *
 * Double-clicking Continue fires two of these. The second one finds the account
 * already there and gets a 200 instead of a 201, and both callers end up on the
 * same account. The Function's unique index on `appwrite_user_id` is what makes
 * that true even when the two requests arrive at the same instant, so the
 * button being disabled on the client is a nicety, not the guarantee.
 */
export const createPersonalAccount = createServerFn({ method: 'POST' })
  .validator((data: { firstName: string; lastName: string; role: PersonalRole }) => data)
  .handler(async ({ data }) => {
    const response = await callFunction(ExecutionMethod.POST, {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      role: data.role,
    })

    if (response.status === 201 || response.status === 200) {
      return { ok: true as const, account: response.body as PersonalAccount }
    }

    // 409: an account already exists with the other role. Roles do not change
    // after creation, so there is nothing for this form to do about it.
    if (response.status === 409) {
      return {
        ok: false as const,
        message:
          'You already have an account with a different role. A role cannot be changed after sign-up.',
      }
    }

    if (response.status === 400) {
      return { ok: false as const, message: readableIssues(response.body) }
    }

    throw unexpected(response)
  })

/**
 * A partial edit. An omitted field keeps its stored value, `null` clears it.
 *
 * Role is absent on purpose. An account is created with one and keeps it, and
 * the Function's schema does not accept it here either.
 */
export interface ProfileEdit {
  firstName?: string
  lastName?: string
  contactEmail?: string | null
  bio?: string | null
}

export const updatePersonalAccount = createServerFn({ method: 'POST' })
  .validator((data: ProfileEdit) => data)
  .handler(async ({ data }) => {
    const response = await callFunction(ExecutionMethod.PATCH, data)

    if (response.status === 200) {
      return { ok: true as const, account: response.body as PersonalAccount }
    }

    if (response.status === 400) {
      return { ok: false as const, message: readableIssues(response.body) }
    }

    throw unexpected(response)
  })
