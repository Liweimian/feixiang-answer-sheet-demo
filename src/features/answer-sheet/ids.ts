let fallbackSequence = 0

/** Creates document entity IDs on both HTTPS and local HTTP demo pages. */
export function createEntityId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  fallbackSequence += 1
  return `${prefix}-${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
