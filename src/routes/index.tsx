import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { user, account } = Route.useRouteContext()

  return (
    <main>
      <h1>HAUZ</h1>

      {user ? (
        <p>
          Signed in as {account ? `${account.firstName} ${account.lastName}` : user.email}.{' '}
          <Link to="/profile">Your profile</Link>
        </p>
      ) : (
        <p>
          A real estate marketplace for Uzbekistan.{' '}
          <Link to="/signin">Sign in</Link> to set up your profile.
        </p>
      )}
    </main>
  )
}
