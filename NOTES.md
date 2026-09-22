# Notes

## How it is put together

Everything that touches Appwrite runs on the server, under `src/server/`. The
browser reaches it through server functions, whose bodies are compiled out of
the client bundle, so neither the API key nor the session secret ships to it.

Three files carry the model. `appwrite.ts` holds two clients: one with the API
key, which can start a sign-in for an address nobody has proved they own yet,
and one with a person's session, which is what Appwrite turns into
`x-appwrite-user-id` on a Function execution. They are never combined — a key
on the client wins over a session, and the Function would then see no caller.
`session-cookie.ts` keeps the session secret in an httpOnly cookie, out of
reach of `document.cookie`. `personal-account.ts` is the only door to profile
data; the app never touches the `personal_accounts` table.

The header is loaded in the root route's `beforeLoad`, which runs on the server
during SSR, so it is right in the first HTML rather than correcting itself
after hydration.

## Where I did not follow the brief

**The profile form does not send the user's id.** A body field is whatever the
browser put in it, so that would let anyone edit anyone's profile by naming a
different id. The Function does not read it anyway: identity comes from
`x-appwrite-user-id`, which Appwrite injects and refuses to accept from a
caller.

**The `redirect` parameter is filtered to same-origin paths.** Honouring it as
written is an open redirect: `/signin?redirect=https://hauz.example.evil` hands
a freshly signed-in person to a copy of our own site, which is what gives a
phishing link its credibility.

**A failed user load does not always delete the cookie.** Showing sign-in is
right; deleting the cookie is not. A timeout or a 500 says nothing about
whether the session is valid, and discarding it turns a blip into a permanent
sign-out. Only a 401 clears it.

**The starter shared one QueryClient across every SSR request.** It was built at
module scope but `getRouter()` runs per request, so one visitor's cached
account could be served to the next.

I changed nothing in the Function. It already does the right thing, including
the part the brief got wrong.

## Worth naming

Double-clicking Continue is safe because the request is safe to repeat: the
Function answers `200` with the existing account, and the unique index on
`appwrite_user_id` settles a true tie. The disabled button is a nicety.

Clearing contact email or bio sends `null`, not `""` — "I no longer have one"
and "it is blank" are different, and only `null` reads back as absent.

On onboarding a person is signed in with no account yet, so the header has no
first name to show. It falls back to their email.

## Before production

Rate-limit code requests per address rather than relying on Appwrite Cloud's
limit. Bind the sign-in to the browser that started it: the user id round-trips
through the client between the two screens. Add CSRF protection — `SameSite=Lax`
is the only thing stopping a cross-site submit today. And tests for the redirect
filter, the null-versus-omitted edit, and the concurrent create.
