import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  FormEvent,
  Dispatch,
  RefObject,
  ReactNode,
  SetStateAction,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ClipboardList,
  FolderPlus,
  Edit3,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  MoreHorizontal,
  Plus,
  Save,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  createCategory,
  createDish,
  createSubcategory,
  deleteCategory,
  deleteDish,
  deletePlatformCompany,
  deleteSubcategory,
  fetchCompany,
  fetchPlatformCompanies,
  login as loginRequest,
  toggleDish,
  updateCompany,
  updateDish,
  updatePlatformCompany,
  updateCategory,
  updateSubcategory,
  uploadCompanyAvatar,
  uploadDishImage,
} from '../api'
import { DishPhoto } from '../components/DishPhoto'
import { ImageCropper } from '../components/ImageCropper'
import type { ImageCropperHandle } from '../components/ImageCropper'
import { notifyLocalMenuChange } from '../menuRealtime'
import { navigateTo } from '../router'
import { useMenu } from '../useMenu'
import type {
  AdminUser,
  Category,
  Company,
  CompanySettingsPayload,
  Dish,
  DishPayload,
  PlatformCompany,
  PlatformCompanyPayload,
  Subcategory,
} from '../types'

const TOKEN_KEY = 'digital-menu-token'
const ADMIN_KEY = 'digital-menu-admin'
const COMPANY_KEY = 'digital-menu-company'

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options: { fields: string[] },
          ) => {
            addListener: (eventName: 'place_changed', callback: () => void) => { remove: () => void }
            getPlace: () => {
              formatted_address?: string
              geometry?: {
                location?: {
                  lat: () => number
                  lng: () => number
                }
              }
              place_id?: string
              url?: string
            }
          }
        }
      }
    }
  }
}

type AdminDish = Dish & {
  categoryName: string
  subcategoryName: string | null
}

type PhotoEditorHandle = ImageCropperHandle

function formatPrice(price: string) {
  return `${Number(price).toLocaleString('uk-UA')} грн`
}

function getStoredObject<T>(key: string): T | null {
  const raw = localStorage.getItem(key)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

function dishToPayload(dish: Dish | null, fallbackCategoryId: number): DishPayload {
  return {
    category_id: dish?.category_id ?? fallbackCategoryId,
    subcategory_id: dish?.subcategory_id ?? null,
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    weight: dish?.weight ?? '',
    image_url: dish?.image_url ?? null,
    price: Number(dish?.price ?? 0),
    is_available: dish?.is_available ?? true,
    sort_order: dish?.sort_order ?? 50,
  }
}

function companyToSettingsPayload(company: Company | null): CompanySettingsPayload {
  return {
    avatar_url: company?.avatar_url ?? '',
    wifi_name: company?.wifi_name ?? '',
    wifi_password: company?.wifi_password ?? '',
    working_hours: company?.working_hours ?? '',
    address: company?.address ?? '',
    maps_url: company?.maps_url ?? '',
    google_place_id: company?.google_place_id ?? '',
    address_lat: company?.address_lat ?? '',
    address_lng: company?.address_lng ?? '',
    phone: company?.phone ?? '',
    delivery_url: company?.delivery_url ?? '',
    feedback_email: company?.feedback_email ?? '',
    telegram_chat_id: company?.telegram_chat_id ?? '',
  }
}

function normalizeCompanySettings(payload: CompanySettingsPayload): CompanySettingsPayload {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      value?.trim() ? value.trim() : null,
    ]),
  ) as CompanySettingsPayload
}

function companyToPlatformPayload(company: PlatformCompany): PlatformCompanyPayload {
  return {
    owner_first_name: company.owner_first_name,
    owner_last_name: company.owner_last_name,
    name: company.name,
    venue_type: company.venue_type,
    avatar_url: company.avatar_url,
    status: company.status as PlatformCompanyPayload['status'],
    trial_ends_at: company.trial_ends_at,
    subscription_ends_at: company.subscription_ends_at,
    wifi_name: company.wifi_name,
    wifi_password: company.wifi_password,
    working_hours: company.working_hours,
    address: company.address,
    maps_url: company.maps_url,
    google_place_id: company.google_place_id,
    address_lat: company.address_lat,
    address_lng: company.address_lng,
    phone: company.phone,
    delivery_url: company.delivery_url,
    feedback_email: company.feedback_email,
    telegram_chat_id: company.telegram_chat_id,
  }
}

function normalizePlatformCompanyPayload(
  payload: PlatformCompanyPayload,
): PlatformCompanyPayload {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === 'string' && value.trim() === '' ? null : value,
    ]),
  ) as PlatformCompanyPayload
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 16)
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null
}

const platformStatuses: Array<{
  label: string
  value: NonNullable<PlatformCompanyPayload['status']>
}> = [
  { label: 'Trial', value: 'trialing' },
  { label: 'Активний', value: 'active' },
  { label: 'Очікує оплату', value: 'pending_payment' },
  { label: 'Бан', value: 'banned' },
  { label: 'Скасований', value: 'canceled' },
]

const weekDays = [
  ['mon', 'Пн'],
  ['tue', 'Вт'],
  ['wed', 'Ср'],
  ['thu', 'Чт'],
  ['fri', 'Пт'],
  ['sat', 'Сб'],
  ['sun', 'Нд'],
] as const

type DayKey = (typeof weekDays)[number][0]
type DaySchedule = Record<DayKey, { closed: boolean; open: string; close: string }>

function defaultSchedule(): DaySchedule {
  return Object.fromEntries(
    weekDays.map(([key]) => [key, { closed: false, open: '11:00', close: '22:00' }]),
  ) as DaySchedule
}

function parseSchedule(value: string | null): DaySchedule {
  if (!value) {
    return defaultSchedule()
  }

  try {
    return { ...defaultSchedule(), ...(JSON.parse(value) as Partial<DaySchedule>) }
  } catch {
    return defaultSchedule()
  }
}

function formatPhoneUa(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^380/, '').replace(/^0/, '').slice(0, 9)
  const first = digits.slice(0, 2)
  const second = digits.slice(2, 5)
  const third = digits.slice(5, 7)
  const fourth = digits.slice(7, 9)

  let result = '+380'

  if (first) {
    result += ` (${first}`
  }

  if (first.length === 2) {
    result += ')'
  }

  if (second) {
    result += ` ${second}`
  }

  if (third) {
    result += `-${third}`
  }

  if (fourth) {
    result += `-${fourth}`
  }

  return result
}

function sortCategories(categories: Category[]) {
  return [...categories].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  )
}

function sortDishes(dishes: Dish[]) {
  return [...dishes].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  )
}

function sortSubcategories(subcategories: Subcategory[]) {
  return [...subcategories].sort(
    (left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name),
  )
}

function upsertDish(categories: Category[], dish: Dish) {
  return sortCategories(
    categories.map((category) => {
      const withoutDish = category.dishes.filter((item) => item.id !== dish.id)

      if (category.id !== dish.category_id) {
        return {
          ...category,
          dishes: withoutDish,
        }
      }

      return {
        ...category,
        dishes: sortDishes([...withoutDish, dish]),
      }
    }),
  )
}

