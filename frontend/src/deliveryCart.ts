import type { DeliveryCartItem, Dish } from './types'

export function deliveryCartKey(slug: string) {
  return `digital-menu-delivery-cart:${slug}`
}

export function readDeliveryCart(slug: string): DeliveryCartItem[] {
  const raw = localStorage.getItem(deliveryCartKey(slug))

  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as DeliveryCartItem[]
  } catch {
    localStorage.removeItem(deliveryCartKey(slug))
    return []
  }
}

export function saveDeliveryCart(slug: string, items: DeliveryCartItem[]) {
  localStorage.setItem(deliveryCartKey(slug), JSON.stringify(items))
}

export function clearDeliveryCart(slug: string) {
  localStorage.removeItem(deliveryCartKey(slug))
}

export function addDishToDeliveryCart(slug: string, dish: Dish) {
  const items = readDeliveryCart(slug)
  const existing = items.find((item) => item.dish_id === dish.id)

  if (existing) {
    existing.quantity += 1
  } else {
    items.push({ dish_id: dish.id, quantity: 1 })
  }

  saveDeliveryCart(slug, items)
}
