import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { createDeliveryOrder } from '../api'
import {
  clearDeliveryCart,
  readDeliveryCart,
  saveDeliveryCart,
} from '../deliveryCart'
import { subscribeRestaurantMenu } from '../menuRealtime'
import { readPublicMenuCache, savePublicMenuCache } from '../publicMenuCache'
import { navigateTo } from '../router'
import type { DeliveryCartItem, Dish, PublicMenu } from '../types'

function formatPrice(price: string | number) {
  return `${Number(price).toLocaleString('uk-UA')} грн`
}

export function DeliveryPage({ slug }: { slug: string }) {
  const [menu, setMenu] = useState<PublicMenu | null>(() => readPublicMenuCache(slug))
  const [cart, setCart] = useState<DeliveryCartItem[]>(() => readDeliveryCart(slug))
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    address: '',
    comment: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentOrderId, setSentOrderId] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    return subscribeRestaurantMenu(slug, (nextMenu) => {
      setMenu(nextMenu)
      savePublicMenuCache(slug, nextMenu)
    })
  }, [slug])

  useEffect(() => {
    saveDeliveryCart(slug, cart)
  }, [cart, slug])

  const dishes = useMemo(
    () => menu?.categories.flatMap((category) => category.dishes) ?? [],
    [menu?.categories],
  )
  const dishMap = useMemo(
    () => new Map(dishes.map((dish) => [dish.id, dish])),
    [dishes],
  )
  const cartRows = cart
    .map((item) => ({
      item,
      dish: dishMap.get(item.dish_id),
    }))
    .filter((row): row is { item: DeliveryCartItem; dish: Dish } => Boolean(row.dish))
  const total = cartRows.reduce(
    (sum, row) => sum + Number(row.dish.price) * row.item.quantity,
    0,
  )

  const addDish = (dish: Dish) => {
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

  const changeQuantity = (dishId: number, delta: number) => {
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (cartRows.length === 0) {
      setError(true)
      return
    }

    setIsSubmitting(true)
    setError(false)

    try {
      const response = await createDeliveryOrder(slug, {
        ...form,
        comment: form.comment.trim() || undefined,
        items: cartRows.map((row) => row.item),
      })
      setSentOrderId(response.data.id)
      setCart([])
      clearDeliveryCart(slug)
    } catch {
      setError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!menu) {
    return <div className="p-4 text-sm font-semibold text-neutral-500">Завантажуємо доставку</div>
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-5 sm:px-6">
      <header className="mb-5 border-b border-neutral-300 pb-4">
        <button
          type="button"
          onClick={() => navigateTo(`/r/${slug}`)}
          className="mb-4 flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          До меню
        </button>
        <div className="grid gap-4 overflow-hidden rounded-md bg-neutral-950 p-4 text-white sm:p-5 md:grid-cols-[1fr_220px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
              {menu.company.name}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Замовлення додому</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
              Додай страви, залиш контакти і адресу. Замовлення прилетить закладу
              як нова заявка на доставку.
            </p>
          </div>
          <div className="rounded-md border border-white/15 p-3">
            <p className="text-sm text-white/60">Разом</p>
            <p className="mt-1 text-3xl font-semibold">{formatPrice(total)}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Додати страви</h2>
            <p className="text-sm font-semibold text-neutral-500">{dishes.length} позицій</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {dishes.map((dish, index) => (
              <motion.article
                key={dish.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.12) }}
                className="grid grid-cols-[82px_1fr] gap-3 rounded-md border border-neutral-300 bg-white p-2"
              >
                <img
                  src={dish.image_url ?? '/favicon.svg'}
                  alt={dish.name}
                  className="h-24 w-full rounded-md object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug">{dish.name}</h3>
                    <p className="shrink-0 text-sm font-semibold">{formatPrice(dish.price)}</p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-neutral-500">
                    {dish.description}
                  </p>
                  {dish.weight && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {dish.weight}
                    </p>
                  )}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addDish(dish)}
                    className="mt-3 flex h-9 items-center gap-2 rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white"
                  >
                    <Plus size={15} />
                    Додати
                  </motion.button>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-md border border-neutral-300 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag size={18} />
            <h2 className="text-xl font-semibold">Кошик</h2>
          </div>

          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {cartRows.map(({ dish, item }) => (
                <motion.div
                  key={dish.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">{dish.name}</p>
                      <p className="text-sm text-neutral-500">
                        {formatPrice(Number(dish.price) * item.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => changeQuantity(dish.id, -item.quantity)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700"
                      aria-label={`Прибрати ${dish.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeQuantity(dish.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300"
                    >
                      <Minus size={15} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQuantity(dish.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {cartRows.length === 0 && (
              <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-500">
                Кошик пустий. Додай страви з меню зліва.
              </p>
            )}
          </div>

          <form onSubmit={submit} className="mt-4 grid gap-3">
            <TextField
              label="Імʼя"
              value={form.customer_name}
              onChange={(value) => setForm({ ...form, customer_name: value })}
            />
            <TextField
              label="Телефон"
              value={form.phone}
              onChange={(value) => setForm({ ...form, phone: value })}
            />
            <TextField
              label="Адреса доставки"
              value={form.address}
              onChange={(value) => setForm({ ...form, address: value })}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">Коментар</span>
              <textarea
                value={form.comment}
                onChange={(event) => setForm({ ...form, comment: event.target.value })}
                className="min-h-24 w-full resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-950"
              />
            </label>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Не вдалося оформити замовлення. Перевір кошик і контакти.
              </p>
            )}
            {sentOrderId && (
              <p className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                <Check size={16} />
                Замовлення #{sentOrderId} прийнято.
              </p>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              disabled={isSubmitting}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:bg-neutral-400"
            >
              <ShoppingBag size={16} />
              {isSubmitting ? 'Оформлюємо' : 'Замовити додому'}
            </motion.button>
          </form>
        </aside>
      </div>
    </div>
  )
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none focus:border-neutral-950"
      />
    </label>
  )
}
