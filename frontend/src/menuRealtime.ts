import { fetchRestaurantMenu, fetchRestaurantMenuVersion } from './api'
import { savePublicMenuCache } from './publicMenuCache'
import type { PublicMenu } from './types'

const channelPrefix = 'digital-menu-live:'

type Unsubscribe = () => void

export function notifyLocalMenuChange(slug: string) {
  const payload = JSON.stringify({ slug, at: Date.now() })
  localStorage.setItem(`${channelPrefix}${slug}`, payload)

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(`${channelPrefix}${slug}`)
    channel.postMessage(payload)
    channel.close()
  }
}

export function subscribeLocalMenuChange(slug: string, callback: () => void): Unsubscribe {
  const key = `${channelPrefix}${slug}`
  const disposers: Unsubscribe[] = []

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) {
      callback()
    }
  }

  window.addEventListener('storage', onStorage)
  disposers.push(() => window.removeEventListener('storage', onStorage))

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(key)
    channel.onmessage = () => callback()
    disposers.push(() => channel.close())
  }

  return () => disposers.forEach((dispose) => dispose())
}

export function subscribeRestaurantMenu(
  slug: string,
  onMenu: (menu: PublicMenu) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  let isActive = true
  let loadPromise: Promise<void> | null = null
  let versionPromise: Promise<void> | null = null
  let knownVersion: number | null = null
  let timeoutId: number | null = null

  const load = async () => {
    if (loadPromise) {
      return loadPromise
    }

    loadPromise = (async () => {
      try {
        const response = await fetchRestaurantMenu(slug)

        if (isActive) {
          knownVersion = response.data.company.menu_version
          savePublicMenuCache(slug, response.data)
          onMenu(response.data)
        }
      } catch (error) {
        onError?.(error)
      } finally {
        loadPromise = null
      }
    })()

    return loadPromise
  }

  const checkVersion = async () => {
    if (versionPromise) {
      return versionPromise
    }

    versionPromise = (async () => {
      try {
        const response = await fetchRestaurantMenuVersion(slug)

        if (knownVersion === null || response.data.version !== knownVersion) {
          await load()
        }
      } catch (error) {
        onError?.(error)
      } finally {
        versionPromise = null
      }
    })()

    return versionPromise
  }

  const schedule = () => {
    timeoutId = window.setTimeout(() => {
      void checkVersion().finally(() => {
        if (isActive) {
          schedule()
        }
      })
    }, 1000)
  }

  void load().finally(schedule)
  const stopLocal = subscribeLocalMenuChange(slug, load)

  return () => {
    isActive = false
    stopLocal()
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}
