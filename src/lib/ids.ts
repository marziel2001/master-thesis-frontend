let lastId = 0

/**
 * Stable, collision-free id for client-side list items.
 *
 * Replaces `Math.random().toString(36).slice(2)`, which could in principle
 * repeat and made list keys non-deterministic across renders.
 */
export function createLocalId(prefix: string): string {
    lastId += 1

    return `${prefix}-${lastId}`
}
