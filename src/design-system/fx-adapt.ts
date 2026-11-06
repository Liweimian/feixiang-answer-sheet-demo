export function applyFxZoom(selector = '.fx-zoom-area') {
  const target = document.querySelector<HTMLElement>(selector)
  if (!target) return () => undefined

  const update = () => {
    const viewportWidth = Math.max(window.innerWidth, 1280)
    target.style.zoom = String(Math.min(1, (viewportWidth - 64) / 1280))
  }

  update()
  window.addEventListener('resize', update)
  return () => window.removeEventListener('resize', update)
}
