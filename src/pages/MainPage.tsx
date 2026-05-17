import { useEffect, useMemo, useState } from 'react'
import ColoredDiff from '../components/ColoredDiff'
import FilePicker from '../components/FilePicker'
import MetricsChartPanel from '../components/MetricsChartPanel'
import MetricsGrid from '../components/MetricsGrid'
import TranscriptionCard from '../components/TranscriptionCard'
import { useModelCatalog } from '../hooks/useModelCatalog'
import { getMetrics } from '../requests/metrics'
import { transcribeAudio } from '../requests/transcription'
import { saveRunSafe } from '../utils/resultsHistory'
import { type ModelMetrics, type ModelStatus } from './MainPage.types'

const EMPTY_METRICS: ModelMetrics = {
    wer: null,
    cer: null,
    rtTime: null,
}

type FinishedModelResult = {
    model: string
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
    modelVersion?: string
}

const buildModelRecord = <T,>(
    models: Array<{ id: string }>,
    createValue: (modelId: string) => T
): Record<string, T> =>
    Object.fromEntries(
        models.map((model) => [model.id, createValue(model.id)])
    ) as Record<string, T>

function MainPage() {
    const {
        models,
        loading: modelCatalogLoading,
        error: modelCatalogError,
        getModelLabel,
        getDefaultVariant,
        getVariants,
    } = useModelCatalog()
    const [file, setFile] = useState<File | null>(null)
    const [fileName, setFileName] = useState('')
    const [referenceText, setReferenceText] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [historyMessage, setHistoryMessage] = useState('')
    const [results, setResults] = useState<Record<string, string>>({})
    const [metrics, setMetrics] = useState<Record<string, ModelMetrics>>({})
    const [loadingState, setLoadingState] = useState<Record<string, boolean>>(
        {}
    )
    const [metricsLoadingState, setMetricsLoadingState] = useState<
        Record<string, boolean>
    >({})
    const [statusByModel, setStatusByModel] = useState<
        Record<string, ModelStatus>
    >({})
    const [enabledModels, setEnabledModels] = useState<Record<string, boolean>>(
        {}
    )
    const [modelVersions, setModelVersions] = useState<Record<string, string>>(
        {}
    )
    const [modelVariants, setModelVariants] = useState<Record<string, string>>(
        {}
    )

    useEffect(() => {
        if (models.length === 0) {
            return
        }

        setResults(buildModelRecord(models, () => ''))
        setMetrics(buildModelRecord(models, () => EMPTY_METRICS))
        setLoadingState(buildModelRecord(models, () => false))
        setMetricsLoadingState(buildModelRecord(models, () => false))
        setStatusByModel(buildModelRecord(models, () => 'idle'))
        setEnabledModels(buildModelRecord(models, () => false))
        setModelVersions(buildModelRecord(models, () => ''))
        setModelVariants(
            buildModelRecord(models, (modelId) => getDefaultVariant(modelId))
        )
    }, [models, getDefaultVariant])

    const setModelLoading = (model: string, loading: boolean) => {
        setLoadingState((previous) => ({ ...previous, [model]: loading }))
    }

    const setModelResult = (model: string, text: string) => {
        setResults((previous) => ({ ...previous, [model]: text }))
    }

    const setModelMetrics = (model: string, value: ModelMetrics) => {
        setMetrics((previous) => ({ ...previous, [model]: value }))
    }

    const setModelStatus = (model: string, status: ModelStatus) => {
        setStatusByModel((previous) => ({ ...previous, [model]: status }))
    }

    const setModelVersion = (model: string, version: string) => {
        setModelVersions((previous) => ({ ...previous, [model]: version }))
    }

    const setModelMetricsLoading = (model: string, loading: boolean) => {
        setMetricsLoadingState((previous) => ({
            ...previous,
            [model]: loading,
        }))
    }

    const runTranscriptionForModel = async (
        model: string
    ): Promise<FinishedModelResult | null> => {
        if (!file) {
            setStatusMessage('Select an audio file first.')
            return null
        }

        setStatusMessage('')
        setHistoryMessage('')

        setModelLoading(model, true)
        setModelStatus(model, 'loading')
        setModelResult(model, '')
        setModelMetrics(model, EMPTY_METRICS)

        try {
            const selectedVariant = modelVariants[model] || ''
            const { transcription, wer, cer, rtTime, modelVersion } =
                await transcribeAudio(
                    model,
                    file,
                    referenceText,
                    selectedVariant
                )

            setModelResult(
                model,
                transcription || 'No transcription text in response.'
            )
            setModelMetrics(model, { wer, cer, rtTime })
            setModelStatus(model, 'success')
            setModelVersion(model, modelVersion || selectedVariant)

            return {
                model,
                transcription:
                    transcription || 'No transcription text in response.',
                wer,
                cer,
                rtTime,
                modelVersion: modelVersion || selectedVariant,
            }
        } catch (error) {
            console.error(error)
            setModelResult(
                model,
                'There was an error during transcription. Please try again.'
            )
            setModelMetrics(model, EMPTY_METRICS)
            setModelStatus(model, 'error')
            return null
        } finally {
            setModelLoading(model, false)
        }
    }

    const recalculateMetricsForModel = async (model: string) => {
        const transcription = results[model]?.trim() ?? ''
        const reference = referenceText.trim()

        if (!transcription || !reference) {
            return
        }

        setStatusMessage('')
        setHistoryMessage('')
        setModelMetricsLoading(model, true)

        try {
            const { wer, cer } = await getMetrics({
                referenceText: reference,
                hypothesisText: transcription,
                normalize: true,
            })

            setModelMetrics(model, {
                wer,
                cer,
                rtTime: metrics[model]?.rtTime ?? null,
            })
        } catch (error) {
            console.error(error)
            setStatusMessage('Failed to recalculate metrics. Please try again.')
        } finally {
            setModelMetricsLoading(model, false)
        }
    }

    const updateModelEnabled = (model: string, enabled: boolean) => {
        setEnabledModels((previous) => ({ ...previous, [model]: enabled }))
        if (!enabled) {
            setModelStatus(model, 'idle')
        }
    }

    const updateModelVariant = (model: string, variant: string) => {
        setModelVariants((previous) => ({ ...previous, [model]: variant }))
    }

    const setAllModelsEnabled = (enabled: boolean) => {
        if (models.length === 0) {
            return
        }

        setEnabledModels(buildModelRecord(models, () => enabled))

        if (!enabled) {
            models.forEach((model) => setModelStatus(model.id, 'idle'))
        }
    }

    const allModelsEnabled =
        models.length > 0 && models.every((model) => enabledModels[model.id])
    const chartMetrics = useMemo(
        () =>
            Object.fromEntries(
                models.map((model) => [
                    model.id,
                    {
                        wer: metrics[model.id]?.wer ?? null,
                        cer: metrics[model.id]?.cer ?? null,
                        rtTime: metrics[model.id]?.rtTime ?? null,
                    },
                ])
            ),
        [metrics, models]
    )

    const hasAnyResult = models.some((model) => {
        const entry = results[model.id] ?? ''
        const modelMetrics = metrics[model.id] ?? EMPTY_METRICS
        return (
            entry.trim().length > 0 ||
            modelMetrics.wer !== null ||
            modelMetrics.cer !== null
        )
    })

    const handleSaveRun = () => {
        if (!hasAnyResult) {
            setHistoryMessage('Nothing to save yet.')
            return
        }

        const runResults = models
            .map((model) => {
                const resolvedVersion =
                    modelVersions[model.id] || modelVariants[model.id] || ''
                return {
                    model: model.id,
                    modelVersion: resolvedVersion || undefined,
                    transcription: results[model.id] ?? '',
                    wer: metrics[model.id]?.wer ?? null,
                    cer: metrics[model.id]?.cer ?? null,
                    rtTime: metrics[model.id]?.rtTime ?? null,
                }
            })
            .filter(
                (entry) =>
                    entry.transcription.trim().length > 0 ||
                    entry.wer !== null ||
                    entry.cer !== null
            )

        if (runResults.length === 0) {
            setHistoryMessage('Nothing to save yet.')
            return
        }

        const saveResult = saveRunSafe({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            referenceText,
            results: runResults,
        })

        if (!saveResult.ok) {
            setHistoryMessage(
                `Failed to save history. ${saveResult.error ?? ''}`.trim()
            )
            return
        }

        setHistoryMessage('Saved to local history.')
    }

    const saveBatchRun = (batchResults: FinishedModelResult[]) => {
        if (batchResults.length === 0) {
            setHistoryMessage('Nothing to save yet.')
            return
        }

        const saveResult = saveRunSafe({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            referenceText,
            results: batchResults,
        })

        if (!saveResult.ok) {
            setHistoryMessage(
                `Failed to save history. ${saveResult.error ?? ''}`.trim()
            )
            return
        }

        setHistoryMessage('Saved to local history.')
    }

    const handleUpload = async () => {
        if (!file) {
            setStatusMessage('Select an audio file first.')
            return
        }

        if (modelCatalogLoading) {
            setStatusMessage('Model catalog is still loading. Please wait.')
            return
        }

        if (modelCatalogError) {
            setStatusMessage(
                'Failed to load model catalog. Refresh and try again.'
            )
            return
        }
        const selectedModels = models
            .filter((model) => enabledModels[model.id])
            .map((model) => model.id)

        if (selectedModels.length === 0) {
            setStatusMessage('Select at least one transcription model.')
            return
        }

        setStatusMessage('')
        setHistoryMessage('')

        const settledResults = await Promise.allSettled(
            selectedModels.map((model) => runTranscriptionForModel(model))
        )

        const batchResults = settledResults.flatMap((entry) =>
            entry.status === 'fulfilled' && entry.value ? [entry.value] : []
        )

        if (batchResults.length === 0) {
            return
        }

        const shouldSave = window.confirm(
            'The selected model run finished. Save this session to local history?'
        )

        if (shouldSave) {
            saveBatchRun(batchResults)
        }
    }

    return (
        <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
                Multi-model transcription
            </h2>

            <div className="mb-5 flex flex-wrap items-center gap-3">
                <FilePicker
                    label="Audio file"
                    accept="audio/*"
                    fileName={fileName}
                    onFileChange={(selectedFile) => {
                        setFile(selectedFile)
                        setFileName(selectedFile?.name ?? '')
                    }}
                />
                <button
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                    onClick={handleUpload}
                    disabled={
                        models.length === 0 ||
                        models.every((model) => !enabledModels[model.id])
                    }
                >
                    Send to selected models
                </button>
                <button
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:text-gray-400"
                    onClick={handleSaveRun}
                    disabled={!hasAnyResult}
                >
                    Save results
                </button>
            </div>

            <div className="mb-5">
                <label
                    htmlFor="reference-text"
                    className="mb-2 block text-sm font-medium text-gray-800"
                >
                    Reference text (for notebook-style colored diff)
                </label>
                <textarea
                    id="reference-text"
                    className="min-h-28 w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800"
                    value={referenceText}
                    onChange={(event) => setReferenceText(event.target.value)}
                    placeholder="Paste reference text here"
                />
            </div>

            {statusMessage ? (
                <p className="mb-4 text-sm text-red-600">{statusMessage}</p>
            ) : null}

            {modelCatalogError ? (
                <p className="mb-4 text-sm text-red-600">{modelCatalogError}</p>
            ) : null}

            {historyMessage ? (
                <p className="mb-4 text-sm text-green-600">{historyMessage}</p>
            ) : null}

            <div className="mb-5">
                <MetricsChartPanel
                    metricsByModel={chartMetrics}
                    title="WER/CER overview"
                />
            </div>

            <div className="mb-4 flex items-center justify-end">
                <button
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition active:translate-y-px active:shadow-none"
                    onClick={() => setAllModelsEnabled(!allModelsEnabled)}
                    type="button"
                >
                    {allModelsEnabled ? 'Uncheck all' : 'Check all'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {models.map((model) => {
                    const modelId = model.id
                    const modelLabel = getModelLabel(modelId)
                    const modelVariantOptions = getVariants(modelId)
                    const selectedVariant = modelVariants[modelId] || ''
                    const usedVariant = modelVersions[modelId] || ''
                    const metricsEntry = metrics[modelId] ?? EMPTY_METRICS
                    const transcriptionText = results[modelId] ?? ''
                    const isChecked = enabledModels[modelId] ?? false
                    const diffContainerClassName = isChecked
                        ? 'max-h-[9999px] opacity-100 mt-3'
                        : 'max-h-0 opacity-0 mt-0'
                    const diffLabel = usedVariant
                        ? `${modelLabel} (${usedVariant})`
                        : modelLabel

                    return (
                        <TranscriptionCard
                            key={modelId}
                            status={statusByModel[modelId] ?? 'idle'}
                            title={modelLabel}
                            subtitle={
                                usedVariant
                                    ? `Model used: ${usedVariant}`
                                    : undefined
                            }
                            headerExtras={
                                modelVariantOptions.length > 0 ? (
                                    <>
                                        <label className="text-xs font-semibold text-gray-600">
                                            Model
                                        </label>
                                        <select
                                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
                                            value={selectedVariant}
                                            onChange={(event) =>
                                                updateModelVariant(
                                                    modelId,
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {modelVariantOptions.map(
                                                (variant) => (
                                                    <option
                                                        key={variant}
                                                        value={variant}
                                                    >
                                                        {variant}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </>
                                ) : null
                            }
                            headerActions={
                                <>
                                    <button
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                        onClick={() =>
                                            void runTranscriptionForModel(
                                                modelId
                                            )
                                        }
                                        type="button"
                                        disabled={
                                            file === null ||
                                            loadingState[modelId] === true
                                        }
                                        title="Run this model again with the current audio file"
                                    >
                                        Rerun
                                    </button>
                                    <button
                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                        onClick={() =>
                                            void recalculateMetricsForModel(
                                                modelId
                                            )
                                        }
                                        type="button"
                                        disabled={
                                            transcriptionText.trim().length ===
                                                0 ||
                                            referenceText.trim().length === 0 ||
                                            metricsLoadingState[modelId] ===
                                                true
                                        }
                                        title="Recalculate metrics for the current transcription"
                                    >
                                        {metricsLoadingState[modelId]
                                            ? 'Recalculating...'
                                            : 'Recalculate metrics'}
                                    </button>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={isChecked}
                                        onChange={(event) =>
                                            updateModelEnabled(
                                                modelId,
                                                event.target.checked
                                            )
                                        }
                                    />
                                </>
                            }
                        >
                            <textarea
                                className="min-h-32 w-full resize-y rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800"
                                readOnly
                                value={
                                    loadingState[modelId]
                                        ? 'Transcribing...'
                                        : transcriptionText
                                }
                                placeholder={
                                    isChecked
                                        ? 'Result will appear here'
                                        : 'Enable this model to include it in transcription'
                                }
                            />

                            <MetricsGrid metrics={metricsEntry} />

                            <div
                                className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${diffContainerClassName}`}
                            >
                                <ColoredDiff
                                    enabled={isChecked}
                                    referenceText={referenceText}
                                    hypothesisText={transcriptionText}
                                    modelName={diffLabel}
                                />
                            </div>
                        </TranscriptionCard>
                    )
                })}
            </div>
        </div>
    )
}

export default MainPage
