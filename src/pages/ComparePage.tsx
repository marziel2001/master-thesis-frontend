import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import ColoredDiff from '../components/ColoredDiff'
import FilePicker from '../components/FilePicker'
import MetricsGrid from '../components/MetricsGrid'
import MetricsChartPanel from '../components/MetricsChartPanel'
import TranscriptionCard from '../components/TranscriptionCard'
import { useModelCatalog } from '../hooks/useModelCatalog'
import { getMetrics } from '../requests/metrics'
import { normalizeText } from '../requests/normalizeText'
import { createRun, deleteRun, listRuns } from '../requests/runs'
import { formatRunLabel } from '../utils/resultsHistory'
import styles from '../styles/theme.module.css'
import type { CompareEntry, EntryMetrics } from './ComparePage.types'
import type { RunData } from '../requests/runs.types'

type ImportedResultJson = {
    modelName?: unknown
    modelVersion?: unknown
    computeTime?: unknown
    audioDuration?: unknown
    filename?: unknown
    transcription?: unknown
    wer?: unknown
    cer?: unknown
}

const EMPTY_METRICS: EntryMetrics = {
    wer: null,
    cer: null,
    rtTime: null,
    rtf: null,
}

type CsvRow = {
    runName: string
    model: string
    modelVersion: string
    wer: number | null
    cer: number | null
    rtTime: number | null
    rtf: number | null
    audioDuration: number | null
}

const CSV_HEADERS: Array<keyof CsvRow> = [
    'runName',
    'model',
    'modelVersion',
    'wer',
    'cer',
    'rtTime',
    'rtf',
    'audioDuration',
]

const CSV_SEPARATOR = ';'

