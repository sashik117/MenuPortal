import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, MessageSquare, Star } from 'lucide-react'
import { sendGuestFeedback } from '../api'
import { subscribeRestaurantMenu } from '../menuRealtime'
import { readPublicMenuCache, savePublicMenuCache } from '../publicMenuCache'
import { navigateTo } from '../router'
import type { PublicMenu } from '../types'

const ratingFields = [
  { key: 'food_rating', label: 'Кухня' },
  { key: 'service_rating', label: 'Обслуговування' },
  { key: 'atmosphere_rating', label: 'Атмосфера' },
  { key: 'value_rating', label: 'Ціна / враження' },
] as const

type RatingKey = (typeof ratingFields)[number]['key']

export function FeedbackPage({ slug }: { slug: string }) {
  const [menu, setMenu] = useState<PublicMenu | null>(() => readPublicMenuCache(slug))
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    food_rating: 5,
    service_rating: 5,
    atmosphere_rating: 5,
    value_rating: 5,
  })
  const [form, setForm] = useState({
    guest_name: '',
    guest_contact: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    return subscribeRestaurantMenu(slug, (nextMenu) => {
      setMenu(nextMenu)
      savePublicMenuCache(slug, nextMenu)
    })
  }, [slug])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(false)

    try {
      await sendGuestFeedback(slug, {
        ...ratings,
        guest_name: form.guest_name.trim() || undefined,
        guest_contact: form.guest_contact.trim() || undefined,
        message: form.message,
      })
      setSent(true)
      setForm({ guest_name: '', guest_contact: '', message: '' })
    } catch {
      setError(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!menu) {
    return <div className="p-4 text-sm font-semibold text-neutral-500">Завантажуємо відгук</div>
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-5 sm:px-6">
      <button
        type="button"
        onClick={() => navigateTo(`/r/${slug}`)}
        className="mb-5 flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold"
      >
        <ArrowLeft size={16} />
        До меню
      </button>

      <section className="overflow-hidden rounded-md border border-neutral-300 bg-white">
        <div className="bg-neutral-950 p-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">
            {menu.company.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Відгук про візит</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Оціни кухню, сервіс і атмосферу. Власник побачить це в системі й зможе
            швидко відреагувати.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {ratingFields.map((field) => (
              <RatingRow
                key={field.key}
                label={field.label}
                value={ratings[field.key]}
                onChange={(value) => setRatings({ ...ratings, [field.key]: value })}
              />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Імʼя"
              required={false}
              value={form.guest_name}
              onChange={(value) => setForm({ ...form, guest_name: value })}
            />
            <TextField
              label="Контакт"
              required={false}
              value={form.guest_contact}
              onChange={(value) => setForm({ ...form, guest_contact: value })}
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Що сподобалось або що варто покращити?
            </span>
            <textarea
              required
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="min-h-36 w-full resize-none rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-950"
            />
          </label>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Не вдалося надіслати відгук. Перевір повідомлення і спробуй ще раз.
            </p>
          )}
          {sent && (
            <p className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              <Check size={16} />
              Дякуємо, відгук надіслано.
            </p>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={isSubmitting}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:bg-neutral-400"
          >
            <MessageSquare size={16} />
            {isSubmitting ? 'Надсилаємо' : 'Надіслати відгук'}
          </motion.button>
        </form>
      </section>
    </div>
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
    <div className="rounded-md border border-neutral-300 p-3">
      <p className="mb-2 text-sm font-semibold text-neutral-800">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => onChange(star)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200"
            aria-label={`${label}: ${star}`}
          >
            <Star
              size={18}
              className={star <= value ? 'fill-yellow-500 text-yellow-500' : 'text-neutral-300'}
            />
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function TextField({
  label,
  onChange,
  required = true,
  value,
}: {
  label: string
  onChange: (value: string) => void
  required?: boolean
  value: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-neutral-300 px-3 outline-none focus:border-neutral-950"
      />
    </label>
  )
}
