/**
 * The profile: view and edit first name, last name, contact email and bio.
 *
 * A signed-out visitor who opens this signs in and lands back here, which is
 * what the `redirect` parameter on /signin is for.
 */

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { personalAccountQuery } from '#/lib/queries'
import { updatePersonalAccount } from '#/server/personal-account'
import type { PersonalAccount, ProfileEdit } from '#/server/personal-account'

const ROLE_LABELS: Record<PersonalAccount['role'], string> = {
  property_owner: 'Property owner',
  realtor: 'Realtor',
}

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      // location.href is this page including its query string, so they come
      // back to exactly where they were.
      throw redirect({ to: '/signin', search: { redirect: location.href } })
    }

    if (!context.account) {
      throw redirect({ to: '/onboarding', search: { redirect: '/profile' } })
    }
  },

  loader: ({ context }) =>
    context.queryClient.ensureQueryData(personalAccountQuery()),

  component: Profile,
})

/**
 * What changed, and only what changed.
 *
 * An omitted field keeps its stored value, so an untouched box sends nothing.
 * An emptied box means "I no longer have one", which the Function spells as
 * null. Sending "" instead would store an empty string and the field would
 * still be set, which is not what clearing means.
 */
function buildEdit(
  account: PersonalAccount,
  form: { firstName: string; lastName: string; contactEmail: string; bio: string },
): ProfileEdit {
  const edit: ProfileEdit = {}

  const firstName = form.firstName.trim()
  if (firstName !== account.firstName) {
    edit.firstName = firstName
  }

  const lastName = form.lastName.trim()
  if (lastName !== account.lastName) {
    edit.lastName = lastName
  }

  const contactEmail = form.contactEmail.trim() || null
  if (contactEmail !== account.contactEmail) {
    edit.contactEmail = contactEmail
  }

  const bio = form.bio.trim() || null
  if (bio !== account.bio) {
    edit.bio = bio
  }

  return edit
}

function Profile() {
  const { data } = useSuspenseQuery(personalAccountQuery())
  const account = data as PersonalAccount

  const router = useRouter()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    firstName: account.firstName,
    lastName: account.lastName,
    contactEmail: account.contactEmail ?? '',
    bio: account.bio ?? '',
  })
  const [note, setNote] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      // The browser's `required` lets a single space through, and the Function
      // answers that with "send null to clear this field" — advice that makes
      // no sense for a name, which cannot be cleared at all. Say what is wrong.
      if (!form.firstName.trim() || !form.lastName.trim()) {
        return Promise.resolve({
          ok: false as const,
          message: 'First name and last name cannot be empty.',
        })
      }

      const edit = buildEdit(account, form)

      // The Function rejects an empty edit, and rightly so. Answer it here
      // rather than sending a request that cannot succeed.
      if (Object.keys(edit).length === 0) {
        return Promise.resolve({ ok: false as const, message: 'Nothing to save.' })
      }

      return updatePersonalAccount({ data: edit })
    },
    onSuccess: async (result) => {
      if (!result.ok) {
        setNote(result.message)
        return
      }

      setNote('Saved.')
      // The header shows the first name, so the whole page has to catch up.
      await queryClient.invalidateQueries({ queryKey: ['personal-account'] })
      await router.invalidate()
    },
  })

  const update = (field: keyof typeof form) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setNote(null)
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <main>
      <h1>Your profile</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate()
        }}
      >
        <label>
          First name
          <input value={form.firstName} required maxLength={100} onChange={update('firstName')} />
        </label>

        <label>
          Last name
          <input value={form.lastName} required maxLength={100} onChange={update('lastName')} />
        </label>

        <label>
          Contact email <small>(optional)</small>
          <input type="email" value={form.contactEmail} maxLength={254} onChange={update('contactEmail')} />
        </label>

        <label>
          Bio <small>(optional)</small>
          <textarea rows={4} value={form.bio} maxLength={2000} onChange={update('bio')} />
        </label>

        <p>
          Role: {ROLE_LABELS[account.role]}{' '}
          <small>(set at sign-up and cannot be changed)</small>
        </p>

        <button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </form>

      {note ? <p role="status">{note}</p> : null}
    </main>
  )
}