const toCsvValue = (value: CsvRow[keyof CsvRow]) => {
    if (value === null || value === undefined) {
        return ''
    }

    const rawValue = String(value)
    const escaped = rawValue.replace(/"/g, '""')
    return /[";\n\r]/.test(rawValue) ? `"${escaped}"` : escaped
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
    const [history, setHistory] = useState<RunData[]>([])
    const [selectedRunId, setSelectedRunId] = useState('')
    const [deleteConfirmRunId, setDeleteConfirmRunId] = useState('')
    const [saveName, setSaveName] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const referenceVersionRef = useRef(0)
    const [referenceVersion, setReferenceVersion] = useState(0)

    const defaultModelId = models[0]?.id ?? ''

    const bumpReferenceVersion = () => {
        referenceVersionRef.current += 1
        setReferenceVersion(referenceVersionRef.current)
        return referenceVersionRef.current
    }

    const setReferenceTextWithVersion = (text: string) => {
        setReferenceText(text)
        return bumpReferenceVersion()
    }

    const createEntry = (modelId: string): CompareEntry => ({
        id: Math.random().toString(36).slice(2),
        modelId,
        modelVersion: undefined,
        fileName: '',
        text: '',
        textVersion: 0,
        metrics: EMPTY_METRICS,
        metricsVersion: referenceVersionRef.current,
        metricsTextVersion: 0,
        audioDuration: null,
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

    const reloadRuns = async () => {
        try {
            const runs = await listRuns()
            setHistory(runs)
        } catch (error) {
            console.error(error)
            setStatusMessage('Failed to load runs from server.')
        }
    }

    useEffect(() => {
        void reloadRuns()
    }, [])

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

    const normalizeAndSetReferenceText = async (text: string) => {
        const normalized = await normalizeText({ text })
        setReferenceTextWithVersion(normalized)
        return normalized
    }

    const handleReferenceFile = async (file: File | null) => {
        if (!file) {
            setReferenceFileName('')
            setReferenceTextWithVersion('')
            return
        }

        const text = await file.text()
        setReferenceTextWithVersion(text)
        setReferenceFileName(file.name)
    }

    const getRtf = (
        rtTime: number | null,
        audioDuration: number | null
    ): number | null => {
        if (
            typeof rtTime !== 'number' ||
            typeof audioDuration !== 'number' ||
            !Number.isFinite(rtTime) ||
            !Number.isFinite(audioDuration) ||
            audioDuration <= 0
        ) {
            return null
        }

        return rtTime / audioDuration
    }

    const handleLoadResultJson = async (entryId: string, file: File | null) => {
        if (!file) {
            updateEntry(entryId, (entry) => ({
                ...entry,
                fileName: '',
            }))
            return
        }

        try {
            const parsed = JSON.parse(
                (await file.text()) || '{}'
            ) as ImportedResultJson
            const transcription =
                typeof parsed.transcription === 'string'
                    ? parsed.transcription
                    : ''
            const wer = typeof parsed.wer === 'number' ? parsed.wer : null
            const cer = typeof parsed.cer === 'number' ? parsed.cer : null
            const rtTime =
                typeof parsed.computeTime === 'number'
                    ? parsed.computeTime
                    : null
            const audioDuration =
                typeof parsed.audioDuration === 'number'
                    ? parsed.audioDuration
                    : null
            const modelName =
                typeof parsed.modelName === 'string' ? parsed.modelName : ''
            const modelVersion =
                typeof parsed.modelVersion === 'string'
                    ? parsed.modelVersion
                    : ''
            const resolvedModelId =
                modelName && models.some((model) => model.id === modelName)
                    ? modelName
                    : null

            updateEntry(entryId, (entry) => ({
                ...entry,
                modelId: resolvedModelId ?? entry.modelId,
                modelVersion: modelVersion || undefined,
                fileName: file.name,
                text: transcription,
                textVersion: entry.textVersion + 1,
                audioDuration,
                metrics: {
                    wer,
                    cer,
                    rtTime,
                    rtf: getRtf(rtTime, audioDuration),
                },
                metricsVersion: referenceVersionRef.current,
                metricsTextVersion: entry.textVersion + 1,
                status: 'success',
            }))
        } catch (error) {
            console.error(error)
            setStatusMessage('Invalid JSON result file.')
            updateEntry(entryId, (entry) => ({
                ...entry,
                status: 'error',
            }))
        }
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
            textVersion: entry.textVersion + 1,
            fileName: file.name,
        }))
    }

    const handleComputeMetricsForEntry = async (entryId: string) => {
        if (!referenceText.trim()) {
            setStatusMessage('Reference text is required.')
            return
        }

        const target = entries.find((entry) => entry.id === entryId)
        if (!target || target.text.trim().length === 0) {
            setStatusMessage('Add hypothesis text first.')
            return
        }

        setStatusMessage('')
        updateEntry(entryId, (entry) => ({ ...entry, status: 'loading' }))

        try {
            const metrics = await getMetrics({
                referenceText,
                hypothesisText: target.text,
            })

            updateEntry(entryId, (current) => ({
                ...current,
                metrics: {
                    ...current.metrics,
                    wer: metrics.wer,
                    cer: metrics.cer,
                },
                metricsVersion: referenceVersionRef.current,
                metricsTextVersion: current.textVersion,
                status: 'success',
            }))
        } catch (error) {
            console.error(error)
            updateEntry(entryId, (entry) => ({
                ...entry,
                status: 'error',
            }))
        }
    }

    const handleRefreshAllMetrics = async () => {
        if (!referenceText.trim()) {
            setStatusMessage('Reference text is required.')
            return
        }

        const targets = entries.filter((entry) => entry.text.trim().length > 0)
        if (targets.length === 0) {
            setStatusMessage('Add hypothesis text first.')
            return
        }

        setStatusMessage('')
        await Promise.all(
            targets.map((entry) => handleComputeMetricsForEntry(entry.id))
        )
    }

    const handleReloadHistory = () => {
        void reloadRuns()
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

        void (async () => {
            try {
                await deleteRun(selectedRunId)
                await reloadRuns()
                setSelectedRunId('')
                setDeleteConfirmRunId('')
                setStatusMessage('History entry deleted.')
                setReferenceTextWithVersion('')
                setReferenceFileName('')
                setSaveName('')
                setEntries(defaultModelId ? [createEntry(defaultModelId)] : [])
            } catch (error) {
                console.error(error)
                setStatusMessage('Failed to delete run on server.')
            }
        })()
    }

    const handleSaveCurrentRun = () => {
        if (!referenceText.trim()) {
            setStatusMessage('Reference text is required.')
            return
        }

        const runResults = entries
            .map((entry) => ({
                model: entry.modelId,
                modelVersion: entry.modelVersion || undefined,
                transcription: entry.text,
                wer: entry.metrics.wer,
                cer: entry.metrics.cer,
                rtTime: entry.metrics.rtTime,
                rtf: entry.metrics.rtf ?? null,
                audioDuration: entry.audioDuration ?? null,
            }))
            .filter(
                (entry) =>
                    entry.transcription.trim().length > 0 ||
                    entry.wer !== null ||
                    entry.cer !== null ||
                    entry.rtTime !== null
            )

        if (runResults.length === 0) {
            setStatusMessage('Add at least one result before saving.')
            return
        }

        void (async () => {
            try {
                await createRun({
                    name: saveName.trim() || undefined,
                    referenceText,
                    audioFileName: referenceFileName || null,
                    results: runResults,
                })
                await reloadRuns()
                setSelectedRunId('')
                setDeleteConfirmRunId('')
                setSaveName('')
                setStatusMessage('History entry saved.')
            } catch (error) {
                console.error(error)
                setStatusMessage('Failed to save run on server.')
            }
        })()
    }

    const handleExportCsv = () => {
        const resolvedRunName = saveName.trim() || 'Unsaved run'
        const rows: CsvRow[] = entries
            .map((entry) => ({
                runName: resolvedRunName,
                model: entry.modelId,
                modelVersion: entry.modelVersion ?? '',
                wer: entry.metrics.wer,
                cer: entry.metrics.cer,
                rtTime: entry.metrics.rtTime,
                rtf: entry.metrics.rtf,
                audioDuration: entry.audioDuration ?? null,
            }))
            .filter(
                (entry) =>
                    entry.wer !== null ||
                    entry.cer !== null ||
                    entry.rtTime !== null ||
                    entry.rtf !== null ||
                    entry.audioDuration !== null
            )

        if (rows.length === 0) {
            setStatusMessage('Nothing to export yet.')
            return
        }

        const csvLines = [
            CSV_HEADERS.join(CSV_SEPARATOR),
            ...rows.map((row) =>
                CSV_HEADERS.map((header) => toCsvValue(row[header])).join(
                    CSV_SEPARATOR
                )
            ),
        ]

        const csvContent = `${csvLines.join('\n')}\n`
        const baseName = (saveName.trim() || 'results-reader')
            .replace(/[^a-z0-9-_]+/gi, '_')
            .replace(/^_+|_+$/g, '')
        const timestamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/[:T]/g, '-')
        const fileName = `${baseName || 'results-reader'}-${timestamp}.csv`
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
    }

    const handleSelectRun = (event: ChangeEvent<HTMLSelectElement>) => {
        const runId = event.target.value
        setSelectedRunId(runId)
        setDeleteConfirmRunId('')
        const run = history.find((item) => item.id === runId)
        if (!run) {
            return
        }

        const nextReferenceVersion = setReferenceTextWithVersion(
            run.referenceText
        )
        setSaveName(run.name?.trim() || '')
        setReferenceFileName('')
        setEntries(
            run.results.length > 0
                ? run.results.map((result) => ({
                      id: Math.random().toString(36).slice(2),
                      modelId: result.model,
                      modelVersion: result.modelVersion,
                      fileName: '',
                      text: result.transcription,
                      textVersion: 0,
                      audioDuration: result.audioDuration ?? null,
                      metrics: {
                          wer: result.wer,
                          cer: result.cer,
                          rtTime: result.rtTime,
                          rtf: result.rtf ?? null,
                      },
                      metricsVersion: nextReferenceVersion,
                      metricsTextVersion: 0,
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

    const canExport = entries.some((entry) => {
        return (
            entry.metrics.wer !== null ||
            entry.metrics.cer !== null ||
            entry.metrics.rtTime !== null ||
            entry.metrics.rtf !== null ||
            entry.audioDuration !== null
        )
    })

    const canRefreshAllMetrics =
        referenceText.trim().length > 0 &&
        entries.some((entry) => entry.text.trim().length > 0)

    const hasStaleMetrics = entries.some((entry) => {
        const hasMetrics =
            entry.metrics.wer !== null ||
            entry.metrics.cer !== null ||
            entry.metrics.rtTime !== null ||
            entry.metrics.rtf !== null

        return (
            hasMetrics &&
            (entry.metricsVersion < referenceVersion ||
                entry.metricsTextVersion < entry.textVersion)
        )
    })

    const isHistoryStatus =
        statusMessage.startsWith('History entry') ||
        statusMessage.startsWith('Select a history entry') ||
        statusMessage.startsWith('Click delete again')

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
                        <div className="space-y-3">
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
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                                        selectedRunId
                                            ? deleteConfirmRunId ===
                                              selectedRunId
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
                                <button
                                    className={`rounded-md px-4 py-2 text-sm font-medium ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                                    onClick={handleReloadHistory}
                                >
                                    Reload history
                                </button>
                            </div>
                            <div className="w-full max-w-lg space-y-2">
                                <label
                                    htmlFor="results-save-name"
                                    className={`block text-sm font-semibold ${styles.textPrimary}`}
                                >
                                    Save as
                                </label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        id="results-save-name"
                                        type="text"
                                        className={`flex-1 min-w-55 rounded-md px-3 py-2 text-sm ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                                        value={saveName}
                                        onChange={(event) =>
                                            setSaveName(event.target.value)
                                        }
                                        placeholder="Enter a new result name"
                                    />
                                    <button
                                        className={`rounded-md px-4 py-2 text-sm font-medium transition ${styles.buttonAccentSoft}`}
                                        onClick={handleSaveCurrentRun}
                                        type="button"
                                    >
                                        Save run
                                    </button>
                                    <button
                                        className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                                        onClick={handleExportCsv}
                                        type="button"
                                        disabled={!canExport}
                                    >
                                        Export CSV
                                    </button>
                                </div>
                                <p className={`text-xs ${styles.textMuted}`}>
                                    This creates a new saved result and keeps
                                    older ones untouched.
                                </p>
                            </div>
                        </div>
                        {deleteConfirmRunId === selectedRunId &&
                        selectedRunId ? (
                            <p className={`mt-2 text-xs ${styles.textMuted}`}>
                                Click the delete button again to permanently
                                remove this history entry.
                            </p>
                        ) : null}
                        {isHistoryStatus ? (
                            <p className="mt-2 text-sm text-red-600">
                                {statusMessage}
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
                                setReferenceTextWithVersion(event.target.value)
                            }
                            placeholder="Paste reference text here"
                        />

                        <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    className={`rounded-md px-4 py-2 text-sm font-medium shadow-sm transition active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 ${styles.surface} ${styles.border} ${styles.textPrimary}`}
                                    onClick={() => {
                                        void normalizeAndSetReferenceText(
                                            referenceText
                                        )
                                    }}
                                    disabled={referenceText.trim().length === 0}
                                    type="button"
                                >
                                    Tokenize reference text
                                </button>
                                <p className={`text-xs ${styles.textMuted}`}>
                                    Replace punctuation and whitespace with the
                                    normalized form on demand.
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

                    <div className="flex flex-wrap items-center gap-3">
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

            {statusMessage && !isHistoryStatus ? (
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
                    const hasEntryMetrics =
                        entry.metrics.wer !== null ||
                        entry.metrics.cer !== null ||
                        entry.metrics.rtTime !== null ||
                        entry.metrics.rtf !== null
                    const isEntryMetricsStale =
                        hasEntryMetrics &&
                        (entry.metricsVersion < referenceVersion ||
                            entry.metricsTextVersion < entry.textVersion)

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
                                <div className="flex flex-wrap items-center gap-2">
                                    <FilePicker
                                        label="Load from json"
                                        accept=".json"
                                        fileName={entry.fileName}
                                        onFileChange={(file) =>
                                            void handleLoadResultJson(
                                                entry.id,
                                                file
                                            )
                                        }
                                        buttonLabel="Load from json"
                                        compact={true}
                                    />
                                    <button
                                        className="rounded px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 active:bg-red-100 active:scale-95"
                                        onClick={() =>
                                            handleRemoveEntry(entry.id)
                                        }
                                    >
                                        Remove
                                    </button>
                                </div>
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
                                        textVersion: current.textVersion + 1,
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
                                subtitle={
                                    entry.audioDuration !== null &&
                                    entry.audioDuration !== undefined
                                        ? `Audio duration: ${entry.audioDuration.toFixed(2)} s`
                                        : undefined
                                }
                                footer={
                                    <button
                                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                                            isEntryMetricsStale
                                                ? styles.buttonDangerSoft
                                                : styles.buttonAccentSoft
                                        }`}
                                        onClick={() =>
                                            void handleComputeMetricsForEntry(
                                                entry.id
                                            )
                                        }
                                        disabled={
                                            referenceText.trim().length === 0 ||
                                            entry.text.trim().length === 0 ||
                                            entry.status === 'loading'
                                        }
                                        type="button"
                                    >
                                        {entry.status === 'loading'
                                            ? 'Refreshing...'
                                            : 'Refresh'}
                                    </button>
                                }
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
