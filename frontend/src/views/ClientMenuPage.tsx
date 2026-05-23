import { forwardRef, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import {
  BookOpen,
  ChevronRight,
  Clock,
  Copy,
  Heart,
  MapPin,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Star,
  Trash2,
  Truck,
  Wifi,
  X,
} from 'lucide-react'
import { likeDish, sendGuestFeedback } from '../api'
import { DishPhoto } from '../components/DishPhoto'
import { readDeliveryCart, saveDeliveryCart } from '../deliveryCart'
import { subscribeRestaurantMenu } from '../menuRealtime'
import { readPublicMenuCache, savePublicMenuCache } from '../publicMenuCache'
import { navigateTo } from '../router'
import type {
  Category,
  Company,
  DeliveryCartItem,
  Dish,
  PublicMenu,
  Subcategory,
} from '../types'

const likedKey = 'digital-menu-liked-dishes'
const visitorKey = 'digital-menu-visitor-key'

type DrawerPanel = 'popular' | 'favorites' | 'menu'

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
type StoredSchedule = Partial<Record<DayKey, { closed?: boolean; open?: string; close?: string }>>

function getVisitorKey() {
  const existing = localStorage.getItem(visitorKey)

  if (existing) {
    return existing
  }

  const next = crypto.randomUUID()
  localStorage.setItem(visitorKey, next)
  return next
}

function getLikedDishes(): number[] {
  const raw = localStorage.getItem(likedKey)
  return raw ? (JSON.parse(raw) as number[]) : []
}

function saveLikedDishes(ids: number[]) {
  localStorage.setItem(likedKey, JSON.stringify(ids))
}

function formatPrice(price: string | number) {
  return `${Number(price).toLocaleString('uk-UA')} грн`
}

function isNew(createdAt: string) {
  const created = new Date(createdAt).getTime()
  return Date.now() - created < 7 * 24 * 60 * 60 * 1000
}

function mapsHref(company: Company) {
  if (company.maps_url) {
    return company.maps_url
  }

  if (company.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`
  }

  return '#'
}

function phoneHref(phone: string | null) {
  return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '#'
}

function formatWorkingHours(value: string | null) {
  if (!value) {
    return 'Графік не вказаний'
  }

  try {
    const schedule = JSON.parse(value) as StoredSchedule
    return weekDays
      .map(([key, label]) => {
        const day = schedule[key]

        if (!day) {
          return null
        }

        return day.closed ? `${label}: вихідний` : `${label}: ${day.open}-${day.close}`
      })
      .filter(Boolean)
      .join('\n')
  } catch {
    return value
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    return copied
  }
}

export function ClientMenuPage({ slug }: { slug: string }) {
  const [menu, setMenu] = useState<PublicMenu | null>(() => readPublicMenuCache(slug))
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(
    () => readPublicMenuCache(slug)?.categories[0]?.slug ?? null,
  )
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [isCheckOpen, setIsCheckOpen] = useState(false)
  const [isQuickFeedbackOpen, setIsQuickFeedbackOpen] = useState(false)
  const [drawerPanel, setDrawerPanel] = useState<DrawerPanel | null>(null)
  const [likes, setLikes] = useState<Record<number, number>>({})
  const [liked, setLiked] = useState<number[]>(getLikedDishes)
  const [cart, setCart] = useState<DeliveryCartItem[]>(() => readDeliveryCart(slug))

  useEffect(() => {
    const applyMenu = (nextMenu: PublicMenu) => {
      setError(null)
      setMenu(nextMenu)
      savePublicMenuCache(slug, nextMenu)
      setActiveCategory((current) => {
        if (current && nextMenu.categories.some((category) => category.slug === current)) {
          return current
        }

        return nextMenu.categories[0]?.slug ?? null
      })
      setLikes(
        Object.fromEntries(
          [
            ...nextMenu.categories.flatMap((category) => category.dishes),
            ...nextMenu.popular,
          ].map((dish) => [dish.id, dish.likes_count]),
        ),
      )
    }

    return subscribeRestaurantMenu(
      slug,
      applyMenu,
      (err: unknown) => {
        if (err instanceof Error && (err.message.includes('402') || err.message.includes('subscription_required'))) {
          setError('Тестовий період завершено. Будь ласка, оплатіть підписку.')
        } else if (!readPublicMenuCache(slug)) {
          setError('Меню тимчасово недоступне.')
        }
      },
    )
  }, [slug])

  useEffect(() => {
    saveDeliveryCart(slug, cart)
  }, [cart, slug])

  const activeCategoryData = menu?.categories.find(
    (category) => category.slug === activeCategory,
  )
  const subcategories = useMemo(
    () => activeCategoryData?.subcategories ?? [],
    [activeCategoryData?.subcategories],
  )
  const allDishes = useMemo(
    () => menu?.categories.flatMap((category) => category.dishes) ?? [],
    [menu?.categories],
  )
  const dishMap = useMemo(
    () => new Map(allDishes.map((dish) => [dish.id, dish])),
    [allDishes],
  )
  const cartRows = cart
    .map((item) => ({
      item,
      dish: dishMap.get(item.dish_id),
    }))
    .filter((row): row is { item: DeliveryCartItem; dish: Dish } => Boolean(row.dish))
  const cartCount = cartRows.reduce((sum, row) => sum + row.item.quantity, 0)
  const cartTotal = cartRows.reduce(
    (sum, row) => sum + Number(row.dish.price) * row.item.quantity,
    0,
  )

  const visibleDishes = useMemo(() => {
    if (!menu) {
      return []
    }

    const normalized = query.trim().toLowerCase()

    if (normalized) {
      return allDishes.filter((dish) =>
        [dish.name, dish.description ?? ''].join(' ').toLowerCase().includes(normalized),
      )
    }

    return (
      activeCategoryData?.dishes.filter((dish) => {
        if (!activeSubcategory) {
          return true
        }

        return (
          dish.subcategory_id ===
          subcategories.find((subcategory) => subcategory.slug === activeSubcategory)?.id
        )
      }) ?? []
    )
  }, [activeCategoryData?.dishes, activeSubcategory, allDishes, menu, query, subcategories])

  const handleLike = async (dish: Dish) => {
    if (liked.includes(dish.id)) {
      return
    }

    const nextLiked = [...liked, dish.id]
    setLiked(nextLiked)
    saveLikedDishes(nextLiked)
    setLikes((current) => ({
      ...current,
      [dish.id]: (current[dish.id] ?? dish.likes_count) + 1,
    }))

    const response = await likeDish(dish.id, getVisitorKey())
    setLikes((current) => ({
      ...current,
      [dish.id]: response.data.likes_count,
    }))
  }

  const handleAddToCheck = (dish: Dish) => {
    setCart((current) => {
      const existing = current.find((item) => item.dish_id === dish.id)

      if (existing) {
        return current.map((item) =>
          item.dish_id === dish.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...current, { dish_id: dish.id, quantity: 1 }]
    })
  }

  const handleCheckQuantity = (dishId: number, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.dish_id === dishId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  const handleDrawerMenuNavigate = (category: Category, subcategory: Subcategory | null) => {
    setQuery('')
    setActiveCategory(category.slug)
    setActiveSubcategory(subcategory?.slug ?? null)
    setIsInfoOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="max-w-sm rounded-md border border-neutral-300 bg-white p-5">
          <h1 className="text-2xl font-semibold">Меню закрито</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!menu) {
    return <div className="p-4 text-sm font-semibold text-neutral-500">Завантажуємо меню</div>
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f7f5f1] lg:grid lg:grid-cols-[260px_1fr]">
      <DesktopSidebar
        activeCategory={activeCategory}
        activeSubcategory={activeSubcategory}
        categories={menu.categories}
        company={menu.company}
        onCategory={(category) => {
          setActiveCategory(category.slug)
          setActiveSubcategory(null)
        }}
        onQuery={setQuery}
        onSubcategory={(subcategory) => setActiveSubcategory(subcategory?.slug ?? null)}
        query={query}
      />

      <section className="w-full min-w-0 overflow-x-hidden">
        <MobileHeader
          activeCategory={activeCategory}
          activeSubcategory={activeSubcategory}
          categories={menu.categories}
          company={menu.company}
          onCategory={(category) => {
            setActiveCategory(category.slug)
            setActiveSubcategory(null)
          }}
          onInfo={() => setIsInfoOpen(true)}
          onQuery={setQuery}
          onSubcategory={(subcategory) => setActiveSubcategory(subcategory?.slug ?? null)}
          query={query}
        />

        <div className="w-full max-w-full px-3 py-4 sm:px-5 lg:px-6">
          <div className="mb-4 hidden items-end justify-between border-b border-neutral-300 pb-3 lg:flex">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
                {activeCategoryData?.name}
              </p>
              <h1 className="text-3xl font-semibold">Меню</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold"
            >
              Інфо
            </button>
          </div>

          <motion.div layout className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visibleDishes.map((dish, index) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  isLiked={liked.includes(dish.id)}
                  likesCount={likes[dish.id] ?? dish.likes_count}
                  checkQuantity={cart.find((item) => item.dish_id === dish.id)?.quantity ?? 0}
                  onAddToCheck={() => handleAddToCheck(dish)}
                  onLike={() => handleLike(dish)}
                  order={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {isInfoOpen && (
          <InfoDrawer
            activePanel={drawerPanel}
            allDishes={allDishes}
            categories={menu.categories}
            company={menu.company}
            likedIds={liked}
            onClose={() => setIsInfoOpen(false)}
            onDelivery={() => {
              setIsInfoOpen(false)

              if (menu.company.delivery_url) {
                window.location.href = menu.company.delivery_url
              } else {
                navigateTo(`/r/${slug}/delivery`)
              }
            }}
            onFeedback={() => {
              setIsInfoOpen(false)
              setIsQuickFeedbackOpen(true)
            }}
            onOpenCheck={() => {
              setIsInfoOpen(false)
              setIsCheckOpen(true)
            }}
            onNavigate={handleDrawerMenuNavigate}
            onPanel={setDrawerPanel}
            popular={menu.popular}
          />
        )}
      </AnimatePresence>

      <CheckButton count={cartCount} onClick={() => setIsCheckOpen(true)} total={cartTotal} />

      <AnimatePresence>
        {isCheckOpen && (
          <CheckDrawer
            items={cartRows}
            onChangeQuantity={handleCheckQuantity}
            onClear={() => setCart([])}
            onClose={() => setIsCheckOpen(false)}
            onDelivery={() => navigateTo(`/r/${slug}/delivery`)}
            total={cartTotal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQuickFeedbackOpen && (
          <QuickFeedbackModal
            companyName={menu.company.name}
            onClose={() => setIsQuickFeedbackOpen(false)}
            slug={slug}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

type NavProps = {
  activeCategory: string | null
  activeSubcategory: string | null
  categories: Category[]
  company: Company
  onCategory: (category: Category) => void
  onQuery: (query: string) => void
  onSubcategory: (subcategory: Subcategory | null) => void
  query: string
}

function DesktopSidebar({
  activeCategory,
  activeSubcategory,
  categories,
  company,
  onCategory,
  onQuery,
  onSubcategory,
  query,
}: NavProps) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r border-neutral-300 bg-white p-4 lg:block">
      <div className="mb-5 flex items-center gap-3 border-b border-neutral-200 pb-4">
        <img
          src={company.avatar_url ?? '/favicon.svg'}
          alt={company.name}
          className="h-12 w-12 rounded-md object-cover"
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Menu
          </p>
          <h1 className="mt-1 truncate text-2xl font-semibold">{company.name}</h1>
        </div>
      </div>

      <label className="relative mb-4 block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          className="h-10 w-full rounded-md border border-neutral-300 pl-9 pr-3 text-sm outline-none focus:border-neutral-950"
          placeholder="Пошук"
        />
      </label>

      <nav className="space-y-2">
        {categories.map((category) => (
          <div key={category.slug}>
            <button
              type="button"
              onClick={() => onCategory(category)}
              className={`h-10 w-full rounded-md px-3 text-left text-sm font-semibold ${
                activeCategory === category.slug
                  ? 'bg-neutral-950 text-white'
                  : 'border border-neutral-300 bg-white'
              }`}
            >
              {category.name}
            </button>
            {activeCategory === category.slug && (
              <div className="ml-3 mt-2 space-y-1 border-l border-neutral-200 pl-2">
                <button
                  type="button"
                  onClick={() => onSubcategory(null)}
                  className={`block h-8 w-full rounded-md px-2 text-left text-xs font-semibold ${
                    !activeSubcategory ? 'bg-neutral-100 text-neutral-950' : 'text-neutral-500'
                  }`}
                >
                  Усі
                </button>
                {category.subcategories.map((subcategory) => (
                  <button
                    key={subcategory.slug}
                    type="button"
                    onClick={() => onSubcategory(subcategory)}
                    className={`block h-8 w-full rounded-md px-2 text-left text-xs font-semibold ${
                      activeSubcategory === subcategory.slug
                        ? 'bg-neutral-100 text-neutral-950'
                        : 'text-neutral-500'
                    }`}
                  >
                    {subcategory.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}

type MobileHeaderProps = NavProps & {
  onInfo: () => void
}

function MobileHeader({
  activeCategory,
  activeSubcategory,
  categories,
  company,
  onCategory,
  onInfo,
  onQuery,
  onSubcategory,
  query,
}: MobileHeaderProps) {
  const category = categories.find((item) => item.slug === activeCategory)

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/90 bg-[#f7f5f1]/95 px-3 py-3 backdrop-blur lg:hidden">
      <div className="mb-3 flex items-center gap-3">
        <img
          src={company.avatar_url ?? '/favicon.svg'}
          alt={company.name}
          className="h-11 w-11 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {company.venue_type}
          </p>
          <h1 className="truncate text-xl font-semibold">{company.name}</h1>
        </div>
        <button
          type="button"
          onClick={onInfo}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-300 bg-white"
          aria-label="Інформація про заклад"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      <label className="relative mb-3 block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          className="h-10 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-950"
          placeholder="Пошук"
        />
      </label>

      <LayoutGroup>
        <div className="mb-2 flex max-w-full gap-4 overflow-x-auto overscroll-x-contain border-b border-neutral-200 pb-1">
          {categories.map((item) => (
            <NavChip
              key={item.slug}
              active={activeCategory === item.slug}
              onClick={() => onCategory(item)}
            >
              {item.name}
            </NavChip>
          ))}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait">
        {category && category.subcategories.length > 0 && (
          <motion.div
            key={category.slug}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain"
          >
            <SubChip active={!activeSubcategory} onClick={() => onSubcategory(null)}>
              Усі
            </SubChip>
            {category.subcategories.map((subcategory) => (
              <SubChip
                key={subcategory.slug}
                active={activeSubcategory === subcategory.slug}
                onClick={() => onSubcategory(subcategory)}
              >
                {subcategory.name}
              </SubChip>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function NavChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative h-10 shrink-0 px-0 text-xl font-bold ${
        active ? 'text-neutral-950' : 'text-neutral-500'
      }`}
    >
      {active && (
        <motion.span
          layoutId="active-main-category"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

function SubChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative h-8 shrink-0 overflow-hidden rounded-md border px-3 text-xs font-semibold ${
        active
          ? 'border-[#c8ded4] bg-[#e9f3ee] text-neutral-950'
          : 'border-neutral-200 bg-white/70 text-neutral-500'
      }`}
    >
      {active && (
        <motion.span
          layoutId="active-subcategory"
          className="absolute inset-0 rounded-md border border-[#b9d5c8]"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

type DishCardProps = {
  checkQuantity: number
  dish: Dish
  isLiked: boolean
  likesCount: number
  onAddToCheck: () => void
  onLike: () => void
  order: number
}

const DishCard = forwardRef<HTMLElement, DishCardProps>(function DishCard({
  checkQuantity,
  dish,
  isLiked,
  likesCount,
  onAddToCheck,
  onLike,
  order,
}, ref) {
  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.23, delay: Math.min(order * 0.03, 0.12) }}
      className="grid w-full min-w-0 grid-cols-[112px_minmax(0,1fr)] gap-3 overflow-hidden rounded-md border border-neutral-200 bg-white p-2 shadow-sm sm:grid-cols-1 sm:gap-0 sm:p-0"
    >
      <DishPhoto alt={dish.name} src={dish.image_url} className="self-start sm:rounded-b-none" />
      <div className="flex min-w-0 flex-col p-1 sm:p-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-base font-semibold leading-snug">{dish.name}</h2>
          <p className="shrink-0 whitespace-nowrap text-sm font-semibold">{formatPrice(dish.price)}</p>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-500">
          {dish.description}
        </p>
        {dish.weight && (
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
            {dish.weight}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          {isNew(dish.created_at) ? (
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">
              новинка
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLike}
              className="flex items-center gap-1 text-sm font-semibold text-neutral-700"
              aria-label={`Лайк ${dish.name}`}
            >
              <motion.span
                animate={isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.15 }}
              >
                <Heart
                  size={18}
                  className={isLiked ? 'fill-red-600 text-red-600' : 'text-neutral-600'}
                />
              </motion.span>
              <motion.span
                key={likesCount}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                {likesCount}
              </motion.span>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onAddToCheck}
              className="relative flex h-10 w-10 items-center justify-center rounded-md bg-neutral-950 text-white"
              aria-label={`Додати ${dish.name} у чек`}
            >
              <Plus size={18} />
              {checkQuantity > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
                  {checkQuantity}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  )
})

function InfoDrawer({
  activePanel,
  allDishes,
  categories,
  company,
  likedIds,
  onClose,
  onDelivery,
  onFeedback,
  onOpenCheck,
  onNavigate,
  onPanel,
  popular,
}: {
  activePanel: DrawerPanel | null
  allDishes: Dish[]
  categories: Category[]
  company: Company
  likedIds: number[]
  onClose: () => void
  onDelivery: () => void
  onFeedback: () => void
  onOpenCheck: () => void
  onNavigate: (category: Category, subcategory: Subcategory | null) => void
  onPanel: (panel: DrawerPanel) => void
  popular: Dish[]
}) {
  const favoriteDishes = allDishes.filter((dish) => likedIds.includes(dish.id))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 bg-neutral-950/30 backdrop-blur-sm"
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ml-auto h-full w-[82vw] max-w-sm overflow-y-auto border-l border-neutral-300 bg-white shadow-xl"
      >
        <div className="border-b border-neutral-200 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Заклад
              </p>
              <h2 className="truncate text-2xl font-semibold">{company.name}</h2>
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

          <div className="grid grid-cols-3 gap-2">
            <DrawerTab
              active={activePanel === 'popular'}
              icon={<Star size={17} />}
              label="Популярні"
              onClick={() => onPanel('popular')}
            />
            <DrawerTab
              active={activePanel === 'favorites'}
              icon={<Heart size={17} />}
              label="Улюблені"
              onClick={() => onPanel('favorites')}
            />
            <DrawerTab
              active={activePanel === 'menu'}
              icon={<BookOpen size={17} />}
              label="Меню"
              onClick={() => onPanel('menu')}
            />
          </div>

          <div className="mt-3">
            <InfoPanel company={company} />
          </div>
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {activePanel === 'popular' && (
              <DishListPanel emptyText="Популярні страви ще набирають лайки." dishes={popular} />
            )}
            {activePanel === 'favorites' && (
              <DishListPanel emptyText="Ти ще не лайкнув жодної страви." dishes={favoriteDishes} />
            )}
            {activePanel === 'menu' && (
              <DrawerMenuPanel categories={categories} onNavigate={onNavigate} />
            )}
          </AnimatePresence>

          <div className="mt-5 grid gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onOpenCheck}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight"
            >
              <ReceiptText size={16} />
              Відкрити чек
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onDelivery}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-3 py-2 text-center text-sm font-semibold leading-tight text-white"
            >
              <Truck size={16} />
              Замовити доставку
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={onFeedback}
              className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-center text-sm font-semibold leading-tight"
            >
              <MessageSquare size={16} />
              Надіслати відгук
            </motion.button>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  )
}

function QuickFeedbackModal({
  companyName,
  onClose,
  slug,
}: {
  companyName: string
  onClose: () => void
  slug: string
}) {
  const [message, setMessage] = useState('')
  const [foodRating, setFoodRating] = useState(5)
  const [serviceRating, setServiceRating] = useState(5)
  const [atmosphereRating, setAtmosphereRating] = useState(5)
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim() || isSending) {
      return
    }

    setIsSending(true)
    await sendGuestFeedback(slug, {
      food_rating: foodRating,
      service_rating: serviceRating,
      atmosphere_rating: atmosphereRating,
      value_rating: 5,
      message: message.trim(),
    })
    setSent(true)
    window.setTimeout(onClose, 900)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] grid place-items-center bg-neutral-950/35 px-4 backdrop-blur-sm"
    >
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onSubmit={submitFeedback}
        className="w-full max-w-sm rounded-md border border-neutral-300 bg-white p-4 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              Відгук
            </p>
            <h2 className="truncate text-2xl font-semibold">{companyName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-300"
            aria-label="Закрити"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mb-3 grid gap-2">
          <RatingRow label="Кухня" value={foodRating} onChange={setFoodRating} />
          <RatingRow label="Сервіс" value={serviceRating} onChange={setServiceRating} />
          <RatingRow label="Атмосфера" value={atmosphereRating} onChange={setAtmosphereRating} />
        </div>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-32 w-full resize-none rounded-md border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-950"
          placeholder="Напиши, що сподобалось або що треба виправити"
        />

        <button
          type="submit"
          disabled={!message.trim() || isSending || sent}
          className="mt-3 h-11 w-full rounded-md bg-neutral-950 text-sm font-semibold text-white disabled:bg-neutral-400"
        >
          {sent ? 'Відправлено' : isSending ? 'Відправляємо' : 'Надіслати'}
        </button>
      </motion.form>
    </motion.div>
  )
}

function RatingRow({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: number) => void
  value: number
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="flex h-7 w-7 items-center justify-center"
            aria-label={`${label}: ${rating}`}
          >
            <Star
              size={17}
              className={rating <= value ? 'fill-amber-400 text-amber-500' : 'text-neutral-300'}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function CheckButton({
  count,
  onClick,
  total,
}: {
  count: number
  onClick: () => void
  total: number
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 flex h-12 items-center gap-3 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white shadow-xl"
    >
      <ReceiptText size={18} />
      <span>Чек</span>
      <span className="rounded-sm bg-white/15 px-2 py-1 text-xs">{count}</span>
      {total > 0 && <span className="hidden text-xs text-white/70 sm:inline">{formatPrice(total)}</span>}
    </motion.button>
  )
}

function CheckDrawer({
  items,
  onChangeQuantity,
  onClear,
  onClose,
  onDelivery,
  total,
}: {
  items: Array<{ item: DeliveryCartItem; dish: Dish }>
  onChangeQuantity: (dishId: number, delta: number) => void
  onClear: () => void
  onClose: () => void
  onDelivery: () => void
  total: number
}) {
  const hasItems = items.length > 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-50 bg-neutral-950/30 backdrop-blur-sm"
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="ml-auto hidden h-full w-full max-w-md overflow-y-auto border-l border-neutral-300 bg-white p-4 shadow-xl sm:block"
      >
        <CheckContent
          hasItems={hasItems}
          items={items}
          onChangeQuantity={onChangeQuantity}
          onClear={onClear}
          onClose={onClose}
          onDelivery={onDelivery}
          total={total}
        />
      </motion.aside>

      <motion.aside
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-md border-t border-neutral-300 bg-white p-4 shadow-xl sm:hidden"
      >
        <CheckContent
          hasItems={hasItems}
          items={items}
          onChangeQuantity={onChangeQuantity}
          onClear={onClear}
          onClose={onClose}
          onDelivery={onDelivery}
          total={total}
        />
      </motion.aside>
    </motion.div>
  )
}

function CheckContent({
  hasItems,
  items,
  onChangeQuantity,
  onClear,
  onClose,
  onDelivery,
  total,
}: {
  hasItems: boolean
  items: Array<{ item: DeliveryCartItem; dish: Dish }>
  onChangeQuantity: (dishId: number, delta: number) => void
  onClear: () => void
  onClose: () => void
  onDelivery: () => void
  total: number
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Для офіціанта
          </p>
          <h2 className="text-2xl font-semibold">Ваш чек</h2>
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

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map(({ dish, item }) => (
            <motion.div
              key={dish.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-md border border-neutral-300 p-3"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold">{dish.name}</p>
                  <p className="text-sm text-neutral-500">
                    {item.quantity} × {formatPrice(dish.price)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold">
                  {formatPrice(Number(dish.price) * item.quantity)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(dish.id, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300"
                    aria-label={`Зменшити ${dish.name}`}
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(dish.id, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300"
                    aria-label={`Додати ${dish.name}`}
                  >
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeQuantity(dish.id, -item.quantity)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700"
                  aria-label={`Прибрати ${dish.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!hasItems && (
          <p className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
            Чек поки пустий. Натискай плюс біля страв, які хочеш додати.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-md border border-neutral-300 p-3">
        <p className="text-sm text-neutral-500">Разом</p>
        <p className="text-3xl font-semibold">{formatPrice(total)}</p>
      </div>

      <div className="mt-4 grid gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onDelivery}
          disabled={!hasItems}
          className="flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 text-sm font-semibold text-white disabled:bg-neutral-400"
        >
          <Truck size={16} />
          Замовити додому
        </motion.button>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasItems}
          className="h-10 rounded-md border border-neutral-300 bg-white text-sm font-semibold disabled:text-neutral-300"
        >
          Очистити чек
        </button>
      </div>
    </div>
  )
}

function DrawerTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{ fontSize: 10 }}
      className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 text-[10px] font-semibold leading-none ${
        active
          ? 'border-neutral-950 bg-neutral-950 text-white'
          : 'border-neutral-300 bg-white text-neutral-700'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="max-w-full whitespace-nowrap text-center" style={{ fontSize: 10 }}>
        {label}
      </span>
    </motion.button>
  )
}

function InfoPanel({ company }: { company: Company }) {
  const [copied, setCopied] = useState(false)

  const copyPassword = async () => {
    const ok = await copyText(company.wifi_password ?? '')

    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    }
  }

  return (
    <motion.div
      key="info"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="space-y-3 text-sm"
    >
      <InfoLine icon={<Wifi size={17} />} title="WiFi">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold">
            {company.wifi_name ?? 'WiFi'} · {company.wifi_password ?? 'пароль'}
          </span>
          <button
            type="button"
            onClick={copyPassword}
            className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-2 text-xs font-semibold text-neutral-700"
          >
            {copied ? 'Скопійовано' : 'Пароль'}
            <Copy size={14} />
          </button>
        </div>
      </InfoLine>
      <InfoLine icon={<Clock size={17} />} title="Робочий час">
        <span className="whitespace-pre-line">{formatWorkingHours(company.working_hours)}</span>
      </InfoLine>
      <InfoLine icon={<MapPin size={17} />} title="Адреса">
        <a href={mapsHref(company)} rel="noreferrer">
          {company.address ?? 'Адреса не вказана'}
        </a>
      </InfoLine>
      <InfoLine icon={<Phone size={17} />} title="Телефон">
        <a href={phoneHref(company.phone)}>{company.phone ?? 'Телефон не вказаний'}</a>
      </InfoLine>
    </motion.div>
  )
}

