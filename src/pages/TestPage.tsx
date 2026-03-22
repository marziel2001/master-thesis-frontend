import { useState } from 'react'
import axios from 'axios'
import TranscriptionWidget from '../components/TranscriptionWidget'

const MODELS = [
    'openai',
    'whisperOffline',
    'googleStt',
    'azureStt',
    'amazonStt',
] as const
type ModelName = (typeof MODELS)[number]

function TestPage() {
    const [file, setFile] = useState<File | null>(null)
    const [statusMessage, setStatusMessage] = useState('')
    const [results, setResults] = useState<Record<ModelName, string>>({
        openai: '',
        whisperOffline: '',
        googleStt: '',
        azureStt: '',
        amazonStt: '',
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

    const updateModelEnabled = (model: ModelName, enabled: boolean) => {
        setEnabledModels((previous) => ({ ...previous, [model]: enabled }))
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
                    const formData = new FormData()
                    formData.append('file', file)

                    setModelLoading(model, true)
                    setModelResult(model, '')

                    try {
                        const response = await axios.post(
                            `http://127.0.0.1:8000/api/transcribe/${model}`,
                            formData,
                            {
                                headers: {
                                    Accept: 'application/json',
                                },
                            }
                        )

                        const data = response.data
                        const transcriptionText =
                            typeof data?.transcription === 'string'
                                ? data.transcription
                                : ''

                        setModelResult(
                            model,
                            transcriptionText ||
                                'No transcription text in response.'
                        )
                    } catch (error) {
                        console.error(error)
                        setModelResult(
                            model,
                            'Transcription failed for this model.'
                        )
                    } finally {
                        setModelLoading(model, false)
                    }
                })
            )
        } catch (err) {
            console.error(err)
            setStatusMessage(
                'Transcription request failed for one or more models.'
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
                        result={results[model]}
                        onCheckedChange={(checked) =>
                            updateModelEnabled(model, checked)
                        }
                    />
                ))}
            </div>
        </div>
    )
}

export default TestPage
