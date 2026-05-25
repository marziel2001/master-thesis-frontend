import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import ColoredDiff from '../components/ColoredDiff'
import FilePicker from '../components/FilePicker'
import MetricsGrid from '../components/MetricsGrid'
import MetricsChartPanel from '../components/MetricsChartPanel'
import TranscriptionCard from '../components/TranscriptionCard'
import { useModelCatalog } from '../hooks/useModelCatalog'
import { getMetrics } from '../requests/metrics'
import { deleteRun, formatRunLabel, loadHistory } from '../utils/resultsHistory'
import styles from '../styles/theme.module.css'
import type { CompareEntry, EntryMetrics } from './ComparePage.types'
import type { StoredRun } from '../utils/resultsHistory.types'

const EMPTY_METRICS: EntryMetrics = {
    wer: null,
    cer: null,
    rtTime: null,
    rtf: null,
}

export default function ComparePage() {
    const {
        models,
        loading: modelCatalogLoading,
        error: modelCatalogError,
        getModelLabel,
    } = useModelCatalog()
    const [referenceText, setReferenceText] = useState('')
    const [referenceFileName, setReferenceFileName] = useState('')
    const [entries, setEntries] = useState<CompareEntry[]>([])
    const [history, setHistory] = useState<StoredRun[]>(() => loadHistory())
    const [selectedRunId, setSelectedRunId] = useState('')
    const [deleteConfirmRunId, setDeleteConfirmRunId] = useState('')
    const [statusMessage, setStatusMessage] = useState('')

    const defaultModelId = models[0]?.id ?? ''

    const createEntry = (modelId: string): CompareEntry => ({
        id: Math.random().toString(36).slice(2),
        modelId,
        modelVersion: undefined,
        fileName: '',
        text: '',
        metrics: EMPTY_METRICS,
        status: 'idle',
    })

    useEffect(() => {
        if (!defaultModelId) {
            return
        }

        const timerId = window.setTimeout(() => {
            setEntries((previous) =>
                previous.length > 0
                    ? previous.map((entry) =>
                          entry.modelId
                              ? entry
                              : { ...entry, modelId: defaultModelId }
                      )
                    : [createEntry(defaultModelId)]
            )
        }, 0)

        return () => {
            window.clearTimeout(timerId)
        }
    }, [defaultModelId])

    const updateEntry = (
        id: string,
        updater: (entry: CompareEntry) => CompareEntry
    ) => {
        setEntries((previous) =>
            previous.map((entry) => (entry.id === id ? updater(entry) : entry))
        )
    }

    const handleAddEntry = () => {
        if (!defaultModelId) {
            return
        }
        setEntries((previous) => [...previous, createEntry(defaultModelId)])
    }

    const handleRemoveEntry = (id: string) => {
        setEntries((previous) =>
            previous.length > 1
                ? previous.filter((entry) => entry.id !== id)
                : previous
        )
    }

    const handleReferenceFile = async (file: File | null) => {
        if (!file) {
            setReferenceFileName('')
            return
        }

        const text = await file.text()
        setReferenceText(text)
        setReferenceFileName(file.name)
    }

    const handleEntryFile = async (entryId: string, file: File | null) => {
        if (!file) {
            updateEntry(entryId, (entry) => ({
                ...entry,
                fileName: '',
            }))
            return
        }

        const text = await file.text()
        updateEntry(entryId, (entry) => ({
            ...entry,
            text,
            fileName: file.name,
        }))
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
                        metrics: { ...metrics, rtTime: null, rtf: null },
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

    const handleDeleteSelectedRun = () => {
        if (!selectedRunId) {
            setStatusMessage('Select a history entry first.')
            return
        }

        if (deleteConfirmRunId !== selectedRunId) {
            setDeleteConfirmRunId(selectedRunId)
            setStatusMessage('Click delete again to confirm removal.')
            return
        }

        const next = deleteRun(selectedRunId)
        setHistory(next)
        setSelectedRunId('')
        setDeleteConfirmRunId('')
        setStatusMessage('History entry deleted.')
        setReferenceText('')
        setReferenceFileName('')
        setEntries(defaultModelId ? [createEntry(defaultModelId)] : [])
    }

    const handleSelectRun = (event: ChangeEvent<HTMLSelectElement>) => {
        const runId = event.target.value
        setSelectedRunId(runId)
        setDeleteConfirmRunId('')
        const run = history.find((item) => item.id === runId)
        if (!run) {
            return
        }

        setReferenceText(run.referenceText)
        setReferenceFileName('')
        setEntries(
            run.results.length > 0
                ? run.results.map((result) => ({
                      id: Math.random().toString(36).slice(2),
                      modelId: result.model,
                      modelVersion: result.modelVersion,
                      fileName: '',
                      text: result.transcription,
                      metrics: {
                          wer: result.wer,
                          cer: result.cer,
                          rtTime: result.rtTime,
                          rtf: result.rtf ?? null,
                      },
                      status: 'success',
                  }))
                : defaultModelId
                  ? [createEntry(defaultModelId)]
                  : []
        )
    }

    const metricsByModel = useMemo(() => {
        return Object.fromEntries(
            entries.map((entry, index) => {
                const label = entry.modelId
                    ? getModelLabel(entry.modelId)
                    : `Model ${index + 1}`
                const version = entry.modelVersion
                const displayLabel = version ? `${label} (${version})` : label

                return [
                    displayLabel,
                    {
                        wer: entry.metrics.wer,
                        cer: entry.metrics.cer,
                        rtTime: entry.metrics.rtTime,
                        rtf: entry.metrics.rtf,
                    },
                ]
            })
        )
    }, [entries, getModelLabel])

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className={`text-2xl font-semibold ${styles.textPrimary}`}>
                    Results reader
                </h2>
                <p className={`text-sm ${styles.textMuted}`}>
                    Compare any text outputs without re-running transcription.
                </p>
            </div>

            <section
                className={`rounded-xl p-4 shadow-sm ${styles.surface} ${styles.border}`}
            >
                <div className="space-y-4">
                    <div
                        className={`rounded-xl p-4 shadow-sm ${styles.surfaceMuted} ${styles.border}`}
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                className={`w-full max-w-sm rounded-md p-2 text-sm ${styles.surface} ${styles.border} ${styles.textPrimary}`}
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
                                className={`rounded-md px-4 py-2 text-sm font-medium ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                                onClick={handleReloadHistory}
                            >
                                Reload history
                            </button>
                            <button
                                className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                                    selectedRunId
                                        ? deleteConfirmRunId === selectedRunId
                                            ? styles.buttonDangerSolid
                                            : styles.buttonDangerSoft
                                        : styles.buttonDisabled
                                }`}
                                onClick={handleDeleteSelectedRun}
                                disabled={!selectedRunId}
                                type="button"
                            >
                                {deleteConfirmRunId === selectedRunId
                                    ? 'Confirm delete'
                                    : 'Delete'}
                            </button>
                        </div>
                        {deleteConfirmRunId === selectedRunId &&
                        selectedRunId ? (
                            <p className={`mt-2 text-xs ${styles.textMuted}`}>
                                Click the delete button again to permanently
                                remove this history entry.
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-3">
                        <FilePicker
                            label="Reference text"
                            accept=".txt"
                            fileName={referenceFileName}
                            onFileChange={handleReferenceFile}
                            buttonLabel="Wybierz plik"
                        />
                        <textarea
                            className={`min-h-32 w-full rounded-md p-3 text-sm ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                            value={referenceText}
                            onChange={(event) =>
                                setReferenceText(event.target.value)
                            }
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
                            className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px active:shadow-none ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                            onClick={handleAddEntry}
                            disabled={!defaultModelId || modelCatalogLoading}
                        >
                            Add model
                        </button>
                    </div>
                </div>
            </section>

            {statusMessage ? (
                <p className="text-sm text-red-600">{statusMessage}</p>
            ) : null}

            {modelCatalogError ? (
                <p className="text-sm text-red-600">{modelCatalogError}</p>
            ) : null}

            <MetricsChartPanel
                metricsByModel={metricsByModel}
                title="Compare metrics"
            />

            <div className="grid grid-cols-1 gap-4">
                {entries.map((entry, index) => {
                    const modelLabel = entry.modelId
                        ? getModelLabel(entry.modelId)
                        : `Model ${index + 1}`
                    const displayLabel = entry.modelVersion
                        ? `${modelLabel} (${entry.modelVersion})`
                        : modelLabel

                    return (
                        <TranscriptionCard
                            key={entry.id}
                            status={entry.status}
                            title={modelLabel}
                            subtitle={
                                entry.modelVersion
                                    ? `Model used: ${entry.modelVersion}`
                                    : undefined
                            }
                            headerExtras={
                                <>
                                    <label
                                        className={`text-xs font-semibold ${styles.textMuted}`}
                                    >
                                        Model
                                    </label>
                                    <select
                                        className={`w-full max-w-xs rounded-md p-2 text-sm ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                                        value={entry.modelId}
                                        onChange={(event) =>
                                            updateEntry(
                                                entry.id,
                                                (current) => ({
                                                    ...current,
                                                    modelId: event.target.value,
                                                    modelVersion: undefined,
                                                })
                                            )
                                        }
                                    >
                                        <option value="" disabled>
                                            Select model
                                        </option>
                                        {models.map((model) => (
                                            <option
                                                key={model.id}
                                                value={model.id}
                                            >
                                                {model.label}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            }
                            headerActions={
                                <button
                                    className="rounded px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 active:bg-red-100 active:scale-95"
                                    onClick={() => handleRemoveEntry(entry.id)}
                                >
                                    Remove
                                </button>
                            }
                        >
                            <FilePicker
                                label="Hypothesis text"
                                accept=".txt"
                                fileName={entry.fileName}
                                onFileChange={(file) =>
                                    handleEntryFile(entry.id, file)
                                }
                                buttonLabel="Wybierz plik"
                            />

                            <textarea
                                className={`mt-3 min-h-28 w-full rounded-md p-3 text-sm ${styles.surfaceMuted} ${styles.border} ${styles.textPrimary}`}
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
                                    rtTime: entry.metrics.rtTime,
                                }}
                                showTime={true}
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
                                    modelName={displayLabel}
                                />
                            </div>
                        </TranscriptionCard>
                    )
                })}
            </div>
        </div>
    )
}