function DishListPanel({ dishes, emptyText }: { dishes: Dish[]; emptyText: string }) {
  return (
    <motion.div
      key={emptyText}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      {dishes.length === 0 && (
        <p className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
          {emptyText}
        </p>
      )}
      {dishes.map((dish) => (
        <div
          key={dish.id}
          className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md border border-neutral-300 p-2"
        >
          <DishPhoto src={dish.image_url} alt={dish.name} className="w-16" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{dish.name}</p>
            <p className="text-xs text-neutral-500">{formatPrice(dish.price)}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-neutral-700">
            <Heart size={15} />
            {dish.likes_count}
          </span>
        </div>
      ))}
    </motion.div>
  )
}

function DrawerMenuPanel({
  categories,
  onNavigate,
}: {
  categories: Category[]
  onNavigate: (category: Category, subcategory: Subcategory | null) => void
}) {
  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      {categories.map((category) => (
        <div key={category.slug} className="rounded-md border border-neutral-300 p-3">
          <button
            type="button"
            onClick={() => onNavigate(category, null)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold"
          >
            {category.name}
            <ChevronRight size={16} />
          </button>
          {category.subcategories.length > 0 && (
            <div className="mt-2 grid gap-1 border-l border-neutral-200 pl-2">
              {category.subcategories.map((subcategory) => (
                <button
                  key={subcategory.slug}
                  type="button"
                  onClick={() => onNavigate(category, subcategory)}
                  className="h-8 rounded-md px-2 text-left text-xs font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
                >
                  {subcategory.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </motion.div>
  )
}

function InfoLine({
  children,
  icon,
  title,
}: {
  children: ReactNode
  icon: ReactNode
  title: string
}) {
  return (
    <div className="rounded-md border border-neutral-300 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        {icon}
        {title}
      </div>
      <div className="text-neutral-900">{children}</div>
    </div>
  )
}
