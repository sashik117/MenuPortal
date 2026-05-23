import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Language = 'uk' | 'en'

const LANGUAGE_KEY = 'digital-menu-language'
const translatableAttributes = ['placeholder', 'aria-label', 'title'] as const

const enTranslations: Record<string, string> = {
  'Digital Menu': 'Digital Menu',
  Portal: 'Portal',
  'Демо меню': 'Demo menu',
  'Увійти': 'Sign in',
  'B2B платформа для ресторанів': 'B2B platform for restaurants',
  'Цифрове меню за 5 хвилин для вашого закладу.': 'Digital menu in 5 minutes for your venue.',
  'Запускайте меню без друку QR-табличок заново:': 'Launch a menu without reprinting QR signs:',
  'підкатегорії, лайки,': 'subcategories, likes,',
  'новинки, стоп-лист і мобільна адмінка працюють одразу.': 'new items, stop-list, and mobile admin work instantly.',
  '7 днів trial': '7-day trial',
  'Лайки гостей': 'Guest likes',
  'Без зайвого UI': 'Clean UI',
  'Реєстрація ресторатора': 'Restaurant owner registration',
  'Створити заклад': 'Create venue',
  'Імʼя': 'First name',
  "Ім'я": 'First name',
  'Прізвище': 'Last name',
  'Назва закладу': 'Venue name',
  'Категорія закладу': 'Venue category',
  'Кавʼярня': 'Coffee shop',
  'Ресторан': 'Restaurant',
  'Паб': 'Pub',
  'Суші-бар': 'Sushi bar',
  'Пароль': 'Password',
  'Сховати пароль': 'Hide password',
  'Показати пароль': 'Show password',
  'Спробувати тиждень': 'Try one week',
  'Заплатити зараз': 'Pay now',
  'Створюємо кабінет': 'Creating account',
  'Готово': 'Done',
  'Зворотний звʼязок': 'Contact',
  'Поговоримо про ваш заклад': 'Let’s talk about your venue',
  'Форма зберігає заявку в Laravel і надсилає копію на пошту, якщо': 'The form saves the lead in Laravel and sends an email copy when',
  'в `.env` задано `CONTACT_MAIL_TO` та SMTP.': '`CONTACT_MAIL_TO` and SMTP are configured in `.env`.',
  'Повідомлення': 'Message',
  'Надіслати': 'Send',
  'Заявку прийнято.': 'Request received.',
  '1 місяць': '1 month',
  '6 місяців': '6 months',
  '1 рік': '1 year',
  'Швидкий старт без довгих зобовʼязань': 'Fast launch with no long commitment',
  'Стабільна робота сезону': 'Stable seasonal operation',
  'Найкраща ціна зі знижкою': 'Best discounted price',

  'Керуйте меню без зайвого шуму': 'Manage the menu without noise',
  'Страви, фото, стоп-лист, підкатегорії та лайки гостей в одному кабінеті.': 'Dishes, photos, stop-list, subcategories, and guest likes in one dashboard.',
  'Вхід': 'Sign in',
  'На головну': 'Home',
  'Логін або email': 'Login or email',
  'Перевір логін або пароль.': 'Check login or password.',
  'Перевіряємо': 'Checking',
  'Адмін платформи': 'Platform admin',
  'Вийти': 'Log out',
  'Ресторани': 'Restaurants',
  'Активні': 'Active',
  'Забанені': 'Banned',
  'Завантажуємо ресторани': 'Loading restaurants',
  'Власник:': 'Owner:',
  'страв:': 'dishes:',
  'користувачів:': 'users:',
  'email не вказаний': 'email not provided',
  'Trial до:': 'Trial until:',
  'Підписка до:': 'Subscription until:',
  'немає': 'none',
  '+1 місяць': '+1 month',
  '+1 рік': '+1 year',
  'Актив': 'Active',
  'Активний': 'Active',
  'Очікує оплату': 'Awaiting payment',
  'Бан': 'Ban',
  'Скасований': 'Canceled',
  'Статус оновлено': 'Status updated',
  'Підписку видано на': 'Subscription granted for',
  'міс.': 'mo.',
  'Ресторан видалено': 'Restaurant deleted',
  'Ресторан оновлено': 'Restaurant updated',
  'Редагувати': 'Edit',
  'Меню': 'Menu',
  'Видалити': 'Delete',
  'Редагування ресторану': 'Edit restaurant',
  'Назва ресторану': 'Restaurant name',
  'Тип закладу': 'Venue type',
  "Ім'я власника": 'Owner first name',
  'Прізвище власника': 'Owner last name',
  'Статус': 'Status',
  'Підписка до': 'Subscription until',
  'WiFi назва': 'WiFi name',
  'WiFi пароль': 'WiFi password',
  'Посилання на доставку': 'Delivery link',
  'Email для відгуків': 'Feedback email',
  'Не вдалося зберегти. Перевір URL, email або обов\'язкові поля.': 'Could not save. Check URL, email, or required fields.',
  'Зберігаємо': 'Saving',
  'Зберегти ресторан': 'Save restaurant',
  'Панель керування': 'Dashboard',
  'Дії': 'Actions',
  'Додати страву': 'Add dish',
  'Заклад': 'Venue',
  'Категорії': 'Categories',
  'Відкрити меню': 'Open menu',
  'Оновлюємо список': 'Refreshing list',
  'Не вийшло завантажити API': 'Could not load API',
  'Наявність': 'Availability',
  'Склад не вказаний': 'Ingredients not provided',
  'Страв ще нема. Відкрий “Дії” і додай першу позицію.': 'No dishes yet. Open “Actions” and add the first item.',
  'Дані закладу оновлено': 'Venue details updated',
  'Наявність оновлено': 'Availability updated',
  'Не вийшло оновити наявність': 'Could not update availability',
  'Страву видалено': 'Dish deleted',
  'Не вийшло видалити страву': 'Could not delete dish',
  'Перемкнути': 'Toggle',
  'Є в меню': 'In menu',
  'Приховано': 'Hidden',
  'Навігація меню': 'Menu navigation',
  'Категорії та підкатегорії': 'Categories and subcategories',
  'Нова категорія': 'New category',
  'Додати': 'Add',
  'Категорія': 'Category',
  'Зберегти': 'Save',
  'Підкатегорії': 'Subcategories',
  'Підкатегорія': 'Subcategory',
  'Прибрати': 'Remove',
  'Зменшити': 'Decrease',
  'Нова підкатегорія': 'New subcategory',
  'Не вийшло зберегти категорії. Перевір назву і спробуй ще раз.': 'Could not save categories. Check the name and try again.',
  'Страву оновлено': 'Dish updated',
  'Страву додано': 'Dish added',
  'Панель “три точки”': 'Three-dot panel',
  'Фото закладу': 'Venue photo',
  'Обрати фото': 'Choose photo',
  'Завантажуємо': 'Uploading',
  'Не вдалося зберегти налаштування. Перевір URL або email.': 'Could not save settings. Check URL or email.',
  'Зберегти дані закладу': 'Save venue details',
  'Редагування': 'Editing',
  'Нова позиція': 'New item',
  'Редагувати страву': 'Edit dish',
  'Закрити': 'Close',
  'Без підкатегорії': 'No subcategory',
  'Назва': 'Name',
  'Грамаж / обʼєм': 'Weight / volume',
  'Склад': 'Ingredients',
  'Ціна': 'Price',
  'Сортування': 'Sort order',
  'В наявності': 'Available',
  'Не вдалося зберегти. Перевір дані або фото.': 'Could not save. Check the data or photo.',
  'Зберегти зміни': 'Save changes',
  'Видалити страву?': 'Delete dish?',
  'зникне з меню і адмінки.': 'will disappear from the menu and admin panel.',
  'Скасувати': 'Cancel',
  'Видаляємо': 'Deleting',
  'Робочий час': 'Working hours',
  'вих.': 'closed',
  'Адреса': 'Address',
  'Почни вводити адресу': 'Start typing an address',
  'Google Places увімкнеться автоматично, якщо задано VITE_GOOGLE_PLACES_API_KEY.': 'Google Places turns on automatically when VITE_GOOGLE_PLACES_API_KEY is set.',
  'Телефон': 'Phone',

  'Меню закрито': 'Menu closed',
  'Тестовий період завершено. Будь ласка, оплатіть підписку.': 'The trial period is over. Please pay for a subscription.',
  'Меню тимчасово недоступне.': 'The menu is temporarily unavailable.',
  'Завантажуємо меню': 'Loading menu',
  'Інфо': 'Info',
  'Пошук': 'Search',
  'Усі': 'All',
  'новинка': 'new',
  'Лайк': 'Like',
  'у чек': 'to check',
  'Інформація про заклад': 'Venue information',
  'Популярні': 'Popular',
  'Улюблені': 'Favorites',
  'Популярні страви ще набирають лайки.': 'Popular dishes are still collecting likes.',
  'Ти ще не лайкнув жодної страви.': 'You have not liked any dishes yet.',
  'Відкрити чек': 'Open check',
  'Замовити доставку': 'Order delivery',
  'Надіслати відгук': 'Send feedback',
  'Відгук': 'Feedback',
  'Кухня': 'Food',
  'Сервіс': 'Service',
  'Атмосфера': 'Atmosphere',
  'Напиши, що сподобалось або що треба виправити': 'Write what you liked or what should be improved',
  'Відправлено': 'Sent',
  'Відправляємо': 'Sending',
  'Чек': 'Check',
  'Для офіціанта': 'For waiter',
  'Ваш чек': 'Your check',
  'Чек поки пустий. Натискай плюс біля страв, які хочеш додати.': 'The check is empty. Tap plus next to dishes you want to add.',
  'Разом': 'Total',
  'Замовити додому': 'Order home delivery',
  'Очистити чек': 'Clear check',
  'пароль': 'password',
  'Скопійовано': 'Copied',
  'Адреса не вказана': 'Address not provided',
  'Телефон не вказаний': 'Phone not provided',
  'Графік не вказаний': 'Hours not provided',
  'вихідний': 'closed',

  'Завантажуємо доставку': 'Loading delivery',
  'До меню': 'Back to menu',
  'Замовлення додому': 'Home delivery order',
  'Додай страви, залиш контакти і адресу. Замовлення прилетить закладу': 'Add dishes, leave contacts and address. The order will arrive to the venue',
  'як нова заявка на доставку.': 'as a new delivery request.',
  'Додати страви': 'Add dishes',
  'позицій': 'items',
  'Кошик': 'Cart',
  'Кошик пустий. Додай страви з меню зліва.': 'Cart is empty. Add dishes from the menu on the left.',
  'Адреса доставки': 'Delivery address',
  'Коментар': 'Comment',
  'Не вдалося оформити замовлення. Перевір кошик і контакти.': 'Could not place the order. Check the cart and contacts.',
  'Замовлення #': 'Order #',
  'прийнято.': 'accepted.',
  'Оформлюємо': 'Placing order',

  'Обслуговування': 'Service',
  'Ціна / враження': 'Value / experience',
  'Завантажуємо відгук': 'Loading feedback',
  'Відгук про візит': 'Visit feedback',
  'Оціни кухню, сервіс і атмосферу. Власник побачить це в системі й зможе': 'Rate food, service, and atmosphere. The owner will see it in the system and can',
  'швидко відреагувати.': 'respond quickly.',
  'Контакт': 'Contact',
  'Що сподобалось або що варто покращити?': 'What did you like or what should be improved?',
  'Не вдалося надіслати відгук. Перевір повідомлення і спробуй ще раз.': 'Could not send feedback. Check the message and try again.',
  'Дякуємо, відгук надіслано.': 'Thank you, feedback sent.',
  'Надсилаємо': 'Sending',

  'Оплата': 'Payment',
  'Оберіть план': 'Choose a plan',
  'Заклад:': 'Venue:',
  'Після кліку Laravel створить рахунок Monobank і одразу відкриє захищену сторінку оплати.': 'After click, Laravel creates a Monobank invoice and opens the secure payment page.',
  'Перейти до оплати': 'Continue to payment',
  'Створюю рахунок': 'Creating invoice',
  'Автосписання': 'Auto-renewal',
  '390 грн': '390 UAH',
  '1990 грн': '1990 UAH',
  '3490 грн': '3490 UAH',
  '390 грн/міс': '390 UAH/mo',
  'Швидкий старт без довгих зобовʼязань.': 'Fast launch with no long commitment.',
  'Для стабільної роботи сезону зі знижкою.': 'For stable seasonal work with a discount.',
  'Найвигідніший план для закладу, який вже працює.': 'The best-value plan for an active venue.',
  'Поки створюємо як місячний рахунок; токенізацію картки ввімкнемо після дозволу Monobank.': 'For now this creates a monthly invoice; card tokenization can be enabled after Monobank approval.',
  'Monobank не повернув посилання на оплату.': 'Monobank did not return a checkout link.',
  'Додайте MONOBANK_TOKEN у backend/.env і перезапустіть API.': 'Add MONOBANK_TOKEN to backend/.env and restart the API.',
  'Не вдалося створити оплату. Перевірте ключі Monobank.': 'Could not create payment. Check Monobank keys.',

  'Обери фото страви': 'Choose dish photo',
  'Тягни фото, крути колесо або pinch': 'Drag the photo, use mouse wheel, or pinch',
  'Завантажити фото': 'Upload photo',
  'Центр': 'Center',

  'Пн': 'Mon',
  'Вт': 'Tue',
  'Ср': 'Wed',
  'Чт': 'Thu',
  'Пт': 'Fri',
  'Сб': 'Sat',
  'Нд': 'Sun',
  'грн': 'UAH',
}

