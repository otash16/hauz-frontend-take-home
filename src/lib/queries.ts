/**
 * The two server reads the app does, described once.
 *
 * Both are loaded on the server during SSR and handed to the browser with the
 * page, so the first paint after a hard refresh already knows who is signed in.
 * The browser reuses that answer instead of asking again.
 */

import { queryOptions } from '@tanstack/react-query'

import { getCurrentUser } from '#/server/auth'
import { fetchPersonalAccount } from '#/server/personal-account'

export const currentUserQuery = () =>
  queryOptions({
    queryKey: ['current-user'],
    queryFn: () => getCurrentUser(),
  })

export const personalAccountQuery = () =>
  queryOptions({
    queryKey: ['personal-account'],
    queryFn: () => fetchPersonalAccount(),
  })
