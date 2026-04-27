import { useState } from 'react'
import TranscriptionWidget from '../components/TranscriptionWidget'
import { transcribeAudio } from '../requests/transcription'

const MODELS = [
    'openai',
    'whisperOffline',
    'googleStt',
    'azureStt',
    'amazonStt',
] as const
type ModelName = (typeof MODELS)[number]
type ModelMetrics = {
    wer: number | null
    cer: number | null
}
type ModelStatus = 'idle' | 'loading' | 'success' | 'error'

const EMPTY_METRICS: ModelMetrics = {
    wer: null,
    cer: null,
}

function MainPage() {
    const [file, setFile] = useState<File | null>(null)
    const [referenceText, setReferenceText] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [results, setResults] = useState<Record<ModelName, string>>({
        openai: '',
        whisperOffline: '',
        googleStt: '',
        azureStt: '',
        amazonStt: '',
    })
    const [metrics, setMetrics] = useState<Record<ModelName, ModelMetrics>>({
        openai: EMPTY_METRICS,
        whisperOffline: EMPTY_METRICS,
        googleStt: EMPTY_METRICS,
        azureStt: EMPTY_METRICS,
        amazonStt: EMPTY_METRICS,
    })
    const [loadingState, setLoadingState] = useState<
        Record<ModelName, boolean>
    >({
        openai: false,
        whisperOffline: false,
        googleStt: false,
        azureStt: false,
        amazonStt: false,
    })
    const [statusByModel, setStatusByModel] = useState<
        Record<ModelName, ModelStatus>
    >({
        openai: 'idle',
        whisperOffline: 'idle',
        googleStt: 'idle',
        azureStt: 'idle',
        amazonStt: 'idle',
    })
    const [enabledModels, setEnabledModels] = useState<
        Record<ModelName, boolean>
    >({
        openai: true,
        whisperOffline: true,
        googleStt: true,
        azureStt: true,
        amazonStt: true,
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

    const updateModelEnabled = (model: ModelName, enabled: boolean) => {
        setEnabledModels((previous) => ({ ...previous, [model]: enabled }))
        if (!enabled) {
            setModelStatus(model, 'idle')
        }
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

        try {
            await Promise.all(
                selectedModels.map(async (model) => {
                    setModelLoading(model, true)
                    setModelStatus(model, 'loading')
                    setModelResult(model, '')
                    setModelMetrics(model, EMPTY_METRICS)

                    try {
                        const { transcription, wer, cer } =
                            await transcribeAudio(model, file, referenceText)

                        setModelResult(
                            model,
                            transcription ||
                                'No transcription text in response.'
                        )
                        setModelMetrics(model, { wer, cer })
                        setModelStatus(model, 'success')
                    } catch (error) {
                        console.error(error)
                        setModelResult(
                            model,
                            'There was an error during transcription. Please try again.'
                        )
                        setModelMetrics(model, EMPTY_METRICS)
                        setModelStatus(model, 'error')
                    } finally {
                        setModelLoading(model, false)
                    }
                })
            )
        } catch (err) {
            console.error(err)
            setStatusMessage(
                'There was an error during transcription. Please try again.'
            )
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {MODELS.map((model) => (
                    <TranscriptionWidget
                        key={model}
                        model={model}
                        checked={enabledModels[model]}
                        loading={loadingState[model]}
                        status={statusByModel[model]}
                        result={results[model]}
                        metrics={metrics[model]}
                        referenceText={referenceText}
                        onCheckedChange={(checked) =>
                            updateModelEnabled(model, checked)
                        }
                    />
                ))}
            </div>
        </div>
    )
}

export default MainPage
