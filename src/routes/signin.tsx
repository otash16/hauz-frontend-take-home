/**
 * Sign in with an email code, in two screens: address, then code.
 *
 * New and returning people see exactly this. Appwrite signs up an address it
 * has never seen and recognises one it has, and either way the answer is a user
 * id plus a code in the inbox.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { personalAccountQuery } from '#/lib/queries'
import { safeRedirect } from '#/lib/safe-redirect'
import { sendEmailCode, verifyEmailCode } from '#/server/auth'

export const Route = createFileRoute('/signin')({
  // Typed as optional on purpose, so `<Link to="/signin">` elsewhere does not
  // have to pass a redirect it does not have.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},

  // Already signed in? There is nothing to do here.
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ href: safeRedirect(search.redirect) })
    }
  },

  component: SignIn,
})

function SignIn() {
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  // Set once the code is on its way. Its presence is what switches the screen.
  const [userId, setUserId] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const requestCode = useMutation({
    mutationFn: () => sendEmailCode({ data: { email } }),
    onSuccess: (result) => {
      setProblem(null)

      if (!result.ok) {
        setProblem(result.message)
        return
      }

      setUserId(result.userId)
    },
  })

  const submitCode = useMutation({
    mutationFn: () => verifyEmailCode({ data: { userId: userId!, code } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setProblem(result.message)
        return
      }

      // There is a session cookie now, so everything the server said about
      // "nobody is signed in" is stale. Throw it out and load it again.
      queryClient.clear()
      await router.invalidate()

      const target = safeRedirect(search.redirect)
      const account = await queryClient.fetchQuery(personalAccountQuery())

      // No account yet means this person is new. Onboarding first, then on to
      // wherever they were heading.
      if (account) {
        await router.navigate({ href: target })
      } else {
        await router.navigate({ to: '/onboarding', search: { redirect: target } })
      }
    },
  })

  if (userId === null) {
    return (
      <main>
        <h1>Sign in</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            requestCode.mutate()
          }}
        >
          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="email"
              required
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <button type="submit" disabled={requestCode.isPending}>
            {requestCode.isPending ? 'Sending...' : 'Send code'}
          </button>
        </form>

        {problem ? <p role="alert">{problem}</p> : null}
      </main>
    )
  }

  return (
    <main>
      <h1>Enter your code</h1>
      <p>We sent a code to {email}. It is good for 15 minutes.</p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitCode.mutate()
        }}
      >
        <label>
          Code
          <input
            value={code}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            onChange={(event) => setCode(event.target.value)}
          />
        </label>

        <button type="submit" disabled={submitCode.isPending}>
          {submitCode.isPending ? 'Checking...' : 'Continue'}
        </button>
      </form>

      {problem ? <p role="alert">{problem}</p> : null}

      <p>
        <button
          type="button"
          onClick={() => {
            setUserId(null)
            setCode('')
            setProblem(null)
          }}
        >
          Use a different email
        </button>
      </p>
    </main>
  )
}