function removeDishFromCategories(categories: Category[], dishId: number) {
  return categories.map((category) => ({
    ...category,
    dishes: category.dishes.filter((dish) => dish.id !== dishId),
  }))
}

function upsertCategory(categories: Category[], category: Category) {
  const existing = categories.some((item) => item.id === category.id)
  const nextCategory = {
    ...category,
    dishes: sortDishes(category.dishes ?? []),
    subcategories: sortSubcategories(category.subcategories ?? []),
  }

  return sortCategories(
    existing
      ? categories.map((item) => (item.id === category.id ? nextCategory : item))
      : [...categories, nextCategory],
  )
}

function removeCategoryFromList(categories: Category[], categoryId: number) {
  return categories.filter((category) => category.id !== categoryId)
}

function upsertSubcategory(categories: Category[], subcategory: Subcategory) {
  return categories.map((category) => {
    const withoutSubcategory = category.subcategories.filter((item) => item.id !== subcategory.id)

    if (category.id !== subcategory.category_id) {
      return {
        ...category,
        subcategories: withoutSubcategory,
      }
    }

    return {
      ...category,
      subcategories: sortSubcategories([...withoutSubcategory, subcategory]),
    }
  })
}

function removeSubcategoryFromList(categories: Category[], subcategoryId: number) {
  return categories.map((category) => ({
    ...category,
    subcategories: category.subcategories.filter((subcategory) => subcategory.id !== subcategoryId),
    dishes: category.dishes.map((dish) =>
      dish.subcategory_id === subcategoryId ? { ...dish, subcategory_id: null } : dish,
    ),
  }))
}

export function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const menu = useMenu(token)
  const [admin, setAdmin] = useState<AdminUser | null>(() =>
    getStoredObject<AdminUser>(ADMIN_KEY),
  )
  const [company, setCompany] = useState<Company | null>(() =>
    getStoredObject<Company>(COMPANY_KEY),
  )

  const handleLoggedIn = (nextToken: string, nextAdmin: AdminUser, nextCompany: Company | null) => {
    setToken(nextToken)
    setAdmin(nextAdmin)
    setCompany(nextCompany)
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(nextAdmin))

    if (nextCompany) {
      localStorage.setItem(COMPANY_KEY, JSON.stringify(nextCompany))
    }

    void menu.refetch()
  }

  const handleLogout = () => {
    setToken(null)
    setAdmin(null)
    setCompany(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ADMIN_KEY)
    localStorage.removeItem(COMPANY_KEY)
  }

  useEffect(() => {
    window.addEventListener('digital-menu:auth-expired', handleLogout)

    return () => {
      window.removeEventListener('digital-menu:auth-expired', handleLogout)
    }
  })

  useEffect(() => {
    if (!token) {
      return
    }

    let isMounted = true

    fetchCompany(token)
      .then((response) => {
        if (!isMounted) {
          return
        }

        setCompany(response.data)
        localStorage.setItem(COMPANY_KEY, JSON.stringify(response.data))
      })
      .catch(() => {
        if (isMounted) {
          setCompany(null)
          localStorage.removeItem(COMPANY_KEY)
        }
      })

    return () => {
      isMounted = false
    }
  }, [token])

  if (!token || !admin) {
    return <LoginPage onLoggedIn={handleLoggedIn} />
  }

  if (admin.role === 'platform_admin') {
    return <PlatformAdminDashboard admin={admin} onLogout={handleLogout} token={token} />
  }

  return (
    <AdminDashboard
      admin={admin}
      categories={menu.categories}
      company={company}
      error={menu.error}
      isLoading={menu.isLoading}
      onCompanyChanged={(nextCompany) => {
        setCompany(nextCompany)
        localStorage.setItem(COMPANY_KEY, JSON.stringify(nextCompany))
      }}
      onLogout={handleLogout}
      setCategories={menu.setCategories}
      token={token}
    />
  )
}

