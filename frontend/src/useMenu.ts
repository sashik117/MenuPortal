import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { fetchMenu } from './api'
import type { Category } from './types'

function menuCacheKey(token?: string | null) {
  return token ? `digital-menu-admin-menu:${token.slice(0, 12)}` : null
}

function readCachedMenu(token?: string | null): Category[] {
  const key = menuCacheKey(token)

  if (!key) {
    return []
  }

  const raw = localStorage.getItem(key)

  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as Category[]
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

function saveCachedMenu(token: string | null | undefined, categories: Category[]) {
  const key = menuCacheKey(token)

  if (key) {
    localStorage.setItem(key, JSON.stringify(categories))
  }
}

type MenuState = {
  categories: Category[]
  isLoading: boolean
  error: string | null
  refetch: (options?: { silent?: boolean }) => Promise<Category[]>
  setCategories: Dispatch<SetStateAction<Category[]>>
}

export function useMenu(token?: string | null): MenuState {
  const [categories, setCategories] = useState<Category[]>(() => readCachedMenu(token))
  const [isLoading, setIsLoading] = useState(() => readCachedMenu(token).length === 0)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await fetchMenu(token)
      setCategories(response.data)
      saveCachedMenu(token, response.data)
      return response.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu')
      throw err
    } finally {
      if (!options.silent) {
        setIsLoading(false)
      }
    }
  }, [token])

  useEffect(() => {
    let isMounted = true

    fetchMenu(token)
      .then((response) => {
        if (isMounted) {
          setCategories(response.data)
          saveCachedMenu(token, response.data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load menu')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  useEffect(() => {
    saveCachedMenu(token, categories)
  }, [categories, token])

  return {
    categories,
    isLoading,
    error,
    refetch,
    setCategories,
  }
}
