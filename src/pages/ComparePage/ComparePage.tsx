import { useMemo, useState } from 'react'
import { Button, Panel, Row, Stack, Text } from '../../components/atoms'
import PageHeading from '../../components/molecules/PageHeading/PageHeading'
import CompareEntryCard from '../../components/organisms/CompareEntryCard/CompareEntryCard'
import MetricsChartPanel from '../../components/organisms/MetricsChartPanel/MetricsChartPanel'
import ReferenceTextPanel from '../../components/organisms/ReferenceTextPanel/ReferenceTextPanel'
import RunHistoryPanel from '../../components/organisms/RunHistoryPanel/RunHistoryPanel'
import { useModelCatalog } from '../../hooks/useModelCatalog'
import { useReferenceText } from '../../hooks/useReferenceText'
import { useRunHistory } from '../../hooks/useRunHistory'
import { CSV_MIME_TYPE } from '../../lib/csv'
import {
    downloadTextFile,
    formatHyphenTimestamp,
    toSafeFileStem,
} from '../../lib/files'
import { createLocalId } from '../../lib/ids'
import { EMPTY_METRICS, hasAnyMetric } from '../../lib/metrics'
import { getMetrics } from '../../requests/metrics'
import { createRun } from '../../requests/runs'
import type { RunData, RunResult } from '../../requests/runs.types'
import type { CompareEntry } from '../../types/compare'
import {
    buildCompareCsv,
    hasExportableValues,
    toCompareCsvRows,
} from './compareCsv'
import { parseResultJson } from './importResultJson'
import styles from './ComparePage.module.css'

const DEFAULT_EXPORT_NAME = 'results-reader'

function createEntry(modelId: string, referenceVersion: number): CompareEntry {
    return {
        id: createLocalId('compare-entry'),
        modelId,
        modelVersion: undefined,
        fileName: '',
        text: '',
        textVersion: 0,
        metrics: EMPTY_METRICS,
        metricsVersion: referenceVersion,
        metricsTextVersion: 0,
        audioDuration: null,
        status: 'idle',
    }
}

function toEntries(run: RunData, referenceVersion: number): CompareEntry[] {
    return run.results.map((result) => ({
        id: createLocalId('compare-entry'),
        modelId: result.model,
        modelVersion: result.modelVersion,
        fileName: '',
        text: result.transcription,
        textVersion: 0,
        metrics: {
            wer: result.wer,
            cer: result.cer,
            rtTime: result.rtTime,
            rtf: result.rtf ?? null,
        },
        metricsVersion: referenceVersion,
        metricsTextVersion: 0,
        audioDuration: result.audioDuration ?? null,
        status: 'success',
    }))
}

