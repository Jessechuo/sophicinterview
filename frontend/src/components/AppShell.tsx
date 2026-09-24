import { Fragment, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/authContext'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { CrumbsContext, type HeaderCrumbs } from './shellContext'
import { RoleTag } from './Tags'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true, adminOnly: false },
  { to: '/assets', label: 'Assets', icon: 'laptop_mac', end: false, adminOnly: false },
  { to: '/tickets', label: 'Tickets', icon: 'confirmation_number', end: false, adminOnly: false },
  { to: '/activity', label: 'Activity Log', icon: 'history', end: false, adminOnly: true },
  { to: '/users', label: 'Users', icon: 'group', end: false, adminOnly: true },
]

const NAV_BASE = 'flex items-center gap-space-sm justify-center lg:justify-start px-space-sm lg:px-gutter py-space-sm rounded transition-colors'
const ACTIVE = `${NAV_BASE} bg-[#1677ff] text-on-primary font-medium`
const IDLE = `${NAV_BASE} text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.08)] hover:text-on-primary`

// Sidebar + header shell shared by every signed-in screen (ported from the Stitch app shell).
export function AppShell() {
  const { user, isAdmin, logout } = useAuth()
  const [crumbs, setCrumbs] = useState<HeaderCrumbs | null>(null)

  return (
    <CrumbsContext.Provider value={setCrumbs}>
      <aside className="fixed left-0 top-0 h-screen w-16 lg:w-60 bg-[#001529] z-50 flex flex-col justify-between select-none">
        <div className="flex flex-col">
          <Link className="h-16 flex items-center justify-center lg:justify-start gap-space-sm px-space-sm lg:px-gutter-lg bg-[#002140]" to="/">
            <Logo className="h-8 w-8" />
            <span className="hidden lg:inline font-card-title text-card-title text-[#ffffff] tracking-tight whitespace-nowrap">IT Asset Manager</span>
          </Link>
          <nav className="flex flex-col gap-space-xs px-space-sm pt-space-md">
            {NAV.filter((item) => isAdmin || !item.adminOnly).map((item) => (
              <NavLink key={item.to} className={({ isActive }) => (isActive ? ACTIVE : IDLE)} end={item.end} to={item.to}>
                <Icon name={item.icon} className="text-[20px]" />
                <span className="hidden lg:inline font-body-medium text-body-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="hidden lg:block px-gutter-lg py-space-md border-t border-[rgba(255,255,255,0.1)]">
          <p className="font-caption text-caption text-[rgba(255,255,255,0.45)]">v1.0.0 • Enterprise</p>
        </div>
      </aside>
      <div className="pl-16 lg:pl-60 min-h-screen flex flex-col">
        <header className="sticky top-0 h-16 bg-surface-container-lowest border-b border-[#f0f0f0] z-40 px-space-md sm:px-gutter-lg flex items-center justify-between gap-space-sm shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="flex items-center text-on-surface-variant font-caption text-caption min-w-0 truncate">
              {crumbs?.items.map((crumb, i) => {
                const last = i === crumbs.items.length - 1
                return (
                  <Fragment key={crumb.label}>
                    {i > 0 &&
                      (crumbs.separator === 'chevron' ? (
                        <Icon name="chevron_right" className="text-[16px] mx-space-xs text-outline" />
                      ) : (
                        <span className="mx-space-xs text-outline-variant">/</span>
                      ))}
                    {last ? (
                      <span className="text-on-surface font-body-medium">{crumb.label}</span>
                    ) : crumb.to ? (
                      <Link className="hover:text-primary transition-colors" to={crumb.to}>{crumb.label}</Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </Fragment>
                )
              })}
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-space-sm sm:gap-gutter shrink-0">
              <div className="flex items-center gap-space-sm">
                <Avatar id={user.id} name={user.fullName} size="md" />
                <span className="hidden md:inline font-body-medium text-body-medium text-on-surface whitespace-nowrap">{user.fullName}</span>
                <span className="hidden lg:inline"><RoleTag role={user.role} /></span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-surface-variant" />
              <button className="flex items-center gap-space-xs text-on-surface-variant hover:text-error transition-colors" onClick={logout} type="button">
                <Icon name="logout" className="text-[20px]" />
                <span className="hidden sm:inline font-body-medium text-body-medium">Logout</span>
              </button>
            </div>
          )}
        </header>
        <main className="flex-1 w-full min-w-0 bg-[#f5f7fa] p-space-md sm:p-gutter-lg">
          <Outlet />
        </main>
      </div>
    </CrumbsContext.Provider>
  )
}
