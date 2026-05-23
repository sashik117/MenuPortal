import { useEffect, useState } from 'react'
import type { FormEvent, MouseEvent as ReactMouseEvent } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Eye,
  EyeOff,
  Heart,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { registerOwner, sendContactMessage } from '../api'
import { navigateTo } from '../router'
import type { OwnerRegistrationPayload } from '../types'

const REGISTRATION_DRAFT_KEY = 'digital-menu-registration-draft'
const CONTACT_DRAFT_KEY = 'digital-menu-contact-draft'
const TOKEN_KEY = 'digital-menu-token'
const ADMIN_KEY = 'digital-menu-admin'
const COMPANY_KEY = 'digital-menu-company'

const venueTypes = [
  { value: 'cafe', label: 'Кавʼярня' },
  { value: 'restaurant', label: 'Ресторан' },
  { value: 'pub', label: 'Паб' },
  { value: 'sushi', label: 'Суші-бар' },
]

const plans = [
  ['1 місяць', 'Швидкий старт без довгих зобовʼязань'],
  ['6 місяців', 'Стабільна робота сезону'],
  ['1 рік', 'Найкраща ціна зі знижкою'],
]

const emptyRegistration: OwnerRegistrationPayload = {
  first_name: '',
  last_name: '',
  venue_name: '',
  venue_type: 'restaurant',
  email: '',
  password: '',
  start_mode: 'trial',
}

function getStoredDraft<T extends object>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)

  if (!raw) {
    return fallback
  }

  try {
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    localStorage.removeItem(key)
    return fallback
  }
}

