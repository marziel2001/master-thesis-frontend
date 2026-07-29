import { useCallback, useMemo, useState } from 'react'
import { EMPTY_METRICS } from '../lib/metrics'
import type { AsyncStatus, Metrics } from '../types/metrics'
import type { ModelCatalogEntry } from './useModelCatalog'

/** Everything the transcription page tracks for one model. */
export type ModelRunState = {
    /** Whether the model takes part in the next batch run. */
    enabled: boolean
    /** Variant picked in the UI, e.g. `large-v3`. */
    variant: string
    /** Variant the backend reported actually using. */
    usedVariant: string
    transcription: string
    metrics: Metrics
    status: AsyncStatus
    isTranscribing: boolean
    isRecalculatingMetrics: boolean
    /** Path of the JSON file the backend wrote for this result. */
    outputFile: string | null
    /** Reference-text version the metrics were computed against. */
    metricsReferenceVersion: number
    isExpanded: boolean
}

const IDLE_MODEL_RUN_STATE: ModelRunState = {
    enabled: false,
    variant: '',
    usedVariant: '',
    transcription: '',
    metrics: EMPTY_METRICS,
    status: 'idle',
    isTranscribing: false,
    isRecalculatingMetrics: false,
    outputFile: null,
    metricsReferenceVersion: 0,
    isExpanded: false,
}

export type ModelRunStatesController = {
    getModelState: (modelId: string) => ModelRunState
    updateModel: (modelId: string, patch: Partial<ModelRunState>) => void
    updateAllModels: (patch: Partial<ModelRunState>) => void
    toggleModelExpanded: (modelId: string) => void
}

/**
 * Per-model run state for the transcription page.
 *
 * Replaces ten parallel `Record<string, T>` states (results, metrics, loading,
 * metricsLoading, status, enabled, versions, variants, outputFiles,
 * metricsVersions) with one record, so a model can no longer end up
 * half-updated across them.
 *
 * Only the fields the user has actually changed are stored; the rest is derived
 * from the catalog on read. That removes the need for a "reset state when the
 * catalog arrives" effect, which is both fewer renders and one less way for the
 * state to fall out of sync with the model list.
 */
export function useModelRunStates(
    models: ModelCatalogEntry[],
    getDefaultVariant: (modelId: string) => string
): ModelRunStatesController {
    const [patchesByModel, setPatchesByModel] = useState<
        Record<string, Partial<ModelRunState>>
    >({})

    const statesByModel = useMemo(
        () =>
            Object.fromEntries(
                models.map((model) => [
                    model.id,
                    {
                        ...IDLE_MODEL_RUN_STATE,
                        variant: getDefaultVariant(model.id),
                        ...patchesByModel[model.id],
                    },
                ])
            ),
        [models, getDefaultVariant, patchesByModel]
    )

    const getModelState = useCallback(
        (modelId: string) => statesByModel[modelId] ?? IDLE_MODEL_RUN_STATE,
        [statesByModel]
    )

    const updateModel = useCallback(
        (modelId: string, patch: Partial<ModelRunState>) => {
            setPatchesByModel((previous) => ({
                ...previous,
                [modelId]: { ...previous[modelId], ...patch },
            }))
        },
        []
    )

    const updateAllModels = useCallback(
        (patch: Partial<ModelRunState>) => {
            setPatchesByModel((previous) =>
                Object.fromEntries(
                    models.map((model) => [
                        model.id,
                        { ...previous[model.id], ...patch },
                    ])
                )
            )
        },
        [models]
    )

    const toggleModelExpanded = useCallback(
        (modelId: string) => {
            setPatchesByModel((previous) => ({
                ...previous,
                [modelId]: {
                    ...previous[modelId],
                    isExpanded: !getModelState(modelId).isExpanded,
                },
            }))
        },
        [getModelState]
    )

    return { getModelState, updateModel, updateAllModels, toggleModelExpanded }
}
