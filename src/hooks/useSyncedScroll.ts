import { useCallback, useRef } from 'react'

export type SyncedScrollPane = 'primary' | 'secondary'

/**
 * Keeps two scrollable panes at the same relative offset.
 *
 * Scrolling one pane programmatically fires the other pane's scroll handler, so
 * a re-entrancy latch is held until the next frame to stop the two from
 * bouncing off each other.
 */
export function useSyncedScroll<Element extends HTMLElement>(enabled: boolean) {
    const primaryRef = useRef<Element | null>(null)
    const secondaryRef = useRef<Element | null>(null)
    const isSyncing = useRef(false)

    const syncFrom = useCallback(
        (source: SyncedScrollPane) => {
            if (!enabled || isSyncing.current) {
                return
            }

            const from =
                source === 'primary' ? primaryRef.current : secondaryRef.current
            const to =
                source === 'primary' ? secondaryRef.current : primaryRef.current

            if (!from || !to) {
                return
            }

            const scrollableHeight = from.scrollHeight - from.clientHeight
            if (scrollableHeight <= 0) {
                return
            }

            isSyncing.current = true
            to.scrollTop =
                (from.scrollTop / scrollableHeight) *
                (to.scrollHeight - to.clientHeight)

            requestAnimationFrame(() => {
                isSyncing.current = false
            })
        },
        [enabled]
    )

    return { primaryRef, secondaryRef, syncFrom }
}
