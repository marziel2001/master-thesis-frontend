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
    const [saveName, setSaveName] = useState('')
    const [referenceText, setReferenceText] = useState('')
    const [referenceFileName, setReferenceFileName] = useState('')
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
    const [expandedModelIds, setExpandedModelIds] = useState<Set<string>>(
        () => new Set()
    )
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

    const buildDefaultSaveName = (selectedFile: File | null) => {
        if (!selectedFile) {
            return ''
        }

        const baseName = selectedFile.name.replace(/\.[^.]+$/, '')
        const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
        return `${baseName} - ${stamp}`
    }

    const handleReferenceFile = async (selectedFile: File | null) => {
        if (!selectedFile) {
            setReferenceFileName('')
            return
        }

        const text = await selectedFile.text()
        setReferenceText(text)
        setReferenceFileName(selectedFile.name)
    }

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

    const toggleExpandedModel = (modelId: string) => {
        setExpandedModelIds((previous) => {
            const next = new Set(previous)
            if (next.has(modelId)) {
                next.delete(modelId)
            } else {
                next.add(modelId)
            }
            return next
        })
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
            name: saveName.trim() || undefined,
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
            name: saveName.trim() || undefined,
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
        <>
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
                <h3 className="text-sm font-semibold text-gray-800">
                    Input sources
                </h3>
                <div className="mt-4 space-y-4">
                    <FilePicker
                        label="Audio file"
                        accept="audio/*"
                        fileName={fileName}
                        compact={true}
                        onFileChange={(selectedFile) => {
                            setFile(selectedFile)
                            setFileName(selectedFile?.name ?? '')
                            setSaveName(
                                selectedFile
                                    ? buildDefaultSaveName(selectedFile)
                                    : ''
                            )
                        }}
                    />
                    <div>
                        <label
                            htmlFor="reference-text"
                            className="block text-sm font-semibold text-gray-800"
                        >
                            Reference text
                        </label>
                        <p className="mt-1 text-xs text-gray-500">
                            Text used for WER, CER and colored diff.
                        </p>
                        <div className="mt-3">
                            <FilePicker
                                label="Reference file"
                                accept=".txt"
                                fileName={referenceFileName}
                                onFileChange={(selectedFile) => {
                                    void handleReferenceFile(selectedFile)
                                }}
                                compact={true}
                            />
                        </div>
                        <textarea
                            id="reference-text"
                            className="mt-3 min-h-28 w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800"
                            value={referenceText}
                            onChange={(event) =>
                                setReferenceText(event.target.value)
                            }
                            placeholder="Paste reference text here"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-800">
                            Saved results
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Give this run a name before saving so it is easier
                            to find later.
                        </p>
                    </div>
                    <button
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:text-gray-400"
                        onClick={handleSaveRun}
                        disabled={!hasAnyResult}
                    >
                        Save results
                    </button>
                </div>

                <div className="mt-4">
                    <label
                        htmlFor="save-name"
                        className="block text-sm font-semibold text-gray-800"
                    >
                        Saved entry name
                    </label>
                    <input
                        id="save-name"
                        type="text"
                        className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                        value={saveName}
                        onChange={(event) => setSaveName(event.target.value)}
                        placeholder="Enter a custom name"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        Default name is based on the audio file and the current
                        date.
                    </p>
                </div>

                {statusMessage ? (
                    <p className="mt-4 text-sm text-red-600">{statusMessage}</p>
                ) : null}

                {modelCatalogError ? (
                    <p className="mt-4 text-sm text-red-600">
                        {modelCatalogError}
                    </p>
                ) : null}

                {historyMessage ? (
                    <p className="mt-4 text-sm text-green-600">
                        {historyMessage}
                    </p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-3">
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
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition active:translate-y-px active:shadow-none"
                        onClick={() => setAllModelsEnabled(!allModelsEnabled)}
                        type="button"
                    >
                        {allModelsEnabled ? 'Uncheck all' : 'Check all'}
                    </button>
                </div>

                <div className="mt-5">
                    <MetricsChartPanel
                        metricsByModel={chartMetrics}
                        title="WER/CER overview"
                    />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {models.map((model) => {
                        const modelId = model.id
                        const modelLabel = getModelLabel(modelId)
                        const modelVariantOptions = getVariants(modelId)
                        const selectedVariant = modelVariants[modelId] || ''
                        const usedVariant = modelVersions[modelId] || ''
                        const metricsEntry = metrics[modelId] ?? EMPTY_METRICS
                        const transcriptionText = results[modelId] ?? ''
                        const isChecked = enabledModels[modelId] ?? false
                        const isExpanded = expandedModelIds.has(modelId)
                        const diffContainerClassName = isChecked
                            ? 'mt-4 max-h-[9999px] opacity-100'
                            : 'mt-0 max-h-0 opacity-0'
                        const diffLabel = usedVariant
                            ? `${modelLabel} (${usedVariant})`
                            : modelLabel

                        return (
                            <div
                                key={modelId}
                                className={`min-w-0 ${
                                    isExpanded ? 'col-span-full' : ''
                                }`}
                            >
                                <TranscriptionCard
                                    status={statusByModel[modelId] ?? 'idle'}
                                    title={modelLabel}
                                    headerContent={
                                        <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                                    checked={isChecked}
                                                    onChange={(event) =>
                                                        updateModelEnabled(
                                                            modelId,
                                                            event.target.checked
                                                        )
                                                    }
                                                />
                                            </label>
                                            <div className="min-w-0 flex-1 text-center">
                                                <p className="truncate text-sm font-semibold text-gray-800">
                                                    {modelLabel}
                                                </p>
                                            </div>
                                            <button
                                                className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 transition hover:bg-gray-50"
                                                onClick={() =>
                                                    toggleExpandedModel(modelId)
                                                }
                                                type="button"
                                                title={
                                                    isExpanded
                                                        ? 'Collapse'
                                                        : 'Expand'
                                                }
                                                aria-pressed={isExpanded}
                                            >
                                                {isExpanded ? (
                                                    <svg
                                                        aria-hidden="true"
                                                        viewBox="0 0 20 20"
                                                        className="h-4 w-4"
                                                        fill="currentColor"
                                                    >
                                                        <path d="M5 5h4V3H3v6h2V5Zm6-2v2h4v4h2V3h-6Zm4 14h-4v2h6v-6h-2v4ZM5 11H3v6h6v-2H5v-4Z" />
                                                    </svg>
                                                ) : (
                                                    <svg
                                                        aria-hidden="true"
                                                        viewBox="0 0 20 20"
                                                        className="h-4 w-4"
                                                        fill="currentColor"
                                                    >
                                                        <path d="M3 3h6v2H5v4H3V3Zm8 0h6v6h-2V5h-4V3ZM5 11v4h4v2H3v-6h2Zm12 0v6h-6v-2h4v-4h2Z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    }
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Transcription
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {modelVariantOptions.length > 0 ? (
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
                                            ) : null}
                                            <button
                                                className="rounded-md border border-gray-300 bg-white p-1.5 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                                onClick={() =>
                                                    void runTranscriptionForModel(
                                                        modelId
                                                    )
                                                }
                                                disabled={
                                                    loadingState[modelId] ===
                                                        true ||
                                                    modelCatalogLoading ||
                                                    !file
                                                }
                                                title={
                                                    loadingState[modelId]
                                                        ? 'Running...'
                                                        : 'Run again'
                                                }
                                                type="button"
                                            >
                                                <svg
                                                    aria-hidden="true"
                                                    viewBox="0 0 20 20"
                                                    className="h-4 w-4"
                                                    fill="currentColor"
                                                >
                                                    <path d="M10 3a7 7 0 1 1-6.32 4H1.5a.5.5 0 0 1-.5-.5V3.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V5h2.16A7 7 0 0 1 10 3Zm0 2a5 5 0 1 0 4.58 3H12.5a.5.5 0 0 1 0-1h3.5a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-1 0V9.64A5 5 0 0 0 10 5Z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        className="mt-2 min-h-28 w-full rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800"
                                        value={transcriptionText}
                                        readOnly
                                        placeholder="Run the model to see transcription here"
                                    />

                                    <MetricsGrid
                                        metrics={metricsEntry}
                                        showTime={true}
                                        title="Metrics"
                                        subtitle={
                                            usedVariant
                                                ? `Model used: ${usedVariant}`
                                                : undefined
                                        }
                                        footer={
                                            <button
                                                className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                                                onClick={() =>
                                                    void recalculateMetricsForModel(
                                                        modelId
                                                    )
                                                }
                                                disabled={
                                                    metricsLoadingState[
                                                        modelId
                                                    ] === true ||
                                                    results[modelId]?.trim()
                                                        .length === 0 ||
                                                    referenceText.trim()
                                                        .length === 0
                                                }
                                            >
                                                {metricsLoadingState[modelId]
                                                    ? 'Recalculating...'
                                                    : 'Recompute metrics'}
                                            </button>
                                        }
                                    />

                                    <div
                                        className={`transition-[max-height,opacity,margin] duration-300 ease-out ${diffContainerClassName}`}
                                    >
                                        <ColoredDiff
                                            enabled={isChecked}
                                            referenceText={referenceText}
                                            hypothesisText={transcriptionText}
                                            modelName={diffLabel}
                                            title="Diff"
                                        />
                                    </div>
                                </TranscriptionCard>
                            </div>
                        )
                    })}
                </div>
            </section>
        </>
    )
}

export default MainPage
