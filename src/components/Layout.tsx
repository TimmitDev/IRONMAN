import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { FollowsProvider } from '../lib/follows'
import { useUnread } from '../lib/nav'
import { PresenceProvider } from '../lib/presence'
import { useMe } from '../lib/profile'
import { useInbox } from '../lib/social'
import { useStravaAutoSync } from '../lib/strava'
import { Avatar } from './Avatar'
import { MobileNav } from './MobileNav'
import { RightSidebar } from './RightSidebar'
import { Sidebar } from './Sidebar'
import { ThemeSwitchButton } from './ThemeToggle'

export function PageLoader() {
  return (
    <div className="flex justify-center p-16" role="status" aria-label="Laden">
      <span className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
    </div>
  )
}

export function Layout() {
  const { me } = useMe()
  return (
    <PresenceProvider>
      <FollowsProvider meId={me.id}>
        <Shell />
      </FollowsProvider>
    </PresenceProvider>
  )
}

function Shell() {
  const { me } = useMe()
  useStravaAutoSync()
  // Eén keer ophalen en doorgeven: het getal bij Home (zijbalk en tabbalk) en de activiteit rechts.
  const inbox = useInbox()
  const unread = useUnread(me.id, inbox)

  return (
    // Ruimte voor de zwevende zijbalken: 18rem breed + 1rem marge aan de rand + 1rem tussenruimte.
    <div className="min-h-screen lg:pl-80 xl:pr-80">
      <Sidebar unread={unread} />
      <RightSidebar inbox={inbox} />

      {/* Mobiel en tablet: compacte bovenbalk. */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <Link to="/" className="text-xl font-black tracking-tight text-fg italic">
            IRON<span className="text-brand">MAN</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeSwitchButton />
            <Link to="/instellingen" className="ml-1 rounded-full" aria-label="Instellingen">
              <Avatar name={me.display_name} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[88rem] px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-6 lg:pt-4 lg:pb-4">
        {/* Binnen de layout, zodat zijbalk en tabbalk blijven staan terwijl een pagina laadt. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <MobileNav unread={unread} />
    </div>
  )
}
