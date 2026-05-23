import type { PublicMenu } from './types'

function publicMenuCacheKey(slug: string) {
  return `digital-menu-public-menu:${slug}`
}

export function readPublicMenuCache(slug: string): PublicMenu | null {
  const raw = localStorage.getItem(publicMenuCacheKey(slug))

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as PublicMenu
  } catch {
    localStorage.removeItem(publicMenuCacheKey(slug))
    return null
  }
}

export function savePublicMenuCache(slug: string, menu: PublicMenu) {
  localStorage.setItem(publicMenuCacheKey(slug), JSON.stringify(menu))
}