const entries = Object.entries(enTranslations).sort(
  ([left], [right]) => right.length - left.length,
)

const originalText = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Partial<Record<(typeof translatableAttributes)[number], string>>>()

let activeLanguage: Language = 'uk'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY)
  return stored === 'en' ? 'en' : 'uk'
}

function translateUiText(value: string, language: Language = activeLanguage) {
  if (language === 'uk' || !value.trim()) {
    return value
  }

  return entries.reduce(
    (text, [source, target]) => text.replaceAll(source, target),
    value,
  )
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage)

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      localStorage.setItem(LANGUAGE_KEY, nextLanguage)
      setLanguageState(nextLanguage)
    },
  }), [language])

  useEffect(() => {
    activeLanguage = language
    document.documentElement.lang = language
    document.documentElement.dataset.language = language

    let isApplying = false

    const applyTranslations = () => {
      const root = document.getElementById('root')

      if (!root || isApplying) {
        return
      }

      isApplying = true
      translateTree(root, language)
      isApplying = false
    }

    applyTranslations()

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyTranslations)
    })

    const root = document.getElementById('root')

    if (root) {
      observer.observe(root, {
        attributes: true,
        attributeFilter: [...translatableAttributes],
        characterData: true,
        childList: true,
        subtree: true,
      })
    }

    return () => observer.disconnect()
  }, [language])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }

  return context
}

