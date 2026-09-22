import { createContext, useContext, useEffect } from 'react'

export interface Crumb {
  label: string
  to?: string
}

export interface HeaderCrumbs {
  items: Crumb[]
  separator: 'slash' | 'chevron'
}

export const CrumbsContext = createContext<(crumbs: HeaderCrumbs | null) => void>(() => {})

// Fills the breadcrumb slot in the app header (tickets and activity-log screens use it).
export function useHeaderCrumbs(items: Crumb[], separator: HeaderCrumbs['separator'] = 'slash') {
  const setCrumbs = useContext(CrumbsContext)
  const key = JSON.stringify(items)
  useEffect(() => {
    setCrumbs({ items: JSON.parse(key) as Crumb[], separator })
    return () => setCrumbs(null)
  }, [key, separator, setCrumbs])
}
