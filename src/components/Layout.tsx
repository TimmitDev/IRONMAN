import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { FollowsProvider } from '../lib/follows'
import { useUnread } from '../lib/nav'
import { PresenceProvider } from '../lib/presence'
import { useMe } from '../lib/profile'
import { useInbox } from '../lib/social'
import { ProgressProvider } from '../lib/progress'
import { useStravaAutoSync } from '../lib/strava'
import { Avatar } from './Avatar'
import { ProgressChips } from './LevelBadge'
import { LevelUpOverlay } from './LevelUpOverlay'
import { Logo } from './Logo'
import { MobileNav } from './MobileNav'
import { Navbar } from './Navbar'
import { RightSidebar } from './RightSidebar'
import { Sidebar } from './Sidebar'

export function PageLoader() {
  return (
    <div className="flex justify-center p-16" role="status" aria-label="Laden">
      <span className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-fg" />
    </div>
  )
}

export function Layout() {
  const { me } = useMe()
  return (
    <PresenceProvider>
      <FollowsProvider meId={me.id}>
        <ProgressProvider>
          <Shell />
          <LevelUpOverlay />
        </ProgressProvider>
      </FollowsProvider>
    </PresenceProvider>
  )
}

function Shell() {
  const { me } = useMe()
  const { pathname } = useLocation()
  useStravaAutoSync()
  // Eén keer ophalen en doorgeven: het bolletje bij Home, het belletje en de activiteit rechts.
  const inbox = useInbox()
  const { unread, markRead } = useUnread(me.id, inbox)
  // De rechter zijbalk (vrienden, weektop, activiteit) hoort bij Home; elders krijgt de inhoud de volle breedte.
  const isHome = pathname === '/'

  return (
    <div className={`min-h-screen lg:pl-64 ${isHome ? 'xl:pr-72' : ''}`}>
      <Sidebar unread={unread} />
      {isHome && <RightSidebar inbox={inbox} />}

      {/* Mobiel en tablet: compacte bovenbalk. */}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
          <Logo />
          {/* Thema wisselen zit op mobiel in het Meer-menu; hier is de plek voor level en streak. */}
          <div className="ml-auto flex items-center gap-1">
            <Link to="/dashboard" aria-label="Je voortgang">
              <ProgressChips />
            </Link>
            <Link to="/instellingen" className="ml-1 rounded-full" aria-label="Instellingen">
              <Avatar name={me.display_name} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      {/* Desktop: smalle balk bovenaan de inhoud. */}
      <Navbar inbox={inbox} unread={unread} onMarkRead={markRead} />

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        {/* Binnen de layout, zodat zijbalk, balk en tabbalk blijven staan terwijl een pagina laadt. */}
        <Suspense fallback={<PageLoader />}>
          {/* Nieuwe key per pagina: elke pagina komt zacht binnen. */}
          <div key={pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <MobileNav unread={unread} />
    </div>
  )
}
