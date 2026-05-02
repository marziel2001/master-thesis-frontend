import { useMemo, useState, type ChangeEvent } from 'react'
import ColoredDiff from '../components/ColoredDiff'
import MetricsGrid from '../components/MetricsGrid'
import MetricsChartPanel from '../components/MetricsChartPanel'
import { getMetrics } from '../requests/metrics'
import { formatRunLabel, loadHistory } from '../utils/resultsHistory'
import type { CompareEntry, EntryMetrics } from './ComparePage.types'
import type { StoredRun } from '../utils/resultsHistory.types'

const EMPTY_METRICS: EntryMetrics = {
    wer: null,
    cer: null,
}

const createEntry = (): CompareEntry => ({
    id: Math.random().toString(36).slice(2),
    model: '',
    text: '',
    metrics: EMPTY_METRICS,
    status: 'idle',
})

export default function ComparePage() {
    const [referenceText, setReferenceText] = useState('')
    const [entries, setEntries] = useState<CompareEntry[]>([createEntry()])
    const [history, setHistory] = useState<StoredRun[]>(() => loadHistory())
    const [selectedRunId, setSelectedRunId] = useState('')
    const [statusMessage, setStatusMessage] = useState('')

    const updateEntry = (
        id: string,
        updater: (entry: CompareEntry) => CompareEntry
    ) => {
        setEntries((previous) =>
            previous.map((entry) => (entry.id === id ? updater(entry) : entry))
        )
    }

    const handleAddEntry = () => {
        setEntries((previous) => [...previous, createEntry()])
    }

    const handleRemoveEntry = (id: string) => {
        setEntries((previous) =>
            previous.length > 1
                ? previous.filter((entry) => entry.id !== id)
                : previous
        )
    }

    const handleReferenceFile = async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        const text = await file.text()
        setReferenceText(text)
    }

    const handleEntryFile = async (
        entryId: string,
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        const text = await file.text()
        updateEntry(entryId, (entry) => ({ ...entry, text }))
    }

    const handleComputeMetrics = async () => {
        if (!referenceText.trim()) {
            setStatusMessage('Reference text is required.')
            return
        }

        const targets = entries.filter((entry) => entry.text.trim().length > 0)

        if (targets.length === 0) {
            setStatusMessage('Add at least one hypothesis text.')
            return
        }

        setStatusMessage('')

        const targetIds = new Set(targets.map((entry) => entry.id))

        setEntries((previous) =>
            previous.map((entry) =>
                targetIds.has(entry.id)
                    ? { ...entry, status: 'loading' }
                    : entry
            )
        )

        await Promise.all(
            targets.map(async (entry) => {
                try {
                    const metrics = await getMetrics({
                        referenceText,
                        hypothesisText: entry.text,
                    })

                    updateEntry(entry.id, (current) => ({
                        ...current,
                        metrics,
                        status: 'success',
                    }))
                } catch (error) {
                    console.error(error)
                    updateEntry(entry.id, (current) => ({
                        ...current,
                        status: 'error',
                    }))
                }
            })
        )
    }

    const handleReloadHistory = () => {
        const next = loadHistory()
        setHistory(next)
    }

    const handleSelectRun = (event: ChangeEvent<HTMLSelectElement>) => {
        const runId = event.target.value
        setSelectedRunId(runId)
        const run = history.find((item) => item.id === runId)
        if (!run) {
            return
        }

        setReferenceText(run.referenceText)
        setEntries(
            run.results.length > 0
                ? run.results.map((result) => ({
                      id: Math.random().toString(36).slice(2),
                      model: result.model,
                      text: result.transcription,
                      metrics: {
                          wer: result.wer,
                          cer: result.cer,
                      },
                      status: 'success',
                  }))
                : [createEntry()]
        )
    }

    const metricsByModel = useMemo(() => {
        return Object.fromEntries(
            entries
                .filter((entry) => entry.model.trim().length > 0)
                .map((entry) => [
                    entry.model,
                    {
                        wer: entry.metrics.wer,
                        cer: entry.metrics.cer,
                    },
                ])
        )
    }, [entries])

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">
                    Text diff and metrics
                </h2>
                <p className="text-sm text-gray-600">
                    Compare any text outputs without re-running transcription.
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        className="w-full max-w-sm rounded-md border border-gray-300 bg-white p-2 text-sm"
                        value={selectedRunId}
                        onChange={handleSelectRun}
                    >
                        <option value="">Load from history</option>
                        {history.map((run) => (
                            <option key={run.id} value={run.id}>
                                {formatRunLabel(run)}
                            </option>
                        ))}
                    </select>
                    <button
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                        onClick={handleReloadHistory}
                    >
                        Reload history
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm font-medium text-gray-800">
                        Reference text
                    </label>
                    <input
                        type="file"
                        accept=".txt"
                        onChange={handleReferenceFile}
                        className="block w-full max-w-xs text-sm"
                    />
                </div>
                <textarea
                    className="min-h-32 w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-800"
                    value={referenceText}
                    onChange={(event) => setReferenceText(event.target.value)}
                    placeholder="Paste reference text here"
                />
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                    onClick={handleComputeMetrics}
                >
                    Compute metrics
                </button>
                <button
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition active:translate-y-px active:shadow-none"
                    onClick={handleAddEntry}
                >
                    Add model
                </button>
            </div>

            {statusMessage ? (
                <p className="text-sm text-red-600">{statusMessage}</p>
            ) : null}

            <MetricsChartPanel
                metricsByModel={metricsByModel}
                title="Compare WER/CER"
            />

            <div className="grid grid-cols-1 gap-4">
                {entries.map((entry, index) => (
                    <section
                        key={entry.id}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="text-xs font-semibold text-gray-600">
                                    Model
                                </label>
                                <input
                                    className="w-full max-w-xs rounded-md border border-gray-300 bg-white p-2 text-sm"
                                    placeholder={`Model ${index + 1}`}
                                    value={entry.model}
                                    onChange={(event) =>
                                        updateEntry(entry.id, (current) => ({
                                            ...current,
                                            model: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <button
                                className="rounded px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 active:bg-red-100 active:scale-95"
                                onClick={() => handleRemoveEntry(entry.id)}
                            >
                                Remove
                            </button>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <label className="text-xs font-semibold text-gray-600">
                                Hypothesis text
                            </label>
                            <input
                                type="file"
                                accept=".txt"
                                onChange={(event) =>
                                    handleEntryFile(entry.id, event)
                                }
                                className="block w-full max-w-xs text-sm"
                            />
                        </div>

                        <textarea
                            className="mt-3 min-h-28 w-full rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800"
                            value={entry.text}
                            onChange={(event) =>
                                updateEntry(entry.id, (current) => ({
                                    ...current,
                                    text: event.target.value,
                                }))
                            }
                            placeholder="Paste hypothesis text here"
                        />

                        <MetricsGrid
                            metrics={{
                                wer: entry.metrics.wer,
                                cer: entry.metrics.cer,
                                rtTime: null,
                            }}
                            showTime={false}
                        />

                        {entry.status === 'error' ? (
                            <p className="mt-2 text-xs text-red-500">
                                Failed to compute metrics.
                            </p>
                        ) : null}

                        <div className="mt-3">
                            <ColoredDiff
                                enabled={true}
                                referenceText={referenceText}
                                hypothesisText={entry.text}
                                modelName={entry.model || `Model ${index + 1}`}
                            />
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}
