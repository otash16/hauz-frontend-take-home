/**
 * Two ways to reach Appwrite, and the difference is the whole security model.
 *
 * `adminAccount()` carries the project API key. It can do what no visitor is
 * allowed to do, such as mail a sign-in code to an address nobody has proved
 * they own yet. It has no idea who is asking.
 *
 * `sessionAccount()` / `sessionFunctions()` carry one person's session secret
 * instead. Appwrite resolves that to a user and, on a Function execution,
 * injects them as the `x-appwrite-user-id` header. That header is the only
 * identity the personal-account Function trusts, and a caller cannot forge it:
 * Appwrite rejects any execution whose own headers start with `x-appwrite`.
 *
 * Never put both on one client. An API key wins over a session, the execution
 * would then have no signed-in user, and the Function would answer 401.
 */

import { Account, Client, Functions } from 'node-appwrite'

import { env } from './env'

function client() {
  return new Client().setEndpoint(env.endpoint).setProject(env.projectId)
}

/** Acts as the project. Used only to start a sign-in. */
export function adminAccount() {
  return new Account(client().setKey(env.apiKey))
}

/** Acts as the signed-in person. */
export function sessionAccount(sessionSecret: string) {
  return new Account(client().setSession(sessionSecret))
}

/** Acts as the signed-in person, for executing the Function. */
export function sessionFunctions(sessionSecret: string) {
  return new Functions(client().setSession(sessionSecret))
}
