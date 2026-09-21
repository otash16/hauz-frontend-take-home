/**
 * On every page: either "Sign in", or the person's first name and "Log out".
 *
 * It takes what it shows as props. The root route loads both during SSR, so
 * this is already correct in the HTML the browser paints first, with no
 * flash of "Sign in" for someone who is signed in.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'

import type { CurrentUser } from '#/server/auth'
import { signOut } from '#/server/auth'
import type { PersonalAccount } from '#/server/personal-account'

interface HeaderProps {
  user: CurrentUser | null
  account: PersonalAccount | null
}

export function Header({ user, account }: HeaderProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const logOut = useMutation({
    mutationFn: () => signOut(),
    onSuccess: async () => {
      // The cookie is gone, so everything cached about this person is wrong.
      queryClient.clear()
      await router.invalidate()
      await router.navigate({ to: '/' })
    },
  })

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '1px solid currentColor',
        paddingBottom: '0.75rem',
        marginBottom: '1.5rem',
      }}
    >
      <Link to="/" style={{ fontWeight: 700 }}>
        HAUZ
      </Link>

      <span style={{ marginLeft: 'auto' }}>
        {user ? (
          <>
            {/* Someone can be signed in and not onboarded yet, on the one screen
                where that is true: onboarding itself. Their email stands in. */}
            <Link to="/profile">{account?.firstName ?? user.email}</Link>{' '}
            <button
              type="button"
              onClick={() => logOut.mutate()}
              disabled={logOut.isPending}
              style={{ marginTop: 0 }}
            >
              {logOut.isPending ? 'Logging out...' : 'Log out'}
            </button>
          </>
        ) : (
          <Link to="/signin">Sign in</Link>
        )}
      </span>
    </header>
  )
}
