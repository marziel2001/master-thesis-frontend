import { useCallback, useEffect, useState } from 'react'
import { deleteRun, listRuns } from '../requests/runs'
import type { RunData } from '../requests/runs.types'

const LOAD_ERROR_MESSAGE = 'Failed to load runs from server.'

export type RunHistoryController = {
    runs: RunData[]
    /** Message to surface when the list could not be fetched. */
    loadError: string | null
    /** Refetches the list. Reports failures through `loadError`. */
    reload: () => Promise<void>
    /** Deletes a run and refetches. Throws so callers can report failure. */
    remove: (runId: string) => Promise<void>
    findRun: (runId: string) => RunData | undefined
}

/** Loads the saved runs on mount and exposes reload / delete. */
export function useRunHistory(): RunHistoryController {
    const [runs, setRuns] = useState<RunData[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)

    // The mount fetch is written out inline rather than delegating to `reload`:
    // `react-hooks/set-state-in-effect` requires the setState calls to sit
    // lexically inside the effect, and doing so also lets the unmount guard
    // drop a response that arrives too late.
    useEffect(() => {
        let cancelled = false

        const load = async () => {
            try {
                const loaded = await listRuns()
                if (!cancelled) {
                    setRuns(loaded)
                    setLoadError(null)
                }
            } catch (error) {
                console.error(error)
                if (!cancelled) {
                    setLoadError(LOAD_ERROR_MESSAGE)
                }
            }
        }

        void load()

        return () => {
            cancelled = true
        }
    }, [])

    const reload = useCallback(async () => {
        try {
            setRuns(await listRuns())
            setLoadError(null)
        } catch (error) {
            console.error(error)
            setLoadError(LOAD_ERROR_MESSAGE)
        }
    }, [])

    const remove = useCallback(
        async (runId: string) => {
            await deleteRun(runId)
            await reload()
        },
        [reload]
    )

    const findRun = useCallback(
        (runId: string) => runs.find((run) => run.id === runId),
        [runs]
    )

    return { runs, loadError, reload, remove, findRun }
}
