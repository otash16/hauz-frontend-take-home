/**
 * Onboarding: the one thing someone has to do before they have a profile.
 *
 * Name and role. Role is chosen here and never again, so the form says so.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { safeRedirect } from '#/lib/safe-redirect'
import { createPersonalAccount } from '#/server/personal-account'
import type { PersonalRole } from '#/server/personal-account'

export const Route = createFileRoute('/onboarding')({
  // Typed as optional on purpose, so `<Link to="/signin">` elsewhere does not
  // have to pass a redirect it does not have.
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},

  beforeLoad: ({ context, search, location }) => {
    if (!context.user) {
      throw redirect({ to: '/signin', search: { redirect: location.href } })
    }

    // Someone who already has an account skips this screen, whether they got
    // here from sign-in or by typing the URL.
    if (context.account) {
      throw redirect({ href: safeRedirect(search.redirect) })
    }
  },

  component: Onboarding,
})

function Onboarding() {
  const search = Route.useSearch()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<PersonalRole>('property_owner')
  const [problem, setProblem] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      createPersonalAccount({ data: { firstName, lastName, role } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        setProblem(result.message)
        return
      }

      queryClient.clear()
      await router.invalidate()
      await router.navigate({ href: safeRedirect(search.redirect) })
    },
  })

  return (
    <main>
      <h1>Tell us who you are</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate()
        }}
      >
        <label>
          First name
          <input
            value={firstName}
            required
            maxLength={100}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>

        <label>
          Last name
          <input
            value={lastName}
            required
            maxLength={100}
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>

        <label>
          I am a
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as PersonalRole)}
          >
            <option value="property_owner">Property owner</option>
            <option value="realtor">Realtor</option>
          </select>
        </label>

        <p>
          <small>This cannot be changed later.</small>
        </p>

        {/* Disabled while in flight, so a double click sends one request. The
            request being safe to repeat is what actually guarantees one account;
            this only spares the second round trip. */}
        <button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Saving...' : 'Continue'}
        </button>
      </form>

      {problem ? <p role="alert">{problem}</p> : null}
    </main>
  )
}
