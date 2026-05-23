import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Calendar, CreditCard, Loader2, Repeat } from 'lucide-react'
import { ApiError, createSubscriptionPayment } from '../api'
import { navigateTo } from '../router'
import type { PaymentPlanCode } from '../types'

const TOKEN_KEY = 'digital-menu-token'

type Plan = {
  code: PaymentPlanCode
  title: string
  price: string
  text: string
  icon: 'calendar' | 'repeat'
}

const plans: Plan[] = [
  {
    code: 'month',
    title: '1 місяць',
    price: '390 грн',
    text: 'Швидкий старт без довгих зобовʼязань.',
    icon: 'calendar',
  },
  {
    code: 'six_months',
    title: '6 місяців',
    price: '1990 грн',
    text: 'Для стабільної роботи сезону зі знижкою.',
    icon: 'calendar',
  },
  {
    code: 'year',
    title: '1 рік',
    price: '3490 грн',
    text: 'Найвигідніший план для закладу, який вже працює.',
    icon: 'calendar',
  },
  {
    code: 'auto_monthly',
    title: 'Автосписання',
    price: '390 грн/міс',
    text: 'Поки створюємо як місячний рахунок; токенізацію картки ввімкнемо після дозволу Monobank.',
    icon: 'repeat',
  },
]

export function PlansPage({ companySlug }: { companySlug: string | null }) {
  const [pendingPlan, setPendingPlan] = useState<PaymentPlanCode | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startPayment = async (plan: PaymentPlanCode) => {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
      navigateTo('/admin')
      return
    }

    setPendingPlan(plan)
    setError(null)

    try {
      const response = await createSubscriptionPayment(token, plan)

      if (!response.data.checkout_url) {
        throw new Error('Monobank не повернув посилання на оплату.')
      }

      window.location.assign(response.data.checkout_url)
    } catch (caughtError) {
      setError(formatPaymentError(caughtError))
      setPendingPlan(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={() => navigateTo('/')}
        className="mb-6 flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold"
      >
        <ArrowLeft size={16} />
        На головну
      </button>

      <section className="mb-6 border-b border-neutral-300 pb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Оплата
        </p>
        <h1 className="mt-2 text-4xl font-semibold">Оберіть план</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
          {companySlug ? `Заклад: ${companySlug}. ` : ''}
          Після кліку Laravel створить рахунок Monobank і одразу відкриє захищену сторінку оплати.
        </p>
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan, index) => {
          const isPending = pendingPlan === plan.code
          const Icon = plan.icon === 'repeat' ? Repeat : Calendar

          return (
            <motion.article
              key={plan.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.04 }}
              className="rounded-md border border-neutral-300 bg-white p-5"
            >
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-md bg-neutral-950 text-white">
                <Icon size={18} />
              </div>
              <h2 className="text-2xl font-semibold">{plan.title}</h2>
              <p className="mt-1 text-lg font-semibold text-neutral-500">{plan.price}</p>
              <p className="mt-3 min-h-[48px] text-sm leading-6 text-neutral-500">{plan.text}</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={pendingPlan !== null}
                onClick={() => void startPayment(plan.code)}
                className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:bg-neutral-500"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />}
                {isPending ? 'Створюю рахунок' : 'Перейти до оплати'}
              </motion.button>
            </motion.article>
          )
        })}
      </div>
    </div>
  )
}

function formatPaymentError(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const payload = JSON.parse(error.message) as { message?: string }

      if (payload.message) {
        return payload.message === 'MONOBANK_TOKEN is not configured.'
          ? 'Додайте MONOBANK_TOKEN у backend/.env і перезапустіть API.'
          : payload.message
      }
    } catch {
      return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Не вдалося створити оплату. Перевірте ключі Monobank.'
}