export function FloatingLanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      data-i18n-ignore
      className="fixed bottom-4 left-4 z-[90] flex rounded-full border border-neutral-300 bg-white/92 p-1 shadow-lg backdrop-blur"
      aria-label="Language switcher"
    >
      {(['uk', 'en'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={language === option}
          onClick={() => setLanguage(option)}
          className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
            language === option
              ? 'bg-neutral-950 text-white'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950'
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function translateTree(root: HTMLElement, language: Language) {
  translateElementAttributes(root, language)

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  )

  let node = walker.nextNode()

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      translateTextNode(node as Text, language)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(node as Element, language)
    }

    node = walker.nextNode()
  }
}

function translateTextNode(node: Text, language: Language) {
  if (!node.textContent?.trim() || shouldIgnore(node.parentElement)) {
    return
  }

  if (language === 'uk') {
    const original = originalText.get(node)

    if (original && node.textContent !== original) {
      node.textContent = original
    }

    return
  }

  const storedOriginal = originalText.get(node)
  const storedTranslation = storedOriginal ? translateUiText(storedOriginal, 'en') : null
  const baseText = storedOriginal && node.textContent === storedTranslation
    ? storedOriginal
    : node.textContent

  originalText.set(node, baseText)

  const translated = translateUiText(baseText, 'en')

  if (node.textContent !== translated) {
    node.textContent = translated
  }
}

function translateElementAttributes(element: Element, language: Language) {
  if (shouldIgnore(element)) {
    return
  }

  for (const attr of translatableAttributes) {
    const current = element.getAttribute(attr)

    if (!current?.trim()) {
      continue
    }

    const stored = originalAttributes.get(element)?.[attr]

    if (language === 'uk') {
      if (stored && current !== stored) {
        element.setAttribute(attr, stored)
      }

      continue
    }

    const storedTranslation = stored ? translateUiText(stored, 'en') : null
    const baseValue = stored && current === storedTranslation ? stored : current
    const nextStored = {
      ...originalAttributes.get(element),
      [attr]: baseValue,
    }

    originalAttributes.set(element, nextStored)

    const translated = translateUiText(baseValue, 'en')

    if (current !== translated) {
      element.setAttribute(attr, translated)
    }
  }
}

function shouldIgnore(element: Element | null) {
  return Boolean(element?.closest('[data-i18n-ignore], script, style'))
}
