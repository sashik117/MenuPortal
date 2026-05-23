export type Dish = {
  id: number
  company_id: number | null
  category_id: number
  subcategory_id: number | null
  name: string
  description: string | null
  weight: string | null
  image_url: string | null
  price: string
  is_available: boolean
  likes_count: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type Subcategory = {
  id: number
  company_id: number
  category_id: number
  name: string
  slug: string
  sort_order: number
}

export type Category = {
  id: number
  company_id: number | null
  name: string
  slug: string
  sort_order: number
  created_at: string
  updated_at: string
  subcategories: Subcategory[]
  dishes: Dish[]
}

export type Company = {
  id: number
  owner_first_name: string
  owner_last_name: string
  name: string
  slug: string
  venue_type: string
  avatar_url: string | null
  status: string
  menu_version: number
  trial_ends_at: string | null
  subscription_ends_at: string | null
  wifi_name: string | null
  wifi_password: string | null
  working_hours: string | null
  address: string | null
  maps_url: string | null
  google_place_id: string | null
  address_lat: string | null
  address_lng: string | null
  phone: string | null
  delivery_url: string | null
  feedback_email: string | null
  telegram_chat_id: string | null
}

export type PublicMenu = {
  company: Company
  categories: Category[]
  popular: Dish[]
}

export type AdminUser = {
  id: number
  name: string
  login: string
  role: 'owner' | 'platform_admin'
}

export type LoginResponse = {
  token: string
  admin: AdminUser
  company: Company | null
}

export type DishPayload = {
  category_id: number
  subcategory_id: number | null
  name: string
  description: string
  weight: string | null
  image_url: string | null
  price: number
  is_available: boolean
  sort_order: number
}

export type ImageUploadResponse = {
  url: string
  path: string
}

export type CompanySettingsPayload = {
  avatar_url: string | null
  wifi_name: string | null
  wifi_password: string | null
  working_hours: string | null
  address: string | null
  maps_url: string | null
  google_place_id: string | null
  address_lat: string | null
  address_lng: string | null
  phone: string | null
  delivery_url: string | null
  feedback_email: string | null
  telegram_chat_id: string | null
}

export type CategoryPayload = {
  name: string
  sort_order?: number
}

export type SubcategoryPayload = {
  category_id: number
  name: string
  sort_order?: number
}

export type OwnerRegistrationPayload = {
  first_name: string
  last_name: string
  venue_name: string
  venue_type: string
  email: string
  password: string
  start_mode: 'trial' | 'pay_now'
}

export type OwnerRegistrationResponse = LoginResponse & {
  company: Company
  next_url: string
}

export type ContactPayload = {
  name: string
  email: string
  message: string
}

export type GuestFeedbackPayload = {
  message: string
  food_rating: number
  service_rating: number
  atmosphere_rating: number
  value_rating?: number
  guest_name?: string
  guest_contact?: string
}

export type DeliveryCartItem = {
  dish_id: number
  quantity: number
}

export type DeliveryOrderPayload = {
  customer_name: string
  phone: string
  address: string
  comment?: string
  items: DeliveryCartItem[]
}

export type DeliveryOrderItem = DeliveryCartItem & {
  id: number
  delivery_order_id: number
  dish_name: string
  unit_price: string
  line_total: string
}

export type DeliveryOrder = {
  id: number
  company_id: number
  customer_name: string
  phone: string
  address: string
  comment: string | null
  status: string
  total: string
  items: DeliveryOrderItem[]
}

export type PlatformCompany = Company & {
  users_count: number
  dishes_count: number
  users: Array<{
    id: number
    company_id: number | null
    name: string
    email: string | null
    login: string
  }>
}

export type PlatformCompanyPayload = {
  status?: 'trialing' | 'active' | 'pending_payment' | 'banned' | 'canceled'
  trial_ends_at?: string | null
  subscription_ends_at?: string | null
  owner_first_name?: string
  owner_last_name?: string
  name?: string
  venue_type?: string
  avatar_url?: string | null
  wifi_name?: string | null
  wifi_password?: string | null
  working_hours?: string | null
  address?: string | null
  maps_url?: string | null
  google_place_id?: string | null
  address_lat?: string | null
  address_lng?: string | null
  phone?: string | null
  delivery_url?: string | null
  feedback_email?: string | null
  telegram_chat_id?: string | null
}

export type PaymentPlanCode = 'month' | 'six_months' | 'year' | 'auto_monthly'

export type PaymentInvoice = {
  id: number
  provider: string
  provider_invoice_id: string | null
  reference: string
  plan: PaymentPlanCode
  amount: number
  currency: number
  status: string
  checkout_url: string | null
  paid_at: string | null
}
