import type {
  Category,
  CategoryPayload,
  Company,
  CompanySettingsPayload,
  ContactPayload,
  DeliveryOrder,
  DeliveryOrderPayload,
  Dish,
  DishPayload,
  GuestFeedbackPayload,
  ImageUploadResponse,
  LoginResponse,
  OwnerRegistrationPayload,
  OwnerRegistrationResponse,
  PaymentInvoice,
  PaymentPlanCode,
  PlatformCompany,
  PlatformCompanyPayload,
  PublicMenu,
  Subcategory,
  SubcategoryPayload,
} from './types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

type ApiEnvelope<T> = {
  data: T
}

type RequestOptions = {
  token?: string | null
  method?: string
  body?: FormData | object
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({
    Accept: 'application/json',
  })

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  let body: BodyInit | undefined

  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  })

  if (!response.ok) {
    const message = await response.text()

    if (response.status === 401 && !path.startsWith('/auth/login')) {
      window.dispatchEvent(new CustomEvent('digital-menu:auth-expired'))
    }

    throw new ApiError(message || `Request failed with status ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function fetchMenu(token?: string | null): Promise<ApiEnvelope<Category[]>> {
  return request<ApiEnvelope<Category[]>>('/dishes', { token })
}

export function fetchRestaurantMenu(slug: string): Promise<ApiEnvelope<PublicMenu>> {
  return request<ApiEnvelope<PublicMenu>>(`/restaurants/${slug}/menu`)
}

export function fetchRestaurantMenuVersion(slug: string): Promise<ApiEnvelope<{ version: number }>> {
  return request<ApiEnvelope<{ version: number }>>(`/restaurants/${slug}/menu/version`)
}

export function login(loginName: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: {
      login: loginName,
      password,
    },
  })
}

export function registerOwner(
  payload: OwnerRegistrationPayload,
): Promise<OwnerRegistrationResponse> {
  return request<OwnerRegistrationResponse>('/owners/register', {
    method: 'POST',
    body: payload,
  })
}

export function sendContactMessage(payload: ContactPayload): Promise<unknown> {
  return request<unknown>('/contact', {
    method: 'POST',
    body: payload,
  })
}

export function fetchCompany(token: string): Promise<ApiEnvelope<Company | null>> {
  return request<ApiEnvelope<Company | null>>('/company', { token })
}

export function updateCompany(
  token: string,
  payload: CompanySettingsPayload,
): Promise<ApiEnvelope<Company>> {
  return request<ApiEnvelope<Company>>('/company', {
    token,
    method: 'PATCH',
    body: payload,
  })
}

export function createCategory(
  token: string,
  payload: CategoryPayload,
): Promise<ApiEnvelope<Category>> {
  return request<ApiEnvelope<Category>>('/categories', {
    token,
    method: 'POST',
    body: payload,
  })
}

export function updateCategory(
  token: string,
  categoryId: number,
  payload: CategoryPayload,
): Promise<ApiEnvelope<Category>> {
  return request<ApiEnvelope<Category>>(`/categories/${categoryId}`, {
    token,
    method: 'PATCH',
    body: payload,
  })
}

export function deleteCategory(token: string, categoryId: number): Promise<void> {
  return request<void>(`/categories/${categoryId}`, {
    token,
    method: 'DELETE',
  })
}

export function createSubcategory(
  token: string,
  payload: SubcategoryPayload,
): Promise<ApiEnvelope<Subcategory>> {
  return request<ApiEnvelope<Subcategory>>('/subcategories', {
    token,
    method: 'POST',
    body: payload,
  })
}

export function updateSubcategory(
  token: string,
  subcategoryId: number,
  payload: SubcategoryPayload,
): Promise<ApiEnvelope<Subcategory>> {
  return request<ApiEnvelope<Subcategory>>(`/subcategories/${subcategoryId}`, {
    token,
    method: 'PATCH',
    body: payload,
  })
}

export function deleteSubcategory(token: string, subcategoryId: number): Promise<void> {
  return request<void>(`/subcategories/${subcategoryId}`, {
    token,
    method: 'DELETE',
  })
}

export function fetchPlatformCompanies(token: string): Promise<ApiEnvelope<PlatformCompany[]>> {
  return request<ApiEnvelope<PlatformCompany[]>>('/platform/companies', { token })
}

export function updatePlatformCompany(
  token: string,
  companyId: number,
  payload: PlatformCompanyPayload,
): Promise<ApiEnvelope<PlatformCompany>> {
  return request<ApiEnvelope<PlatformCompany>>(`/platform/companies/${companyId}`, {
    token,
    method: 'PATCH',
    body: payload,
  })
}

export function deletePlatformCompany(token: string, companyId: number): Promise<void> {
  return request<void>(`/platform/companies/${companyId}`, {
    token,
    method: 'DELETE',
  })
}

export function createDish(token: string, payload: DishPayload): Promise<ApiEnvelope<Dish>> {
  return request<ApiEnvelope<Dish>>('/dishes', {
    token,
    method: 'POST',
    body: normalizeDishPayload(payload),
  })
}

export function updateDish(
  token: string,
  dishId: number,
  payload: DishPayload,
): Promise<ApiEnvelope<Dish>> {
  return request<ApiEnvelope<Dish>>(`/dishes/${dishId}`, {
    token,
    method: 'PATCH',
    body: normalizeDishPayload(payload),
  })
}

export function deleteDish(token: string, dishId: number): Promise<void> {
  return request<void>(`/dishes/${dishId}`, {
    token,
    method: 'DELETE',
  })
}

export function toggleDish(token: string, dishId: number): Promise<ApiEnvelope<Dish>> {
  return request<ApiEnvelope<Dish>>(`/dishes/${dishId}/toggle`, {
    token,
    method: 'PATCH',
  })
}

export function likeDish(dishId: number, visitorKey: string): Promise<{
  data: {
    liked: boolean
    created: boolean
    likes_count: number
  }
}> {
  return request(`/dishes/${dishId}/like`, {
    method: 'POST',
    body: {
      visitor_key: visitorKey,
    },
  })
}

export function sendGuestFeedback(
  slug: string,
  payload: GuestFeedbackPayload,
): Promise<unknown> {
  return request<unknown>(`/restaurants/${slug}/feedback`, {
    method: 'POST',
    body: payload,
  })
}

export function createDeliveryOrder(
  slug: string,
  payload: DeliveryOrderPayload,
): Promise<ApiEnvelope<DeliveryOrder>> {
  return request<ApiEnvelope<DeliveryOrder>>(`/restaurants/${slug}/delivery-orders`, {
    method: 'POST',
    body: payload,
  })
}

export function createSubscriptionPayment(
  token: string,
  plan: PaymentPlanCode,
): Promise<ApiEnvelope<PaymentInvoice>> {
  return request<ApiEnvelope<PaymentInvoice>>('/payments/subscription', {
    token,
    method: 'POST',
    body: {
      plan,
    },
  })
}

export function fetchPaymentInvoice(
  token: string,
  invoiceId: number,
): Promise<ApiEnvelope<PaymentInvoice>> {
  return request<ApiEnvelope<PaymentInvoice>>(`/payments/${invoiceId}`, { token })
}

export function uploadDishImage(
  token: string,
  image: Blob,
): Promise<ApiEnvelope<ImageUploadResponse>> {
  const formData = new FormData()
  formData.append('image', image, 'dish-image.jpg')

  return request<ApiEnvelope<ImageUploadResponse>>('/uploads/dish-image', {
    token,
    method: 'POST',
    body: formData,
  })
}

export function uploadCompanyAvatar(
  token: string,
  image: File,
): Promise<ApiEnvelope<ImageUploadResponse>> {
  const formData = new FormData()
  formData.append('image', image, image.name)

  return request<ApiEnvelope<ImageUploadResponse>>('/uploads/company-avatar', {
    token,
    method: 'POST',
    body: formData,
  })
}

function normalizeDishPayload(payload: DishPayload): DishPayload {
  return {
    ...payload,
    description: payload.description.trim(),
    weight: payload.weight?.trim() ? payload.weight.trim() : null,
    image_url: payload.image_url?.trim() ? payload.image_url.trim() : null,
  }
}