export default function ComparePage() {
    const {
        models,
        loading: isCatalogLoading,
        error: catalogError,
        getModelLabel,
    } = useModelCatalog()

    const reference = useReferenceText()
    const history = useRunHistory()

    const [entries, setEntries] = useState<CompareEntry[]>([])
    const [selectedRunId, setSelectedRunId] = useState('')
    const [pendingDeleteRunId, setPendingDeleteRunId] = useState('')
    const [saveName, setSaveName] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [historyMessage, setHistoryMessage] = useState('')

    const defaultModelId = models[0]?.id ?? ''

    // Seeds the first, empty entry as soon as the catalog resolves. Adjusting
    // state during render is React's documented alternative to a syncing
    // effect, and avoids the extra commit an effect would cost.
    const [seededModelId, setSeededModelId] = useState('')
    if (defaultModelId && seededModelId !== defaultModelId) {
        setSeededModelId(defaultModelId)
        setEntries((previous) =>
            previous.length > 0
                ? previous.map((entry) =>
                      entry.modelId
                          ? entry
                          : { ...entry, modelId: defaultModelId }
                  )
                : [createEntry(defaultModelId, reference.getVersion())]
        )
    }

    const updateEntry = (
        entryId: string,
        updater: (entry: CompareEntry) => CompareEntry
    ) => {
        setEntries((previous) =>
            previous.map((entry) =>
                entry.id === entryId ? updater(entry) : entry
            )
        )
    }

    const handleAddEntry = () => {
        if (!defaultModelId) {
            return
        }

        setEntries((previous) => [
            ...previous,
            createEntry(defaultModelId, reference.getVersion()),
        ])
    }

    /** The last entry is kept so the page never renders an empty list. */
    const handleRemoveEntry = (entryId: string) => {
        setEntries((previous) =>
            previous.length > 1
                ? previous.filter((entry) => entry.id !== entryId)
                : previous
        )
    }

    const handleResultJsonChange = async (
        entryId: string,
        file: File | null
    ) => {
        if (!file) {
            updateEntry(entryId, (entry) => ({ ...entry, fileName: '' }))
            return
        }

        try {
            const imported = parseResultJson(
                await file.text(),
                models.map((model) => model.id)
            )

            updateEntry(entryId, (entry) => ({
                ...entry,
                modelId: imported.modelId ?? entry.modelId,
                modelVersion: imported.modelVersion || undefined,
                fileName: file.name,
                text: imported.transcription,
                textVersion: entry.textVersion + 1,
                audioDuration: imported.audioDuration,
                metrics: imported.metrics,
                metricsVersion: reference.getVersion(),
                metricsTextVersion: entry.textVersion + 1,
                status: 'success',
            }))
        } catch (error) {
            console.error(error)
            setStatusMessage('Invalid JSON result file.')
            updateEntry(entryId, (entry) => ({ ...entry, status: 'error' }))
        }
    }

    const handleHypothesisFileChange = async (
        entryId: string,
        file: File | null
    ) => {
        if (!file) {
            updateEntry(entryId, (entry) => ({ ...entry, fileName: '' }))
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

    const computeMetricsForEntry = async (entryId: string) => {
        if (!reference.text.trim()) {
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
            const { wer, cer } = await getMetrics({
                referenceText: reference.text,
                hypothesisText: target.text,
            })

            updateEntry(entryId, (entry) => ({
                ...entry,
                metrics: { ...entry.metrics, wer, cer },
                metricsVersion: reference.getVersion(),
                metricsTextVersion: entry.textVersion,
                status: 'success',
            }))
        } catch (error) {
            console.error(error)
            updateEntry(entryId, (entry) => ({ ...entry, status: 'error' }))
        }
    }

    const handleRefreshAllMetrics = async () => {
        if (!reference.text.trim()) {
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
            targets.map((entry) => computeMetricsForEntry(entry.id))
        )
    }

    const handleSelectRun = (runId: string) => {
        setSelectedRunId(runId)
        setPendingDeleteRunId('')

        const run = history.findRun(runId)
        if (!run) {
            return
        }

        const referenceVersion = reference.setText(run.referenceText)
        reference.clearFileName()
        setSaveName(run.name?.trim() || '')
        setEntries(
            run.results.length > 0
                ? toEntries(run, referenceVersion)
                : defaultModelId
                  ? [createEntry(defaultModelId, referenceVersion)]
                  : []
        )
    }

    const handleDeleteSelectedRun = async () => {
        if (!selectedRunId) {
            setHistoryMessage('Select a history entry first.')
            return
        }

        if (pendingDeleteRunId !== selectedRunId) {
            setPendingDeleteRunId(selectedRunId)
            setHistoryMessage('Click delete again to confirm removal.')
            return
        }

        try {
            await history.remove(selectedRunId)
        } catch (error) {
            console.error(error)
            setStatusMessage('Failed to delete run on server.')
            return
        }

        setSelectedRunId('')
        setPendingDeleteRunId('')
        setSaveName('')
        reference.clear()
        setEntries(
            defaultModelId
                ? [createEntry(defaultModelId, reference.getVersion())]
                : []
        )
        setHistoryMessage('History entry deleted.')
    }

    const handleSaveCurrentRun = async () => {
        if (!reference.text.trim()) {
            setStatusMessage('Reference text is required.')
            return
        }

        const results: RunResult[] = entries
            .filter(
                (entry) =>
                    entry.text.trim().length > 0 ||
                    entry.metrics.wer !== null ||
                    entry.metrics.cer !== null ||
                    entry.metrics.rtTime !== null
            )
            .map((entry) => ({
                model: entry.modelId,
                modelVersion: entry.modelVersion || undefined,
                transcription: entry.text,
                wer: entry.metrics.wer,
                cer: entry.metrics.cer,
                rtTime: entry.metrics.rtTime,
                rtf: entry.metrics.rtf,
                audioDuration: entry.audioDuration,
            }))

        if (results.length === 0) {
            setStatusMessage('Add at least one result before saving.')
            return
        }

        try {
            await createRun({
                name: saveName.trim() || undefined,
                referenceText: reference.text,
                audioFileName: reference.fileName || null,
                results,
            })
            await history.reload()
        } catch (error) {
            console.error(error)
            setStatusMessage('Failed to save run on server.')
            return
        }

        setSelectedRunId('')
        setPendingDeleteRunId('')
        setSaveName('')
        setHistoryMessage('History entry saved.')
    }

    const handleExportCsv = () => {
        const trimmedName = saveName.trim()
        const rows = toCompareCsvRows(entries, trimmedName || 'Unsaved run')

        if (rows.length === 0) {
            setStatusMessage('Nothing to export yet.')
            return
        }

        const baseName = toSafeFileStem(
            trimmedName || DEFAULT_EXPORT_NAME,
            DEFAULT_EXPORT_NAME
        )
        const fileName = `${baseName}-${formatHyphenTimestamp(new Date())}.csv`

        downloadTextFile(buildCompareCsv(rows), fileName, CSV_MIME_TYPE)
    }

    const chartMetrics = useMemo(
        () =>
            Object.fromEntries(
                entries.map((entry, index) => {
                    const label = entry.modelId
                        ? getModelLabel(entry.modelId)
                        : `Model ${index + 1}`

                    return [
                        entry.modelVersion
                            ? `${label} (${entry.modelVersion})`
                            : label,
                        entry.metrics,
                    ]
                })
            ),
        [entries, getModelLabel]
    )

    const isEntryMetricsStale = (entry: CompareEntry) =>
        hasAnyMetric(entry.metrics) &&
        (entry.metricsVersion < reference.version ||
            entry.metricsTextVersion < entry.textVersion)

    return (
        <Stack gap={6}>
            <PageHeading
                as="h2"
                title="Results reader"
                description="Compare any text outputs without re-running transcription."
            />

            <Panel as="section" elevation="sm">
                <Stack gap={4}>
                    <RunHistoryPanel
                        runs={history.runs}
                        selectedRunId={selectedRunId}
                        onSelectRun={handleSelectRun}
                        isDeleteConfirmPending={
                            Boolean(selectedRunId) &&
                            pendingDeleteRunId === selectedRunId
                        }
                        onDeleteSelectedRun={() =>
                            void handleDeleteSelectedRun()
                        }
                        onReload={() => void history.reload()}
                        saveName={saveName}
                        onSaveNameChange={setSaveName}
                        onSaveRun={() => void handleSaveCurrentRun()}
                        onExportCsv={handleExportCsv}
                        canExportCsv={entries.some(hasExportableValues)}
                        message={historyMessage}
                    />

                    <ReferenceTextPanel
                        filePickerLabel="Reference text"
                        textAreaMinHeight="md"
                        text={reference.text}
                        fileName={reference.fileName}
                        onTextChange={reference.setText}
                        onFileChange={(file) => void reference.loadFromFile(file)}
                        onTokenize={() => void reference.normalize()}
                        isTokenizing={reference.isNormalizing}
                        tokenizeHint="Replace punctuation and whitespace with the normalized form on demand."
                        onRefreshAllMetrics={() =>
                            void handleRefreshAllMetrics()
                        }
                        canRefreshAllMetrics={
                            reference.text.trim().length > 0 &&
                            entries.some(
                                (entry) => entry.text.trim().length > 0
                            )
                        }
                        hasStaleMetrics={entries.some(isEntryMetricsStale)}
                    />

                    <Row gap={3}>
                        <Button
                            disabled={!defaultModelId || isCatalogLoading}
                            onClick={handleAddEntry}
                        >
                            Add model
                        </Button>
                    </Row>
                </Stack>
            </Panel>

            {statusMessage ? (
                <Text tone="danger">{statusMessage}</Text>
            ) : null}

            {history.loadError ? (
                <Text tone="danger">{history.loadError}</Text>
            ) : null}

            {catalogError ? <Text tone="danger">{catalogError}</Text> : null}

            <MetricsChartPanel
                metricsByModel={chartMetrics}
                title="Compare metrics"
            />

            <div className={styles.entryList}>
                {entries.map((entry, index) => (
                    <CompareEntryCard
                        key={entry.id}
                        entry={entry}
                        models={models}
                        modelLabel={
                            entry.modelId
                                ? getModelLabel(entry.modelId)
                                : `Model ${index + 1}`
                        }
                        referenceText={reference.text}
                        isMetricsStale={isEntryMetricsStale(entry)}
                        onModelChange={(modelId) =>
                            updateEntry(entry.id, (current) => ({
                                ...current,
                                modelId,
                                modelVersion: undefined,
                            }))
                        }
                        onTextChange={(text) =>
                            updateEntry(entry.id, (current) => ({
                                ...current,
                                text,
                                textVersion: current.textVersion + 1,
                            }))
                        }
                        onHypothesisFileChange={(file) =>
                            void handleHypothesisFileChange(entry.id, file)
                        }
                        onResultJsonChange={(file) =>
                            void handleResultJsonChange(entry.id, file)
                        }
                        onComputeMetrics={() =>
                            void computeMetricsForEntry(entry.id)
                        }
                        onRemove={() => handleRemoveEntry(entry.id)}
                    />
                ))}
            </div>
        </Stack>
    )
}
