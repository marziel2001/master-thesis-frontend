import { useMemo, useState } from 'react'
import MetricsChartPanel from '../components/MetricsChartPanel'
import TranscriptionWidget from '../components/TranscriptionWidget'
import { getMetrics } from '../requests/metrics'
import { transcribeAudio } from '../requests/transcription'
import { saveRun } from '../utils/resultsHistory'
import {
    MODELS,
    type ModelMetrics,
    type ModelName,
    type ModelStatus,
} from './MainPage.types'

const EMPTY_METRICS: ModelMetrics = {
    wer: null,
    cer: null,
    rtTime: null,
}

type FinishedModelResult = {
    model: ModelName
    transcription: string
    wer: number | null
    cer: number | null
    rtTime: number | null
}

function MainPage() {
    const [file, setFile] = useState<File | null>(null)
    const [referenceText, setReferenceText] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [historyMessage, setHistoryMessage] = useState('')
    const [results, setResults] = useState<Record<ModelName, string>>({
        openai: '',
        whisperOffline: '',
        whisperX: '',
        googleStt: '',
        azureStt: '',
        amazonStt: '',
    })
    const [metrics, setMetrics] = useState<Record<ModelName, ModelMetrics>>({
        openai: EMPTY_METRICS,
        whisperOffline: EMPTY_METRICS,
        whisperX: EMPTY_METRICS,
        googleStt: EMPTY_METRICS,
        azureStt: EMPTY_METRICS,
        amazonStt: EMPTY_METRICS,
    })
    const [loadingState, setLoadingState] = useState<
        Record<ModelName, boolean>
    >({
        openai: false,
        whisperOffline: false,
        whisperX: false,
        googleStt: false,
        azureStt: false,
        amazonStt: false,
    })
    const [metricsLoadingState, setMetricsLoadingState] = useState<
        Record<ModelName, boolean>
    >({
        openai: false,
        whisperOffline: false,
        whisperX: false,
        googleStt: false,
        azureStt: false,
        amazonStt: false,
    })
    const [statusByModel, setStatusByModel] = useState<
        Record<ModelName, ModelStatus>
    >({
        openai: 'idle',
        whisperOffline: 'idle',
        whisperX: 'idle',
        googleStt: 'idle',
        azureStt: 'idle',
        amazonStt: 'idle',
    })
    const [enabledModels, setEnabledModels] = useState<
        Record<ModelName, boolean>
    >({
        openai: false,
        whisperOffline: false,
        whisperX: false,
        googleStt: false,
        azureStt: false,
        amazonStt: false,
    })

    const setModelLoading = (model: ModelName, loading: boolean) => {
        setLoadingState((previous) => ({ ...previous, [model]: loading }))
    }

    const setModelResult = (model: ModelName, text: string) => {
        setResults((previous) => ({ ...previous, [model]: text }))
    }

    const setModelMetrics = (model: ModelName, value: ModelMetrics) => {
        setMetrics((previous) => ({ ...previous, [model]: value }))
    }

    const setModelStatus = (model: ModelName, status: ModelStatus) => {
        setStatusByModel((previous) => ({ ...previous, [model]: status }))
    }

    const setModelMetricsLoading = (model: ModelName, loading: boolean) => {
        setMetricsLoadingState((previous) => ({
            ...previous,
            [model]: loading,
        }))
    }

    const runTranscriptionForModel = async (
        model: ModelName
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
            const { transcription, wer, cer, rtTime } = await transcribeAudio(
                model,
                file,
                referenceText
            )

            setModelResult(
                model,
                transcription || 'No transcription text in response.'
            )
            setModelMetrics(model, { wer, cer, rtTime })
            setModelStatus(model, 'success')

            return {
                model,
                transcription:
                    transcription || 'No transcription text in response.',
                wer,
                cer,
                rtTime,
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

    const recalculateMetricsForModel = async (model: ModelName) => {
        const transcription = results[model].trim()
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
                rtTime: metrics[model].rtTime,
            })
        } catch (error) {
            console.error(error)
            setStatusMessage('Failed to recalculate metrics. Please try again.')
        } finally {
            setModelMetricsLoading(model, false)
        }
    }

    const updateModelEnabled = (model: ModelName, enabled: boolean) => {
        setEnabledModels((previous) => ({ ...previous, [model]: enabled }))
        if (!enabled) {
            setModelStatus(model, 'idle')
        }
    }

    const setAllModelsEnabled = (enabled: boolean) => {
        setEnabledModels(
            MODELS.reduce(
                (next, model) => ({
                    ...next,
                    [model]: enabled,
                }),
                {} as Record<ModelName, boolean>
            )
        )

        if (!enabled) {
            MODELS.forEach((model) => setModelStatus(model, 'idle'))
        }
    }

    const allModelsEnabled = MODELS.every((model) => enabledModels[model])
    const chartMetrics = useMemo(
        () =>
            Object.fromEntries(
                MODELS.map((model) => [
                    model,
                    {
                        wer: metrics[model].wer,
                        cer: metrics[model].cer,
                        rtTime: metrics[model].rtTime,
                    },
                ])
            ),
        [metrics]
    )

    const hasAnyResult = MODELS.some(
        (model) =>
            results[model].trim().length > 0 ||
            metrics[model].wer !== null ||
            metrics[model].cer !== null
    )

    const handleSaveRun = () => {
        if (!hasAnyResult) {
            setHistoryMessage('Nothing to save yet.')
            return
        }

        const runResults = MODELS.map((model) => ({
            model,
            transcription: results[model],
            wer: metrics[model].wer,
            cer: metrics[model].cer,
            rtTime: metrics[model].rtTime,
        })).filter(
            (entry) =>
                entry.transcription.trim().length > 0 ||
                entry.wer !== null ||
                entry.cer !== null
        )

        if (runResults.length === 0) {
            setHistoryMessage('Nothing to save yet.')
            return
        }

        saveRun({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            referenceText,
            results: runResults,
        })

        setHistoryMessage('Saved to local history.')
    }

    const saveBatchRun = (batchResults: FinishedModelResult[]) => {
        if (batchResults.length === 0) {
            setHistoryMessage('Nothing to save yet.')
            return
        }

        saveRun({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            referenceText,
            results: batchResults,
        })

        setHistoryMessage('Saved to local history.')
    }

    const handleUpload = async () => {
        if (!file) {
            setStatusMessage('Select an audio file first.')
            return
        }

        const selectedModels = MODELS.filter((model) => enabledModels[model])

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
                <input
                    className="block w-full max-w-sm rounded-md border border-gray-300 bg-white p-2 text-sm"
                    type="file"
                    accept="audio/*"
                    onChange={(event) =>
                        setFile(event.target.files?.[0] ?? null)
                    }
                />
                <button
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                    onClick={handleUpload}
                    disabled={MODELS.every((model) => !enabledModels[model])}
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
                {MODELS.map((model) => (
                    <TranscriptionWidget
                        key={model}
                        model={model}
                        checked={enabledModels[model]}
                        loading={loadingState[model]}
                        metricsLoading={metricsLoadingState[model]}
                        status={statusByModel[model]}
                        result={results[model]}
                        metrics={metrics[model]}
                        referenceText={referenceText}
                        onCheckedChange={(checked) =>
                            updateModelEnabled(model, checked)
                        }
                        onRerun={() => {
                            void runTranscriptionForModel(model)
                        }}
                        onRecalculateMetrics={() => {
                            void recalculateMetricsForModel(model)
                        }}
                        canRerun={file !== null}
                        canRecalculateMetrics={
                            results[model].trim().length > 0 &&
                            referenceText.trim().length > 0
                        }
                    />
                ))}
            </div>
        </div>
    )
}

export default MainPage