export function LandingPage() {
  const [contactSent, setContactSent] = useState(false)
  const [registerStatus, setRegisterStatus] = useState<string | null>(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [contact, setContact] = useState(() => getStoredDraft(CONTACT_DRAFT_KEY, {
    name: '',
    email: '',
    message: '',
  }))
  const [registration, setRegistration] = useState<OwnerRegistrationPayload>(() =>
    getStoredDraft(REGISTRATION_DRAFT_KEY, emptyRegistration),
  )

  useEffect(() => {
    localStorage.setItem(REGISTRATION_DRAFT_KEY, JSON.stringify(registration))
  }, [registration])

  useEffect(() => {
    localStorage.setItem(CONTACT_DRAFT_KEY, JSON.stringify(contact))
  }, [contact])

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendContactMessage(contact)
    setContactSent(true)
    setContact({ name: '', email: '', message: '' })
  }

  const submitRegistration = async (
    event: FormEvent<HTMLFormElement> | ReactMouseEvent<HTMLButtonElement>,
    startMode: 'trial' | 'pay_now',
  ) => {
    event.preventDefault()
    setRegisterStatus('Створюємо кабінет')

    const response = await registerOwner({
      ...registration,
      start_mode: startMode,
    })

    localStorage.setItem(TOKEN_KEY, response.token)
    localStorage.setItem(ADMIN_KEY, JSON.stringify(response.admin))
    localStorage.setItem(COMPANY_KEY, JSON.stringify(response.company))
    setRegisterStatus('Готово')
    navigateTo(startMode === 'trial' ? '/admin' : response.next_url)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
      <header className="mb-8 flex items-center justify-between border-b border-neutral-300 pb-4">
        <button
          type="button"
          onClick={() => navigateTo('/')}
          className="flex items-center gap-3 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-950 text-white">
            <Building2 size={19} />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Digital Menu
            </span>
            <span className="block text-xl font-semibold leading-none">Portal</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo('/r/demo-bistro')}
            className="hidden h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold sm:block"
          >
            Демо меню
          </button>
          <button
            type="button"
            onClick={() => navigateTo('/admin')}
            className="h-10 rounded-md bg-neutral-950 px-3 text-sm font-semibold text-white"
          >
            Увійти
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="py-4 lg:py-10"
        >
          <p className="mb-4 inline-flex rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700">
            B2B платформа для ресторанів
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-neutral-950 sm:text-5xl">
            Цифрове меню за 5 хвилин для вашого закладу.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-neutral-600">
            Запускайте меню без друку QR-табличок заново: підкатегорії, лайки,
            новинки, стоп-лист і мобільна адмінка працюють одразу.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ['7 днів trial', Clock],
              ['Лайки гостей', Heart],
              ['Без зайвого UI', ShieldCheck],
            ].map(([label, Icon]) => (
              <div
                key={label as string}
                className="rounded-md border border-neutral-300 bg-white p-4"
              >
                <Icon className="mb-4 text-neutral-950" size={20} />
                <p className="text-sm font-semibold text-neutral-900">{label as string}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          onSubmit={(event) => submitRegistration(event, registration.start_mode)}
          className="rounded-md border border-neutral-300 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Реєстрація ресторатора
            </p>
            <h2 className="mt-1 text-2xl font-semibold">Створити заклад</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Імʼя"
              value={registration.first_name}
              onChange={(value) => setRegistration({ ...registration, first_name: value })}
            />
            <TextField
              label="Прізвище"
              value={registration.last_name}
              onChange={(value) => setRegistration({ ...registration, last_name: value })}
            />
          </div>

          <TextField
            label="Назва закладу"
            value={registration.venue_name}
            onChange={(value) => setRegistration({ ...registration, venue_name: value })}
          />

          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Категорія закладу
            </span>
            <select
              value={registration.venue_type}
              onChange={(event) =>
                setRegistration({ ...registration, venue_type: event.target.value })
              }
              className="h-11 w-full rounded-md border border-neutral-300 bg-white px-3 outline-none focus:border-neutral-950"
            >
              {venueTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <TextField
            autoComplete="email"
            label="Email"
            name="email"
            type="email"
            value={registration.email}
            onChange={(value) => setRegistration({ ...registration, email: value })}
          />
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Пароль</span>
            <span className="relative block">
              <input
                required
                autoComplete="new-password"
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                value={registration.password}
                onChange={(event) =>
                  setRegistration({ ...registration, password: event.target.value })
                }
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

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={(event) => submitRegistration(event, 'trial')}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white"
            >
              <Sparkles size={16} />
              Спробувати тиждень
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={(event) => submitRegistration(event, 'pay_now')}
              className="flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold"
            >
              Заплатити зараз
              <ArrowRight size={16} />
            </motion.button>
          </div>

          {registerStatus && (
            <p className="mt-3 text-sm font-medium text-neutral-500">{registerStatus}</p>
          )}
        </motion.form>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map(([title, text]) => (
          <div key={title} className="rounded-md border border-neutral-300 bg-white p-5">
            <Check className="mb-5 text-neutral-950" size={20} />
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-500">{text}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 rounded-md border border-neutral-300 bg-white p-4 sm:p-5 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Зворотний звʼязок
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Поговоримо про ваш заклад</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Форма зберігає заявку в Laravel і надсилає копію на пошту, якщо
            в `.env` задано `CONTACT_MAIL_TO` та SMTP.
          </p>
        </div>
        <form onSubmit={submitContact} className="grid gap-3">
          <TextField
            label="Імʼя"
            value={contact.name}
            onChange={(value) => setContact({ ...contact, name: value })}
          />
          <TextField
            label="Email"
            type="email"
            value={contact.email}
            onChange={(value) => setContact({ ...contact, email: value })}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">
              Повідомлення
            </span>
            <textarea
              required
              value={contact.message}
              onChange={(event) => setContact({ ...contact, message: event.target.value })}
              className="min-h-28 w-full resize-none rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-950"
            />
          </label>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white"
          >
            <Mail size={16} />
            Надіслати
          </motion.button>
          {contactSent && (
            <p className="text-sm font-medium text-neutral-500">Заявку прийнято.</p>
          )}
        </form>
      </section>
    </div>
  )
}

type TextFieldProps = {
  autoComplete?: string
  label: string
  name?: string
  onChange: (value: string) => void
  type?: string
  value: string
}

function TextField({
  autoComplete,
  label,
  name,
  onChange,
  type = 'text',
  value,
}: TextFieldProps) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        required
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
