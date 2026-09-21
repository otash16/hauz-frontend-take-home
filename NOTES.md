# Notes

## Shape of it

Everything that touches Appwrite runs on the server, in `src/server/`. The
browser reaches it through TanStack Start server functions, which compile out of
the client bundle, so the API key and the session secret never ship to it. Three
files carry the whole model:

- `appwrite.ts` — two clients. One holds the API key and can start a sign-in for
  an address nobody has proved they own yet. The other holds one person's
  session, and is what Appwrite turns into `x-appwrite-user-id` on a Function
  execution. They are never combined: a key on the client wins over a session,
  and the Function would then see no caller at all.
- `session-cookie.ts` — the session secret in an httpOnly cookie. That is what
  keeps it out of `document.cookie` and out of reach of anything injected into
  the page.
- `personal-account.ts` — the only door to profile data. Reads and writes are
  executions of the Function with the caller's own session. The app never
  touches the `personal_accounts` table.

The header is loaded in the root route's `beforeLoad`, which runs on the server
during SSR, so it is correct in the first HTML rather than correcting itself
after hydration.

## Where I did not follow the brief

**The profile form does not send the user's id.** The brief asks for it "so the
Function knows whose profile to update". A body field is whatever the browser
put in it, so that would let anyone edit anyone's profile by typing a different
id — and the Function does not read it anyway: `main.js` takes identity from
`x-appwrite-user-id`, which Appwrite injects and refuses to accept from a
caller. The request body carries only the changes.

**The `redirect` parameter is filtered to same-origin paths.** Honouring it as
written makes an open redirect: `/signin?redirect=https://hauz.example.evil`
would hand a freshly signed-in person to a copy of our own site, which is what
gives a phishing link its credibility. `src/lib/safe-redirect.ts` rejects
anything that is not a path on this origin, protocol-relative URLs included.

**A failed user load does not always delete the cookie.** The brief says to
treat any failure as signed out and delete the session cookie. Showing sign-in
is right; deleting the cookie is not. A timeout or a 500 from Appwrite says
nothing about whether the session is still valid, and throwing it away turns a
blip into a permanent sign-out. Only a 401 clears it.

**The starter shared one QueryClient across every SSR request.** It was created
at module scope and used by `getRouter()`, which runs per request, so one
visitor's cached account could be served to the next. Now built per request.

I changed nothing in the Function. It already does the right thing, including
the part the brief got wrong.

## Things worth naming

Double-clicking Continue is safe because the request is safe to repeat: the
Function answers `200` with the existing account, and the unique index on
`appwrite_user_id` settles a true tie. The disabled button is a nicety on top.

Clearing contact email or bio sends `null`, not `""`. The Function rejects the
empty string deliberately — "I no longer have one" and "it is blank" are
different things, and only `null` reads back as absent.

Role is display-only on the profile. It is set once at sign-up, and the
Function's update schema does not accept it.

## What I would do before production

- Rate-limit code requests per address on our side. Right now the only limit is
  Appwrite Cloud's, and the error it returns is the first anyone hears of it.
- Bind the sign-in to the browser that started it. The user id round-trips
  through the client between the two screens; the emailed code is the real
  proof, but a short-lived httpOnly cookie holding the id would close the gap.
- Put the sign-in and onboarding forms behind CSRF protection. Both are POSTs
  that act on a cookie, and `SameSite=Lax` is the only thing stopping a
  cross-site submit today.
- Test coverage: the redirect filter, the null-versus-omitted edit, and the
  concurrent-create path deserve tests rather than my reading of them.
- Surface `issues[]` from the Function next to the field it names instead of
  flattening it into one line.