function LoginPage({
  onLoggedIn,
}: {
  onLoggedIn: (token: string, admin: AdminUser, company: Company | null) => void
}) {
  const [loginName, setLoginName] = useState('admin')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(false)

    try {
      const response = await loginRequest(loginName, password)
      onLoggedIn(response.token, response.admin, response.company)
    } catch {
      setError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="grid w-full max-w-4xl overflow-hidden rounded-md border border-neutral-300 bg-white shadow-sm md:grid-cols-[0.9fr_1fr]"
      >
        <div className="hidden border-r border-neutral-200 bg-neutral-950 p-6 text-white md:flex md:flex-col md:justify-between">
          <div>
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-md border border-white/20">
              <ClipboardList size={20} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
              Control panel
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">
              Керуйте меню без зайвого шуму
            </h1>
          </div>
          <p className="text-sm leading-6 text-white/60">
            Страви, фото, стоп-лист, підкатегорії та лайки гостей в одному кабінеті.
          </p>
        </div>

        <form onSubmit={submit} className="p-5 sm:p-8">
          <div className="mb-7 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
                Admin
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-neutral-950">Вхід</h2>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-300"
              aria-label="На головну"
            >
              <X size={18} />
            </button>
          </div>

          <TextInput
            autoComplete="username"
            label="Логін або email"
            name="username"
            value={loginName}
            onChange={setLoginName}
          />
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Пароль</span>
            <span className="relative block">
              <input
                required
                autoComplete="current-password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={isPasswordVisible ? 'text' : 'password'}
                className="h-11 w-full rounded-md border border-neutral-300 px-3 pr-11 outline-none transition focus:border-neutral-950"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((value) => !value)}
                className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-md text-neutral-500"
                aria-label={isPasswordVisible ? 'Сховати пароль' : 'Показати пароль'}
              >
                {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && (
            <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Перевір логін або пароль.
            </p>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:bg-neutral-400"
          >
            <LogIn size={17} />
            {isSubmitting ? 'Перевіряємо' : 'Увійти'}
          </motion.button>
        </form>
      </motion.section>
    </div>
  )
}

function PlatformAdminDashboard({
  admin,
  onLogout,
  token,
}: {
  admin: AdminUser
  onLogout: () => void
  token: string
}) {
  const [companies, setCompanies] = useState<PlatformCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [editingCompany, setEditingCompany] = useState<PlatformCompany | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    const response = await fetchPlatformCompanies(token)
    setCompanies(response.data)
    setIsLoading(false)
  }, [token])

  useEffect(() => {
    let isMounted = true

    fetchPlatformCompanies(token)
      .then((response) => {
        if (isMounted) {
          setCompanies(response.data)
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

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }

  const patchCompany = async (
    company: PlatformCompany,
    status: PlatformCompany['status'],
  ) => {
    await updatePlatformCompany(token, company.id, {
      status: status as 'trialing' | 'active' | 'pending_payment' | 'banned' | 'canceled',
    })
    await load()
    flash('Статус оновлено')
  }

  const extendSubscription = async (company: PlatformCompany, months: number) => {
    const base = company.subscription_ends_at
      ? new Date(company.subscription_ends_at)
      : new Date()
    base.setMonth(base.getMonth() + months)

    await updatePlatformCompany(token, company.id, {
      status: 'active',
      subscription_ends_at: base.toISOString(),
    })
    await load()
    flash(`Підписку видано на ${months} міс.`)
  }

  const removeCompany = async (company: PlatformCompany) => {
    if (!window.confirm(`Видалити ${company.name}?`)) {
      return
    }

    await deletePlatformCompany(token, company.id)
    await load()
    flash('Ресторан видалено')
  }

  const savePlatformCompany = async (
    company: PlatformCompany,
    payload: PlatformCompanyPayload,
  ) => {
    const response = await updatePlatformCompany(
      token,
      company.id,
      normalizePlatformCompanyPayload(payload),
    )
    setCompanies((current) =>
      current.map((item) => (item.id === company.id ? response.data : item)),
    )
    setEditingCompany(null)
    flash('Ресторан оновлено')
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6">
      <header className="mb-5 flex items-center gap-3 border-b border-neutral-300 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-950 text-white">
          <ClipboardList size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            {admin.name}
          </p>
          <h1 className="truncate text-2xl font-semibold text-neutral-950">
            Адмін платформи
          </h1>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium"
        >
          <LogOut size={16} />
          Вийти
        </button>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Ресторани" value={companies.length} />
        <Metric
          label="Активні"
          value={companies.filter((company) => company.status === 'active').length}
        />
        <Metric
          label="Забанені"
          value={companies.filter((company) => company.status === 'banned').length}
        />
      </section>

      {isLoading && <StatusBlock label="Завантажуємо ресторани" />}

      <section className="grid gap-3">
        {companies.map((company) => (
          <article
            key={company.id}
            className="rounded-md border border-neutral-300 bg-white p-4"
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold">{company.name}</h2>
                  <span className="rounded-sm border border-neutral-300 px-2 py-1 text-xs font-semibold uppercase text-neutral-500">
                    {company.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  /r/{company.slug} · {company.venue_type} · страв: {company.dishes_count} · користувачів: {company.users_count}
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  Власник: {company.owner_first_name} {company.owner_last_name} · {company.users[0]?.email ?? company.feedback_email ?? 'email не вказаний'}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Trial до: {company.trial_ends_at ?? 'немає'} · Підписка до: {company.subscription_ends_at ?? 'немає'}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
                <button
                  type="button"
                  onClick={() => extendSubscription(company, 1)}
                  className="h-10 rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white"
                >
                  +1 місяць
                </button>
                <button
                  type="button"
                  onClick={() => extendSubscription(company, 12)}
                  className="h-10 rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white"
                >
                  +1 рік
                </button>
                <button
                  type="button"
                  onClick={() => patchCompany(company, 'trialing')}
                  className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold"
                >
                  Trial
                </button>
                <button
                  type="button"
                  onClick={() => patchCompany(company, 'active')}
                  className="h-10 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800"
                >
                  Актив
                </button>
                <button
                  type="button"
                  onClick={() => patchCompany(company, 'banned')}
                  className="h-10 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
                >
                  Бан
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCompany(company)}
                  className="flex h-10 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold"
                >
                  <Edit3 size={15} />
                  Редагувати
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo(`/r/${company.slug}`)}
                  className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold"
                >
                  Меню
                </button>
                <button
                  type="button"
                  onClick={() => removeCompany(company)}
                  className="h-10 rounded-md bg-red-700 px-3 text-sm font-semibold text-white"
                >
                  Видалити
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      <AnimatePresence>
        {editingCompany && (
          <PlatformCompanyDrawer
            company={editingCompany}
            onClose={() => setEditingCompany(null)}
            onSave={(payload) => savePlatformCompany(editingCompany, payload)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold shadow-lg"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlatformCompanyDrawer({
  company,
  onClose,
  onSave,
}: {
  company: PlatformCompany
  onClose: () => void
  onSave: (payload: PlatformCompanyPayload) => Promise<void>
}) {
  const [payload, setPayload] = useState<PlatformCompanyPayload>(() =>
    companyToPlatformPayload(company),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState(false)

  const update = <Key extends keyof PlatformCompanyPayload>(
    key: Key,
    value: PlatformCompanyPayload[Key],
  ) => {
    setPayload((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFormError(false)

    try {
      await onSave(payload)
    } catch {
      setFormError(true)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-neutral-950/35"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.aside
        initial={{ x: '100%', y: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: '100%', y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ml-auto hidden h-full w-full max-w-2xl overflow-y-auto border-l border-neutral-300 bg-white p-5 shadow-xl sm:block"
      >
        <PlatformCompanyForm
          formError={formError}
          isSaving={isSaving}
          onClose={onClose}
          payload={payload}
          submit={submit}
          update={update}
        />
      </motion.aside>

      <motion.aside
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 max-h-[94vh] overflow-y-auto overflow-x-hidden rounded-t-md border-t border-neutral-300 bg-white p-4 shadow-xl sm:hidden"
      >
        <PlatformCompanyForm
          formError={formError}
          isSaving={isSaving}
          onClose={onClose}
          payload={payload}
          submit={submit}
          update={update}
        />
      </motion.aside>
    </motion.div>
  )
}

function PlatformCompanyForm({
  formError,
  isSaving,
  onClose,
  payload,
  submit,
  update,
}: {
  formError: boolean
  isSaving: boolean
  onClose: () => void
  payload: PlatformCompanyPayload
  submit: (event: FormEvent<HTMLFormElement>) => void
  update: <Key extends keyof PlatformCompanyPayload>(
    key: Key,
    value: PlatformCompanyPayload[Key],
  ) => void
}) {
  return (
    <form onSubmit={submit}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            Адмін платформи
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
            Редагування ресторану
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-300"
          aria-label="Закрити"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          label="Назва ресторану"
          value={payload.name ?? ''}
          onChange={(value) => update('name', value)}
        />
        <TextInput
          label="Тип закладу"
          value={payload.venue_type ?? ''}
          onChange={(value) => update('venue_type', value)}
        />
        <TextInput
          label="Ім'я власника"
          value={payload.owner_first_name ?? ''}
          onChange={(value) => update('owner_first_name', value)}
        />
        <TextInput
          label="Прізвище власника"
          value={payload.owner_last_name ?? ''}
          onChange={(value) => update('owner_last_name', value)}
        />
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Статус</span>
        <select
          value={payload.status ?? 'trialing'}
          onChange={(event) =>
            update(
              'status',
              event.target.value as NonNullable<PlatformCompanyPayload['status']>,
            )
          }
          className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 outline-none focus:border-neutral-950"
        >
          {platformStatuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          label="Trial до"
          required={false}
          type="datetime-local"
          value={toDateTimeLocal(payload.trial_ends_at)}
          onChange={(value) => update('trial_ends_at', fromDateTimeLocal(value))}
        />
        <TextInput
          label="Підписка до"
          required={false}
          type="datetime-local"
          value={toDateTimeLocal(payload.subscription_ends_at)}
          onChange={(value) => update('subscription_ends_at', fromDateTimeLocal(value))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          label="WiFi назва"
          required={false}
          value={payload.wifi_name ?? ''}
          onChange={(value) => update('wifi_name', value)}
        />
        <TextInput
          label="WiFi пароль"
          required={false}
          value={payload.wifi_password ?? ''}
          onChange={(value) => update('wifi_password', value)}
        />
      </div>
      <WorkingHoursEditor
        value={payload.working_hours ?? null}
        onChange={(value) => update('working_hours', value)}
      />
      <AddressInput
        address={payload.address ?? ''}
        onAddress={(value) => update('address', value)}
        onMapsUrl={(value) => update('maps_url', value)}
        onPlace={(place) => {
          update('google_place_id', place.placeId)
          update('address_lat', place.lat)
          update('address_lng', place.lng)
        }}
      />
      <PhoneInput
        value={payload.phone ?? ''}
        onChange={(value) => update('phone', value)}
      />
      <TextInput
        label="Посилання на доставку"
        required={false}
        type="url"
        value={payload.delivery_url ?? ''}
        onChange={(value) => update('delivery_url', value)}
      />
      <TextInput
        label="Email для відгуків"
        required={false}
        type="email"
        value={payload.feedback_email ?? ''}
        onChange={(value) => update('feedback_email', value)}
      />
      <TextInput
        label="Telegram chat id"
        required={false}
        value={payload.telegram_chat_id ?? ''}
        onChange={(value) => update('telegram_chat_id', value)}
      />

      {formError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Не вдалося зберегти. Перевір URL, email або обов'язкові поля.
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={{ scale: 0.95 }}
        disabled={isSaving}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:bg-neutral-400"
      >
        <Save size={17} />
        {isSaving ? 'Зберігаємо' : 'Зберегти ресторан'}
      </motion.button>
    </form>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-300 bg-white p-4">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function AdminDashboard({
  admin,
  categories,
  company,
  error,
  isLoading,
  onCompanyChanged,
  onLogout,
  setCategories,
  token,
}: {
  admin: AdminUser
  categories: Category[]
  company: Company | null
  error: string | null
  isLoading: boolean
  onCompanyChanged: (company: Company) => void
  onLogout: () => void
  setCategories: Dispatch<SetStateAction<Category[]>>
  token: string
}) {
  const [drawerDish, setDrawerDish] = useState<Dish | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const [deleteCandidate, setDeleteCandidate] = useState<AdminDish | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const dishes: AdminDish[] = categories.flatMap((category) =>
    category.dishes.map((dish) => ({
      ...dish,
      categoryName: category.name,
      subcategoryName:
        category.subcategories.find((subcategory) => subcategory.id === dish.subcategory_id)
          ?.name ?? null,
    })),
  )

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }

  const handleToggle = async (dishId: number) => {
    const dish = dishes.find((item) => item.id === dishId)

    if (!dish) {
      return
    }

    setPendingId(dishId)
    setCategories((current) =>
      upsertDish(current, {
        ...dish,
        is_available: !dish.is_available,
      }),
    )

    try {
      const response = await toggleDish(token, dishId)
      setCategories((current) => upsertDish(current, response.data))
      if (company) {
        notifyLocalMenuChange(company.slug)
      }
      flash('Наявність оновлено')
    } catch {
      setCategories((current) => upsertDish(current, dish))
      flash('Не вийшло оновити наявність')
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteCandidate) {
      return
    }

    const deletedDish = deleteCandidate
    setPendingId(deletedDish.id)
    setDeleteCandidate(null)
    setCategories((current) => removeDishFromCategories(current, deletedDish.id))

    try {
      await deleteDish(token, deletedDish.id)
      if (company) {
        notifyLocalMenuChange(company.slug)
      }
      flash('Страву видалено')
    } catch {
      setCategories((current) => upsertDish(current, deletedDish))
      flash('Не вийшло видалити страву')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6">
      <header className="relative mb-5 flex items-center gap-3 border-b border-neutral-300 pb-4">
        {company?.avatar_url ? (
          <img
            src={company.avatar_url}
            alt={company.name}
            className="h-11 w-11 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-950 text-white">
            <ClipboardList size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            {company?.name ?? admin.name}
          </p>
          <h1 className="truncate text-2xl font-semibold text-neutral-950">
            Панель керування
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsActionsOpen((value) => !value)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-white"
          aria-label="Дії"
        >
          <MoreHorizontal size={18} />
        </button>
        <AnimatePresence>
          {isActionsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-12 z-40 w-56 rounded-md border border-neutral-300 bg-white p-2 shadow-xl"
            >
              <ActionMenuButton
                icon={<Plus size={16} />}
                label="Додати страву"
                onClick={() => {
                  setIsActionsOpen(false)
                  setDrawerDish(null)
                  setIsDrawerOpen(true)
                }}
              />
              <ActionMenuButton
                icon={<Settings2 size={16} />}
                label="Заклад"
                onClick={() => {
                  setIsActionsOpen(false)
                  setIsSettingsOpen(true)
                }}
              />
              <ActionMenuButton
                icon={<FolderPlus size={16} />}
                label="Категорії"
                onClick={() => {
                  setIsActionsOpen(false)
                  setIsCategoriesOpen(true)
                }}
              />
              <ActionMenuButton
                icon={<ClipboardList size={16} />}
                label="Відкрити меню"
                onClick={() => {
                  setIsActionsOpen(false)
                  navigateTo(company ? `/r/${company.slug}` : '/r/demo-bistro')
                }}
              />
              <ActionMenuButton
                icon={<LogOut size={16} />}
                label="Вийти"
                onClick={() => {
                  setIsActionsOpen(false)
                  onLogout()
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {isLoading && <StatusBlock label="Оновлюємо список" />}
      {error && <StatusBlock label="Не вийшло завантажити API" />}

      <section className="rounded-md border border-neutral-300 bg-white p-2">
        <div className="grid gap-2">
          {dishes.map((dish) => (
            <article
              key={dish.id}
              className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 rounded-md border border-neutral-200 bg-white p-2 min-[390px]:grid-cols-[118px_minmax(0,1fr)] sm:grid-cols-[132px_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <DishPhoto src={dish.image_url} alt={dish.name} className="self-start" />
                <div className="mt-3 border-t border-neutral-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    Наявність
                  </p>
                  <AvailabilityToggle
                    isAvailable={dish.is_available}
                    isPending={pendingId === dish.id}
                    label={dish.name}
                    onToggle={() => handleToggle(dish.id)}
                  />
                </div>
              </div>
              <div className="min-w-0 p-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-neutral-950">{dish.name}</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-neutral-700">
                      {dish.categoryName}
                    </p>
                    {dish.subcategoryName && (
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#47715f]">
                        {dish.subcategoryName}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="whitespace-nowrap text-sm font-semibold text-neutral-950">
                      {formatPrice(dish.price)}
                    </p>
                    <p className="text-xs font-semibold text-neutral-500">
                      {dish.likes_count} likes
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-5 text-neutral-500">
                  {dish.description || 'Склад не вказаний'}
                </p>
                {dish.weight && (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    {dish.weight}
                  </p>
                )}
              </div>
              <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 border-t border-neutral-100 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDrawerDish(dish)
                    setIsDrawerOpen(true)
                  }}
                  className="flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-1.5 text-xs font-semibold min-[390px]:text-sm"
                >
                  <Edit3 size={14} className="shrink-0" />
                  <span className="truncate">Редагувати</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(dish)}
                  className="flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-1.5 text-xs font-semibold text-red-700 min-[390px]:text-sm"
                >
                  <Trash2 size={14} className="shrink-0" />
                  <span className="truncate">Видалити</span>
                </button>
              </div>
            </article>
          ))}
          {dishes.length === 0 && (
            <p className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
              Страв ще нема. Відкрий “Дії” і додай першу позицію.
            </p>
          )}
        </div>
      </section>

      <AnimatePresence>
        {isDrawerOpen && (
          <DishDrawer
            categories={categories}
            dish={drawerDish}
            onClose={() => setIsDrawerOpen(false)}
            onSaved={(message, dish) => {
              setCategories((current) => upsertDish(current, dish))
              setIsDrawerOpen(false)
              if (company) {
                notifyLocalMenuChange(company.slug)
              }
              flash(message)
            }}
            token={token}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsDrawer
            company={company}
            onClose={() => setIsSettingsOpen(false)}
            onSaved={(nextCompany) => {
              onCompanyChanged(nextCompany)
              setIsSettingsOpen(false)
              notifyLocalMenuChange(nextCompany.slug)
              flash('Дані закладу оновлено')
            }}
            token={token}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoriesOpen && (
          <CategoryDrawer
            categories={categories}
            company={company}
            onCategoriesChanged={setCategories}
            onClose={() => setIsCategoriesOpen(false)}
            token={token}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteCandidate && (
          <DeleteConfirmModal
            dish={deleteCandidate}
            isDeleting={pendingId === deleteCandidate.id}
            onCancel={() => setDeleteCandidate(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold shadow-lg"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AvailabilityToggle({
  isAvailable,
  isPending,
  label,
  onToggle,
}: {
  isAvailable: boolean
  isPending: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <div className="mt-2 flex flex-col items-start gap-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        disabled={isPending}
        onClick={onToggle}
        className={`relative h-7 w-14 rounded-full border transition ${
          isAvailable ? 'border-neutral-950 bg-neutral-950' : 'border-neutral-300 bg-neutral-200'
        }`}
        aria-label={`Перемкнути ${label}`}
      >
        <motion.span
          layout
          animate={{ x: isAvailable ? 28 : 4 }}
          transition={{ duration: 0.22 }}
          className="absolute left-0 top-[3px] h-5 w-5 rounded-full bg-white shadow-sm"
        />
      </motion.button>
      <span className="text-xs font-semibold leading-4 text-neutral-700">
        {isAvailable ? 'Є в меню' : 'Приховано'}
      </span>
    </div>
  )
}

function ActionMenuButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
    >
      {icon}
      {label}
    </button>
  )
}

function CategoryDrawer({
  categories,
  company,
  onCategoriesChanged,
  onClose,
  token,
}: {
  categories: Category[]
  company: Company | null
  onCategoriesChanged: Dispatch<SetStateAction<Category[]>>
  onClose: () => void
  token: string
}) {
  const [categoryName, setCategoryName] = useState('')
  const [categoryDrafts, setCategoryDrafts] = useState<Record<number, string>>({})
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<number, string>>({})
  const [newSubcategoryNames, setNewSubcategoryNames] = useState<Record<number, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(false)

  const notify = () => {
    if (company) {
      notifyLocalMenuChange(company.slug)
    }
  }

  const addCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!categoryName.trim()) {
      return
    }

    setIsSaving(true)
    setError(false)

    try {
      const response = await createCategory(token, { name: categoryName.trim() })
      onCategoriesChanged((current) => upsertCategory(current, response.data))
      setCategoryName('')
      notify()
    } catch {
      setError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const renameCategory = async (category: Category) => {
    const name = categoryDrafts[category.id]?.trim()

    if (!name || name === category.name) {
      return
    }

    setIsSaving(true)
    setError(false)

    try {
      const response = await updateCategory(token, category.id, {
        name,
        sort_order: category.sort_order,
      })
      onCategoriesChanged((current) => upsertCategory(current, response.data))
      notify()
    } catch {
      setError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const removeCategory = async (category: Category) => {
    if (!window.confirm(`Видалити категорію “${category.name}” разом зі стравами?`)) {
      return
    }

    const previous = categories
    onCategoriesChanged((current) => removeCategoryFromList(current, category.id))
    notify()

    try {
      await deleteCategory(token, category.id)
    } catch {
      onCategoriesChanged(previous)
      setError(true)
    }
  }

  const addSubcategory = async (category: Category) => {
    const name = newSubcategoryNames[category.id]?.trim()

    if (!name) {
      return
    }

    setIsSaving(true)
    setError(false)

    try {
      const response = await createSubcategory(token, {
        category_id: category.id,
        name,
      })
      onCategoriesChanged((current) => upsertSubcategory(current, response.data))
      setNewSubcategoryNames((current) => ({ ...current, [category.id]: '' }))
      notify()
    } catch {
      setError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const renameSubcategory = async (subcategory: Subcategory) => {
    const name = subcategoryDrafts[subcategory.id]?.trim()

    if (!name || name === subcategory.name) {
      return
    }

    setIsSaving(true)
    setError(false)

    try {
      const response = await updateSubcategory(token, subcategory.id, {
        category_id: subcategory.category_id,
        name,
        sort_order: subcategory.sort_order,
      })
      onCategoriesChanged((current) => upsertSubcategory(current, response.data))
      notify()
    } catch {
      setError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const removeSubcategory = async (subcategory: Subcategory) => {
    const previous = categories
    onCategoriesChanged((current) => removeSubcategoryFromList(current, subcategory.id))
    notify()

    try {
      await deleteSubcategory(token, subcategory.id)
    } catch {
      onCategoriesChanged(previous)
      setError(true)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-neutral-950/35"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.aside
        initial={{ x: '100%', y: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: '100%', y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ml-auto hidden h-full w-full max-w-2xl overflow-y-auto border-l border-neutral-300 bg-white p-5 shadow-xl sm:block"
      >
        <CategoryForm
          addCategory={addCategory}
          addSubcategory={addSubcategory}
          categories={categories}
          categoryDrafts={categoryDrafts}
          categoryName={categoryName}
          error={error}
          isSaving={isSaving}
          newSubcategoryNames={newSubcategoryNames}
          onClose={onClose}
          removeCategory={removeCategory}
          removeSubcategory={removeSubcategory}
          renameCategory={renameCategory}
          renameSubcategory={renameSubcategory}
          setCategoryDrafts={setCategoryDrafts}
          setCategoryName={setCategoryName}
          setNewSubcategoryNames={setNewSubcategoryNames}
          setSubcategoryDrafts={setSubcategoryDrafts}
          subcategoryDrafts={subcategoryDrafts}
        />
      </motion.aside>

      <motion.aside
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 max-h-[94vh] overflow-y-auto rounded-t-md border-t border-neutral-300 bg-white p-4 shadow-xl sm:hidden"
      >
        <CategoryForm
          addCategory={addCategory}
          addSubcategory={addSubcategory}
          categories={categories}
          categoryDrafts={categoryDrafts}
          categoryName={categoryName}
          error={error}
          isSaving={isSaving}
          newSubcategoryNames={newSubcategoryNames}
          onClose={onClose}
          removeCategory={removeCategory}
          removeSubcategory={removeSubcategory}
          renameCategory={renameCategory}
          renameSubcategory={renameSubcategory}
          setCategoryDrafts={setCategoryDrafts}
          setCategoryName={setCategoryName}
          setNewSubcategoryNames={setNewSubcategoryNames}
          setSubcategoryDrafts={setSubcategoryDrafts}
          subcategoryDrafts={subcategoryDrafts}
        />
      </motion.aside>
    </motion.div>
  )
}

function CategoryForm({
  addCategory,
  addSubcategory,
  categories,
  categoryDrafts,
  categoryName,
  error,
  isSaving,
  newSubcategoryNames,
  onClose,
  removeCategory,
  removeSubcategory,
  renameCategory,
  renameSubcategory,
  setCategoryDrafts,
  setCategoryName,
  setNewSubcategoryNames,
  setSubcategoryDrafts,
  subcategoryDrafts,
}: {
  addCategory: (event: FormEvent<HTMLFormElement>) => void
  addSubcategory: (category: Category) => void
  categories: Category[]
  categoryDrafts: Record<number, string>
  categoryName: string
  error: boolean
  isSaving: boolean
  newSubcategoryNames: Record<number, string>
  onClose: () => void
  removeCategory: (category: Category) => void
  removeSubcategory: (subcategory: Subcategory) => void
  renameCategory: (category: Category) => void
  renameSubcategory: (subcategory: Subcategory) => void
  setCategoryDrafts: Dispatch<SetStateAction<Record<number, string>>>
  setCategoryName: Dispatch<SetStateAction<string>>
  setNewSubcategoryNames: Dispatch<SetStateAction<Record<number, string>>>
  setSubcategoryDrafts: Dispatch<SetStateAction<Record<number, string>>>
  subcategoryDrafts: Record<number, string>
}) {
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            Навігація меню
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
            Категорії та підкатегорії
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neutral-300"
          aria-label="Закрити"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={addCategory} className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          required
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          className="h-11 rounded-md border border-neutral-300 px-3 outline-none focus:border-neutral-950"
          placeholder="Нова категорія"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.95 }}
          disabled={isSaving}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:bg-neutral-400"
        >
          <Plus size={16} />
          Додати
        </motion.button>
      </form>

      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category.id} className="rounded-md border border-neutral-300 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-8 w-1 rounded-sm bg-neutral-950" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Категорія
                </p>
                <p className="text-lg font-bold leading-tight text-neutral-950">
                  {category.name}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={categoryDrafts[category.id] ?? category.name}
                onChange={(event) =>
                  setCategoryDrafts((current) => ({
                    ...current,
                    [category.id]: event.target.value,
                  }))
                }
                className="h-11 rounded-md border border-neutral-300 bg-neutral-50 px-3 text-base font-bold outline-none focus:border-neutral-950"
              />
              <button
                type="button"
                onClick={() => renameCategory(category)}
                className="h-10 rounded-md border border-neutral-300 px-3 text-sm font-semibold"
              >
                Зберегти
              </button>
              <button
                type="button"
                onClick={() => removeCategory(category)}
                className="h-10 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700"
              >
                Видалити
              </button>
            </div>

            <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Підкатегорії
              </p>
              {category.subcategories.map((subcategory) => (
                <div
                  key={subcategory.id}
                  className="grid gap-2 rounded-md border border-[#d8e7df] bg-[#f0f7f3] p-2 sm:grid-cols-[1fr_auto_auto]"
                >
                  <input
                    value={subcategoryDrafts[subcategory.id] ?? subcategory.name}
                    onChange={(event) =>
                      setSubcategoryDrafts((current) => ({
                        ...current,
                        [subcategory.id]: event.target.value,
                      }))
                    }
                    className="h-9 rounded-md border border-[#c8ded4] bg-white px-3 text-sm font-semibold outline-none focus:border-neutral-950"
                  />
                  <button
                    type="button"
                    onClick={() => renameSubcategory(subcategory)}
                    className="h-9 rounded-md border border-neutral-300 px-3 text-xs font-semibold"
                  >
                    Зберегти
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSubcategory(subcategory)}
                    className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700"
                  >
                    Прибрати
                  </button>
                </div>
              ))}

              <div className="grid gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={newSubcategoryNames[category.id] ?? ''}
                  onChange={(event) =>
                    setNewSubcategoryNames((current) => ({
                      ...current,
                      [category.id]: event.target.value,
                    }))
                  }
                  className="h-9 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-950"
                  placeholder="Нова підкатегорія"
                />
                <button
                  type="button"
                  onClick={() => addSubcategory(category)}
                  className="h-9 rounded-md bg-neutral-950 px-3 text-xs font-semibold text-white"
                >
                  Додати
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Не вийшло зберегти категорії. Перевір назву і спробуй ще раз.
        </p>
      )}
    </div>
  )
}

function DishDrawer({
  categories,
  dish,
  onClose,
  onSaved,
  token,
}: {
  categories: Category[]
  dish: Dish | null
  onClose: () => void
  onSaved: (message: string, dish: Dish) => void
  token: string
}) {
  const firstCategoryId = categories[0]?.id ?? 0
  const [payload, setPayload] = useState<DishPayload>(() =>
    dishToPayload(dish, firstCategoryId),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState(false)
  const photoEditorRef = useRef<PhotoEditorHandle>(null)
  const selectedCategory = categories.find((category) => category.id === payload.category_id)
  const isEditing = Boolean(dish)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFormError(false)

    try {
      let finalPayload = payload
      const croppedImage = await photoEditorRef.current?.getCroppedImage()

      if (croppedImage) {
        const uploaded = await uploadDishImage(token, croppedImage)
        finalPayload = { ...payload, image_url: uploaded.data.url }
      }

      if (dish) {
        const response = await updateDish(token, dish.id, finalPayload)
        onSaved('Страву оновлено', response.data)
      } else {
        const response = await createDish(token, finalPayload)
        onSaved('Страву додано', response.data)
      }
    } catch {
      setFormError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const update = <Key extends keyof DishPayload>(key: Key, value: DishPayload[Key]) => {
    setPayload({ ...payload, [key]: value })
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-neutral-950/35"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.aside
        initial={{ x: '100%', y: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: '100%', y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ml-auto hidden h-full w-full max-w-xl overflow-y-auto border-l border-neutral-300 bg-white p-5 shadow-xl sm:block"
      >
        <DishForm
          categories={categories}
          formError={formError}
          isEditing={isEditing}
          isSaving={isSaving}
          onClose={onClose}
          payload={payload}
          photoEditorRef={photoEditorRef}
          selectedCategory={selectedCategory}
          submit={submit}
          update={update}
        />
      </motion.aside>

      <motion.aside
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 max-h-[94vh] overflow-y-auto rounded-t-md border-t border-neutral-300 bg-white p-4 shadow-xl sm:hidden"
      >
        <DishForm
          categories={categories}
          formError={formError}
          isEditing={isEditing}
          isSaving={isSaving}
          onClose={onClose}
          payload={payload}
          photoEditorRef={photoEditorRef}
          selectedCategory={selectedCategory}
          submit={submit}
          update={update}
        />
      </motion.aside>
    </motion.div>
  )
}

function SettingsDrawer({
  company,
  onClose,
  onSaved,
  token,
}: {
  company: Company | null
  onClose: () => void
  onSaved: (company: Company) => void
  token: string
}) {
  const [payload, setPayload] = useState<CompanySettingsPayload>(() =>
    companyToSettingsPayload(company),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [formError, setFormError] = useState(false)

  const update = <Key extends keyof CompanySettingsPayload>(
    key: Key,
    value: CompanySettingsPayload[Key],
  ) => {
    setPayload({ ...payload, [key]: value })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setFormError(false)

    try {
      const response = await updateCompany(token, normalizeCompanySettings(payload))
      onSaved(response.data)
    } catch {
      setFormError(true)
    } finally {
      setIsSaving(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    setIsAvatarUploading(true)
    setFormError(false)

    try {
      const response = await uploadCompanyAvatar(token, file)
      update('avatar_url', response.data.url)
    } catch {
      setFormError(true)
    } finally {
      setIsAvatarUploading(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-neutral-950/35"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.aside
        initial={{ x: '100%', y: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: '100%', y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ml-auto hidden h-full w-full max-w-xl overflow-y-auto border-l border-neutral-300 bg-white p-5 shadow-xl sm:block"
      >
        <SettingsForm
          formError={formError}
          isAvatarUploading={isAvatarUploading}
          isSaving={isSaving}
          onClose={onClose}
          onAvatarUpload={uploadAvatar}
          payload={payload}
          submit={submit}
          update={update}
        />
      </motion.aside>

      <motion.aside
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 max-h-[94vh] overflow-y-auto rounded-t-md border-t border-neutral-300 bg-white p-4 shadow-xl sm:hidden"
      >
        <SettingsForm
          formError={formError}
          isAvatarUploading={isAvatarUploading}
          isSaving={isSaving}
          onClose={onClose}
          onAvatarUpload={uploadAvatar}
          payload={payload}
          submit={submit}
          update={update}
        />
      </motion.aside>
    </motion.div>
  )
}

function SettingsForm({
  formError,
  isAvatarUploading,
  isSaving,
  onAvatarUpload,
  onClose,
  payload,
  submit,
  update,
}: {
  formError: boolean
  isAvatarUploading: boolean
  isSaving: boolean
  onAvatarUpload: (file: File) => void
  onClose: () => void
  payload: CompanySettingsPayload
  submit: (event: FormEvent<HTMLFormElement>) => void
  update: <Key extends keyof CompanySettingsPayload>(
    key: Key,
    value: CompanySettingsPayload[Key],
  ) => void
}) {
  return (
    <form onSubmit={submit}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            Заклад
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
            Панель “три точки”
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-300"
          aria-label="Закрити"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-4 rounded-md border border-neutral-300 p-3">
        <p className="mb-2 text-sm font-semibold text-neutral-700">Фото закладу</p>
        <div className="flex items-center gap-3">
          <img
            src={payload.avatar_url || '/favicon.svg'}
            alt="Фото закладу"
            className="h-16 w-16 rounded-md object-cover"
          />
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-neutral-300 px-3 text-sm font-semibold">
            <Upload size={16} />
            {isAvatarUploading ? 'Завантажуємо' : 'Обрати фото'}
            <input
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  onAvatarUpload(file)
                }
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          label="WiFi назва"
          required={false}
          value={payload.wifi_name ?? ''}
          onChange={(value) => update('wifi_name', value)}
        />
        <TextInput
          label="WiFi пароль"
          required={false}
          value={payload.wifi_password ?? ''}
          onChange={(value) => update('wifi_password', value)}
        />
      </div>
      <WorkingHoursEditor
        value={payload.working_hours ?? null}
        onChange={(value) => update('working_hours', value)}
      />
      <AddressInput
        address={payload.address ?? ''}
        onAddress={(value) => update('address', value)}
        onMapsUrl={(value) => update('maps_url', value)}
        onPlace={(place) => {
          update('google_place_id', place.placeId)
          update('address_lat', place.lat)
          update('address_lng', place.lng)
        }}
      />
      <PhoneInput
        value={payload.phone ?? ''}
        onChange={(value) => update('phone', value)}
      />
      <TextInput
        label="Посилання на доставку"
        required={false}
        type="url"
        value={payload.delivery_url ?? ''}
        onChange={(value) => update('delivery_url', value)}
      />
      <TextInput
        label="Email для відгуків"
        required={false}
        type="email"
        value={payload.feedback_email ?? ''}
        onChange={(value) => update('feedback_email', value)}
      />
      <TextInput
        label="Telegram chat id"
        required={false}
        value={payload.telegram_chat_id ?? ''}
        onChange={(value) => update('telegram_chat_id', value)}
      />

      {formError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Не вдалося зберегти налаштування. Перевір URL або email.
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={{ scale: 0.95 }}
        disabled={isSaving}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:bg-neutral-400"
      >
        <Save size={17} />
        {isSaving ? 'Зберігаємо' : 'Зберегти дані закладу'}
      </motion.button>
    </form>
  )
}

function DishForm({
  categories,
  formError,
  isEditing,
  isSaving,
  onClose,
  payload,
  photoEditorRef,
  selectedCategory,
  submit,
  update,
}: {
  categories: Category[]
  formError: boolean
  isEditing: boolean
  isSaving: boolean
  onClose: () => void
  payload: DishPayload
  photoEditorRef: RefObject<PhotoEditorHandle>
  selectedCategory: Category | undefined
  submit: (event: FormEvent<HTMLFormElement>) => void
  update: <Key extends keyof DishPayload>(key: Key, value: DishPayload[Key]) => void
}) {
  return (
    <form onSubmit={submit}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            {isEditing ? 'Редагування' : 'Нова позиція'}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
            {isEditing ? 'Редагувати страву' : 'Додати страву'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-300"
          aria-label="Закрити"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <ImageCropper ref={photoEditorRef} currentUrl={payload.image_url} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Категорія</span>
          <select
            value={payload.category_id}
            onChange={(event) => {
              update('category_id', Number(event.target.value))
              update('subcategory_id', null)
            }}
            className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 outline-none focus:border-neutral-950"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Підкатегорія</span>
          <select
            value={payload.subcategory_id ?? ''}
            onChange={(event) =>
              update('subcategory_id', event.target.value ? Number(event.target.value) : null)
            }
            className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 outline-none focus:border-neutral-950"
          >
            <option value="">Без підкатегорії</option>
            {selectedCategory?.subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>
        </label>
        <TextInput label="Назва" value={payload.name} onChange={(value) => update('name', value)} />
        <TextInput
          label="Грамаж / обʼєм"
          required={false}
          value={payload.weight ?? ''}
          onChange={(value) => update('weight', value)}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Склад</span>
          <textarea
            value={payload.description}
            onChange={(event) => update('description', event.target.value)}
            className="min-h-24 w-full resize-none rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-950"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Ціна" value={payload.price} onChange={(value) => update('price', value)} />
          <NumberInput
            label="Сортування"
            value={payload.sort_order}
            onChange={(value) => update('sort_order', value)}
          />
        </div>
        <label className="flex items-center justify-between rounded-md border border-neutral-300 px-3 py-3">
          <span className="text-sm font-medium text-neutral-800">В наявності</span>
          <input
            checked={payload.is_available}
            onChange={(event) => update('is_available', event.target.checked)}
            className="h-5 w-5 accent-neutral-950"
            type="checkbox"
          />
        </label>
      </div>

      {formError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Не вдалося зберегти. Перевір дані або фото.
        </p>
      )}

      <motion.button
        type="submit"
        whileTap={{ scale: 0.95 }}
        disabled={isSaving || categories.length === 0}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:bg-neutral-400"
      >
        {isEditing ? <Save size={17} /> : <Plus size={17} />}
        {isSaving ? 'Зберігаємо' : isEditing ? 'Зберегти зміни' : 'Додати страву'}
      </motion.button>
    </form>
  )
}


function DeleteConfirmModal({
  dish,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  dish: AdminDish
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/35 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="w-full max-w-sm rounded-md border border-neutral-300 bg-white p-5 shadow-xl"
      >
        <h2 className="text-xl font-semibold">Видалити страву?</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {dish.name} зникне з меню і адмінки.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-md border border-neutral-300 bg-white text-sm font-semibold"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-10 rounded-md bg-red-700 text-sm font-semibold text-white disabled:bg-red-300"
          >
            {isDeleting ? 'Видаляємо' : 'Видалити'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function WorkingHoursEditor({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string | null
}) {
  const schedule = parseSchedule(value)

  const updateDay = (key: DayKey, next: Partial<DaySchedule[DayKey]>) => {
    onChange(JSON.stringify({
      ...schedule,
      [key]: {
        ...schedule[key],
        ...next,
      },
    }))
  }

  return (
    <section className="mb-3 rounded-md border border-neutral-300 p-3">
      <p className="mb-3 text-sm font-semibold text-neutral-700">Робочий час</p>
      <div className="grid gap-2">
        {weekDays.map(([key, label]) => {
          const day = schedule[key]

          return (
            <div
              key={key}
              className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_42px] items-center gap-1.5 sm:grid-cols-[34px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-2"
            >
              <span className="text-sm font-semibold text-neutral-600">{label}</span>
              <input
                type="time"
                value={day.open}
                disabled={day.closed}
                onChange={(event) => updateDay(key, { open: event.target.value })}
                className="h-10 min-w-0 rounded-md border border-neutral-300 px-1 text-xs disabled:bg-neutral-100 sm:px-2 sm:text-sm"
              />
              <input
                type="time"
                value={day.close}
                disabled={day.closed}
                onChange={(event) => updateDay(key, { close: event.target.value })}
                className="h-10 min-w-0 rounded-md border border-neutral-300 px-1 text-xs disabled:bg-neutral-100 sm:px-2 sm:text-sm"
              />
              <label className="flex h-10 min-w-0 items-center justify-center gap-1 rounded-md border border-neutral-300 px-1 text-[11px] font-semibold sm:px-2 sm:text-xs">
                <input
                  type="checkbox"
                  checked={day.closed}
                  onChange={(event) => updateDay(key, { closed: event.target.checked })}
                  className="accent-neutral-950"
                />
                вих.
              </label>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function AddressInput({
  address,
  onAddress,
  onMapsUrl,
  onPlace,
}: {
  address: string
  onAddress: (value: string) => void
  onMapsUrl: (value: string | null) => void
  onPlace: (place: { lat: string | null; lng: string | null; placeId: string | null }) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined

    if (!apiKey || !inputRef.current || window.google?.maps?.places) {
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  useEffect(() => {
    const input = inputRef.current
    const googlePlaces = window.google?.maps?.places

    if (!input || !googlePlaces) {
      return
    }

    const autocomplete = new googlePlaces.Autocomplete(input, {
      fields: ['formatted_address', 'geometry', 'place_id', 'url'],
    })
    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const formattedAddress = place.formatted_address ?? input.value
      const lat = place.geometry?.location?.lat()?.toString() ?? null
      const lng = place.geometry?.location?.lng()?.toString() ?? null

      onAddress(formattedAddress)
      onMapsUrl(
        place.url ??
          (formattedAddress
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}`
            : null),
      )
      onPlace({
        lat,
        lng,
        placeId: place.place_id ?? null,
      })
    })

    return () => listener.remove()
  }, [onAddress, onMapsUrl, onPlace])

  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">Адреса</span>
      <input
        ref={inputRef}
        value={address}
        onChange={(event) => {
          const nextAddress = event.target.value
          onAddress(nextAddress)
          onMapsUrl(
            nextAddress
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextAddress)}`
              : null,
          )
          onPlace({ lat: null, lng: null, placeId: null })
        }}
        className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        placeholder="Почни вводити адресу"
      />
      <span className="mt-1 block text-xs text-neutral-500">
        Google Places увімкнеться автоматично, якщо задано VITE_GOOGLE_PLACES_API_KEY.
      </span>
    </label>
  )
}

function PhoneInput({
  onChange,
  value,
}: {
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">Телефон</span>
      <input
        value={value}
        inputMode="tel"
        onChange={(event) => onChange(formatPhoneUa(event.target.value))}
        className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        placeholder="+380 (XX) XXX-XX-XX"
      />
    </label>
  )
}

function TextInput({
  autoComplete,
  label,
  name,
  onChange,
  required = true,
  type = 'text',
  value,
}: {
  autoComplete?: string
  label: string
  name?: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  value: string
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        required={required}
        autoComplete={autoComplete}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
      />
    </label>
  )
}

function NumberInput({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: number) => void
  value: number
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        required
        min={0}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none transition focus:border-neutral-950"
        type="number"
      />
    </label>
  )
}

function StatusBlock({ label }: { label: string }) {
  return (
    <div className="mb-4 rounded-md border border-neutral-300 bg-white px-3 py-3 text-sm font-medium text-neutral-700">
      {label}
    </div>
  )
}
