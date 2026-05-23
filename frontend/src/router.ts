export function navigateTo(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new Event('digital-menu:navigate'))
}
