import { useEffect, useState } from 'react'
import { AdminPage } from './views/AdminPage'
import { ClientMenuPage } from './views/ClientMenuPage'
import { DeliveryPage } from './views/DeliveryPage'
import { FeedbackPage } from './views/FeedbackPage'
import { LandingPage } from './views/LandingPage'
import { PlansPage } from './views/PlansPage'

export type AppRoute =
  | { name: 'landing' }
  | { name: 'admin' }
  | { name: 'plans'; companySlug: string | null }
  | { name: 'restaurant'; slug: string }
  | { name: 'delivery'; slug: string }
  | { name: 'feedback'; slug: string }

function resolveRoute(): AppRoute {
  const path = window.location.pathname

  if (path.startsWith('/admin')) {
    return { name: 'admin' }
  }

  if (path.startsWith('/plans')) {
    return {
      name: 'plans',
      companySlug: new URLSearchParams(window.location.search).get('company'),
    }
  }

  if (path.startsWith('/r/')) {
    const parts = path.split('/').filter(Boolean)
    const slug = parts[1] ?? 'demo-bistro'

    if (parts[2] === 'delivery') {
      return { name: 'delivery', slug }
    }

    if (parts[2] === 'feedback') {
      return { name: 'feedback', slug }
    }

    return {
      name: 'restaurant',
      slug,
    }
  }

  return { name: 'landing' }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(resolveRoute)

  useEffect(() => {
    const syncRoute = () => setRoute(resolveRoute())

    window.addEventListener('popstate', syncRoute)
    window.addEventListener('digital-menu:navigate', syncRoute)

    return () => {
      window.removeEventListener('popstate', syncRoute)
      window.removeEventListener('digital-menu:navigate', syncRoute)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f5f1] text-neutral-950">
      {route.name === 'landing' && <LandingPage />}
      {route.name === 'restaurant' && <ClientMenuPage slug={route.slug} />}
      {route.name === 'delivery' && <DeliveryPage slug={route.slug} />}
      {route.name === 'feedback' && <FeedbackPage slug={route.slug} />}
      {route.name === 'plans' && <PlansPage companySlug={route.companySlug} />}
      {route.name === 'admin' && <AdminPage />}
    </main>
  )
}
