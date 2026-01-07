import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // Redirect to login page by default
    throw redirect({ to: '/login' })
  },
  component: () => null,
})
