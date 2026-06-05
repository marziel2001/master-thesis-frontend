import { useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import ColoredDiff from '../components/ColoredDiff'
import FilePicker from '../components/FilePicker'
import MetricsChartPanel from '../components/MetricsChartPanel'
import MetricsGrid from '../components/MetricsGrid'
import TranscriptionCard from '../components/TranscriptionCard'
import styles from '../styles/theme.module.css'
import { useModelCatalog } from '../hooks/useModelCatalog'
import { getMetrics } from '../requests/metrics'
import { normalizeText } from '../requests/normalizeText'
import { transcribeAudio } from '../requests/transcription'
import { updateOutputFile } from '../requests/updateOutput'
import { saveRunSafe } from '../utils/resultsHistory'
import { type ModelMetrics, type ModelStatus } from './MainPage.types'

const EMPTY_METRICS: ModelMetrics = {
    wer: null,
    cer: null,
    rtTime: null,
    rtf: null,
}

type FinishedModelResult = {
    model: string
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
    rtf: number | null
    audioDuration: number | null
    modelVersion?: string
}

const buildModelRecord = <T,>(
    models: Array<{ id: string }>,
    createValue: (modelId: string) => T
): Record<string, T> =>
    Object.fromEntries(
        models.map((model) => [model.id, createValue(model.id)])
    ) as Record<string, T>

const getAudioDuration = (audioFile: File): Promise<number | null> =>
    new Promise((resolve) => {
        const url = URL.createObjectURL(audioFile)
        const audio = new Audio()
        let settled = false

        const cleanup = () => {
            if (settled) {
                return
            }
            settled = true
            audio.src = ''
            URL.revokeObjectURL(url)
        }

        audio.preload = 'metadata'
        audio.onloadedmetadata = () => {
            const duration =
                Number.isFinite(audio.duration) && audio.duration > 0
                    ? audio.duration
                    : null
            cleanup()
            resolve(duration)
        }
        audio.onerror = () => {
            cleanup()
            resolve(null)
        }
        audio.src = url
    })

const calculateRtf = (rtTime: number | null, duration: number | null) => {
    if (typeof rtTime !== 'number' || typeof duration !== 'number') {
        return null
    }

    if (
        !Number.isFinite(rtTime) ||
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        return null
    }

    return rtTime / duration
}

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
    const [audioDuration, setAudioDuration] = useState<number | null>(null)
    const audioDurationRequestId = useRef(0)
    const [referenceText, setReferenceText] = useState('')
    const [referenceFileName, setReferenceFileName] = useState('')
    const [referenceTextNormalizing, setReferenceTextNormalizing] =
        useState(false)
    const [statusMessage, setStatusMessage] = useState('')
    const [historyMessage, setHistoryMessage] = useState('')
    const referenceVersionRef = useRef(0)
    const [referenceVersion, setReferenceVersion] = useState(0)
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
    const [outputFilesByModel, setOutputFilesByModel] = useState<
        Record<string, string | null>
    >({})
    const [metricsVersionByModel, setMetricsVersionByModel] = useState<
        Record<string, number>
    >({})

    const resolveAudioDuration = async (selectedFile: File | null) => {
        audioDurationRequestId.current += 1
        const requestId = audioDurationRequestId.current

        if (!selectedFile) {
            setAudioDuration(null)
            return
        }

        const duration = await getAudioDuration(selectedFile)
        if (audioDurationRequestId.current !== requestId) {
            return
        }

        setAudioDuration(duration)
    }

    const buildDefaultSaveName = (selectedFile: File | null) => {
        if (!selectedFile) {
            return ''
        }

        const baseName = selectedFile.name.replace(/\.[^.]+$/, '')
        const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
        return `${baseName} - ${stamp}`
    }

    const bumpReferenceVersion = () => {
        referenceVersionRef.current += 1
        setReferenceVersion(referenceVersionRef.current)
        return referenceVersionRef.current
    }

    const setReferenceTextWithVersion = (text: string) => {
        setReferenceText(text)
        return bumpReferenceVersion()
    }

    const handleReferenceFile = async (selectedFile: File | null) => {
        if (!selectedFile) {
            setReferenceFileName('')
            setReferenceTextWithVersion('')
            return
        }

        const text = await selectedFile.text()
        setReferenceTextWithVersion(text)
        setReferenceFileName(selectedFile.name)
    }

    const normalizeCurrentReferenceText = async () => {
        const text = referenceText.trim()
        if (!text) {
            return
        }

        setReferenceTextNormalizing(true)
        try {
            const normalizedText = await normalizeText({ text: referenceText })
            setReferenceTextWithVersion(normalizedText)
        } finally {
            setReferenceTextNormalizing(false)
        }
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
        setOutputFilesByModel(buildModelRecord(models, () => null))
        setMetricsVersionByModel(
            buildModelRecord(models, () => referenceVersionRef.current)
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

    const setModelOutputFile = (model: string, outputFile: string | null) => {
        setOutputFilesByModel((previous) => ({
            ...previous,
            [model]: outputFile,
        }))
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

        const normalizedReferenceText = referenceText.trim()
            ? await normalizeText({ text: referenceText })
            : ''
        let referenceVersionForMetrics = referenceVersionRef.current

        if (
            normalizedReferenceText &&
            normalizedReferenceText !== referenceText
        ) {
            referenceVersionForMetrics = setReferenceTextWithVersion(
                normalizedReferenceText
            )
        }

        setStatusMessage('')
        setHistoryMessage('')

        setModelLoading(model, true)
        setModelStatus(model, 'loading')
        setModelResult(model, '')
        setModelMetrics(model, EMPTY_METRICS)
        setModelOutputFile(model, null)

        try {
            const selectedVariant = modelVariants[model] || ''
            const {
                transcription,
                wer,
                cer,
                rtTime,
                modelVersion,
                audioDuration: responseAudioDuration,
                outputFile,
            } = await transcribeAudio(
                model,
                file,
                normalizedReferenceText,
                selectedVariant
            )
            let resolvedAudioDuration = responseAudioDuration ?? audioDuration
            if (resolvedAudioDuration === null && file) {
                resolvedAudioDuration = await getAudioDuration(file)
            }
            if (resolvedAudioDuration !== null) {
                setAudioDuration(resolvedAudioDuration)
            }
            const rtf = calculateRtf(rtTime, resolvedAudioDuration)

            setModelResult(
                model,
                transcription || 'No transcription text in response.'
            )
            setModelMetrics(model, { wer, cer, rtTime, rtf })
            setModelStatus(model, 'success')
            setModelVersion(model, modelVersion || selectedVariant)
            setModelOutputFile(model, outputFile)
            setMetricsVersionByModel((previous) => ({
                ...previous,
                [model]: referenceVersionForMetrics,
            }))

            return {
                model,
                transcription:
                    transcription || 'No transcription text in response.',
                wer,
                cer,
                rtTime,
                rtf,
                audioDuration: resolvedAudioDuration,
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
            setModelOutputFile(model, null)
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

        const normalizedReferenceText = await normalizeText({
            text: referenceText,
        })
        let referenceVersionForMetrics = referenceVersionRef.current
        if (normalizedReferenceText !== referenceText) {
            referenceVersionForMetrics = setReferenceTextWithVersion(
                normalizedReferenceText
            )
        }

        setStatusMessage('')
        setHistoryMessage('')
        setModelMetricsLoading(model, true)

        try {
            const { wer, cer } = await getMetrics({
                referenceText: normalizedReferenceText,
                hypothesisText: transcription,
                normalize: true,
            })
            const currentMetrics = metrics[model] ?? EMPTY_METRICS
            const rtf =
                currentMetrics.rtf ??
                calculateRtf(currentMetrics.rtTime, audioDuration)

            setModelMetrics(model, {
                wer,
                cer,
                rtTime: currentMetrics.rtTime ?? null,
                rtf,
            })
            setMetricsVersionByModel((previous) => ({
                ...previous,
                [model]: referenceVersionForMetrics,
            }))
        } catch (error) {
            console.error(error)
            setStatusMessage('Failed to recalculate metrics. Please try again.')
        } finally {
            setModelMetricsLoading(model, false)
        }
    }

    const handleRefreshAllMetrics = async () => {
        if (!referenceText.trim()) {
            setStatusMessage('Reference text is required.')
            return
        }

        const targets = models.filter(
            (model) => results[model.id]?.trim().length > 0
        )
        if (targets.length === 0) {
            setStatusMessage('Run at least one model first.')
            return
        }

        setStatusMessage('')
        setHistoryMessage('')

        await Promise.all(
            targets.map((model) => recalculateMetricsForModel(model.id))
        )
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
    const chartMetrics = useMemo(() => {
        const enabledEntries = models.filter((model) => enabledModels[model.id])

        return Object.fromEntries(
            enabledEntries.map((model) => [
                model.id,
                {
                    wer: metrics[model.id]?.wer ?? null,
                    cer: metrics[model.id]?.cer ?? null,
                    rtTime: metrics[model.id]?.rtTime ?? null,
                    rtf: metrics[model.id]?.rtf ?? null,
                },
            ])
        )
    }, [enabledModels, metrics, models])

    const canRefreshAllMetrics =
        referenceText.trim().length > 0 &&
        models.some((model) => results[model.id]?.trim().length > 0)

    const hasStaleMetrics = models.some((model) => {
        const metricsEntry = metrics[model.id] ?? EMPTY_METRICS
        const hasMetrics =
            metricsEntry.wer !== null ||
            metricsEntry.cer !== null ||
            metricsEntry.rtTime !== null ||
            metricsEntry.rtf !== null

        return (
            hasMetrics &&
            (metricsVersionByModel[model.id] ?? 0) < referenceVersion
        )
    })

    const hasAnyResult = models.some((model) => {
        const entry = results[model.id] ?? ''
        const modelMetrics = metrics[model.id] ?? EMPTY_METRICS
        return (
            entry.trim().length > 0 ||
            modelMetrics.wer !== null ||
            modelMetrics.cer !== null
        )
    })

    const handleSaveRun = async () => {
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
                    rtf:
                        metrics[model.id]?.rtf ??
                        calculateRtf(
                            metrics[model.id]?.rtTime ?? null,
                            audioDuration
                        ),
                    audioDuration,
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

        const outputUpdates = runResults
            .map((entry) => ({
                outputFile: outputFilesByModel[entry.model] ?? null,
                wer: entry.wer,
                cer: entry.cer,
            }))
            .filter(
                (
                    entry
                ): entry is {
                    outputFile: string
                    wer: number | null
                    cer: number | null
                } => Boolean(entry.outputFile)
            )

        if (outputUpdates.length === 0) {
            setHistoryMessage('Saved to local history.')
            return
        }

        const updateResults = await Promise.allSettled(
            outputUpdates.map((entry) =>
                updateOutputFile({
                    outputFile: entry.outputFile,
                    wer: entry.wer,
                    cer: entry.cer,
                    referenceText,
                })
            )
        )

        const failedUpdates = updateResults.filter(
            (result) => result.status === 'rejected'
        ).length
        const successUpdates = updateResults.length - failedUpdates

        if (failedUpdates === 0) {
            setHistoryMessage(
                'Saved to local history and updated output files.'
            )
            return
        }

        setHistoryMessage(
            `Saved to local history. Updated ${successUpdates} output files, ${failedUpdates} failed.`
        )
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
            <section
                className={`rounded-xl p-4 shadow-md ${styles.surface} ${styles.border}`}
            >
                <h3 className={`text-sm font-semibold ${styles.textPrimary}`}>
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
                            void resolveAudioDuration(selectedFile)
                        }}
                    />
                    <div>
                        <div className="mt-3">
                            <FilePicker
                                label="Reference text file"
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
                            className={`mt-3 min-h-28 w-full rounded-md p-3 text-sm ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                            value={referenceText}
                            onChange={(event) =>
                                setReferenceTextWithVersion(event.target.value)
                            }
                            placeholder="Paste reference text here"
                        />
                        <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                                    onClick={() => {
                                        void normalizeCurrentReferenceText()
                                    }}
                                    disabled={
                                        referenceTextNormalizing ||
                                        referenceText.trim().length === 0
                                    }
                                    type="button"
                                >
                                    {referenceTextNormalizing
                                        ? 'Normalizing...'
                                        : 'Tokenize reference text'}
                                </button>
                                <p className={`text-xs ${styles.textMuted}`}>
                                    Replaces punctuation and extra whitespace
                                    with the normalized tokenized form.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 ${
                                        hasStaleMetrics
                                            ? styles.buttonDangerSoft
                                            : `${styles.surface} ${styles.border} ${styles.textPrimary}`
                                    }`}
                                    onClick={() =>
                                        void handleRefreshAllMetrics()
                                    }
                                    disabled={!canRefreshAllMetrics}
                                    type="button"
                                >
                                    Refresh all metrics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section
                className={`rounded-xl p-4 shadow-md ${styles.surface} ${styles.border}`}
            >
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <h3
                            className={`text-sm font-semibold ${styles.textPrimary}`}
                        >
                            Saved results
                        </h3>
                        <p className={`mt-1 text-xs ${styles.textMuted}`}>
                            Give this run a name before saving so it is easier
                            to find later.
                        </p>
                    </div>
                    <button
                        className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:text-gray-400 ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                        onClick={handleSaveRun}
                        disabled={!hasAnyResult}
                    >
                        Save results
                    </button>
                </div>

                <div className="mt-4">
                    <label
                        htmlFor="save-name"
                        className={`block text-sm font-semibold ${styles.textPrimary}`}
                    >
                        Saved entry name
                    </label>
                    <input
                        id="save-name"
                        type="text"
                        className={`mt-2 w-full rounded-md px-3 py-2 text-sm ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                        value={saveName}
                        onChange={(event) => setSaveName(event.target.value)}
                        placeholder="Enter a custom name"
                    />
                    <p className={`mt-2 text-xs ${styles.textMuted}`}>
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
                        className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px active:shadow-none ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                        onClick={() => setAllModelsEnabled(!allModelsEnabled)}
                        type="button"
                    >
                        {allModelsEnabled ? 'Uncheck all' : 'Check all'}
                    </button>
                </div>

                <div className="mt-5">
                    <MetricsChartPanel
                        metricsByModel={chartMetrics}
                        title="Metrics overview"
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
                        const hasMetrics =
                            metricsEntry.wer !== null ||
                            metricsEntry.cer !== null ||
                            metricsEntry.rtTime !== null ||
                            metricsEntry.rtf !== null
                        const isMetricsStale =
                            hasMetrics &&
                            (metricsVersionByModel[modelId] ?? 0) <
                                referenceVersion
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
                                        <div
                                            className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 ${styles.surfaceMuted} ${styles.border}`}
                                        >
                                            <label
                                                className={`flex items-center gap-2 text-xs font-medium ${styles.textMuted}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className={`h-4 w-4 rounded ${styles.checkbox}`}
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
                                                <p
                                                    className={`truncate text-sm font-semibold ${styles.textPrimary}`}
                                                >
                                                    {modelLabel}
                                                </p>
                                            </div>
                                            <button
                                                className={`rounded-md p-1.5 transition hover:brightness-105 ${styles.surface} ${styles.border} ${styles.textPrimary}`}
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
                                                    <Minimize2
                                                        aria-hidden="true"
                                                        className="h-4 w-4"
                                                    />
                                                ) : (
                                                    <Maximize2
                                                        aria-hidden="true"
                                                        className="h-4 w-4"
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    }
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p
                                            className={`text-xs font-semibold uppercase tracking-wide ${styles.textMuted}`}
                                        >
                                            Transcription
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {modelVariantOptions.length > 0 ? (
                                                <select
                                                    className={`rounded-md px-2 py-1 text-xs ${styles.surface} ${styles.border} ${styles.textPrimary}`}
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
                                                className={`rounded-md p-1.5 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${styles.surface} ${styles.border} ${styles.textPrimary}`}
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
                                                <RotateCcw
                                                    aria-hidden="true"
                                                    className="h-4 w-4"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        className={`mt-2 min-h-28 w-full rounded-md p-3 text-sm ${styles.surfaceMuted} ${styles.border} ${styles.textPrimary}`}
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
                                                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                                                    isMetricsStale
                                                        ? styles.buttonDangerSoft
                                                        : styles.buttonAccentSoft
                                                }`}
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
                                                    ? 'Refreshing...'
                                                    : 'Refresh'}
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
