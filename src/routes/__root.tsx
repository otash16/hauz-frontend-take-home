import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { Header } from '#/components/Header'
import { currentUserQuery, personalAccountQuery } from '#/lib/queries'
import appCss from '../styles.css?url'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  /**
   * Runs on the server during SSR, before anything renders. That is what makes
   * the header right on the first paint after a hard refresh: the HTML already
   * carries the answer, rather than the browser discovering it after hydration.
   *
   * What it returns is merged into the router context, so every route below can
   * read `context.user` and guard on it without fetching again.
   */
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentUserQuery())

    // Only ask about the account if there is someone to ask about. The header
    // needs the first name, which lives on the account, not on the Appwrite user.
    const account = user
      ? await context.queryClient.ensureQueryData(personalAccountQuery())
      : null

    return { user, account }
  },

  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'HAUZ' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),

  shellComponent: RootDocument,
  component: RootLayout,
})

function RootLayout() {
  const { user, account } = Route.useRouteContext()

  return (
    <>
      <Header user={user} account={account} />
      <Outlet />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
