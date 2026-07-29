import { useMemo, useState } from 'react'
import {
    Button,
    FieldLabel,
    Panel,
    Row,
    Stack,
    Text,
    TextField,
} from '../../components/atoms'
import FilePicker from '../../components/molecules/FilePicker/FilePicker'
import MetricsChartPanel from '../../components/organisms/MetricsChartPanel/MetricsChartPanel'
import ModelRunCard from '../../components/organisms/ModelRunCard/ModelRunCard'
import ReferenceTextPanel from '../../components/organisms/ReferenceTextPanel/ReferenceTextPanel'
import { useAudioFile } from '../../hooks/useAudioFile'
import { useModelCatalog } from '../../hooks/useModelCatalog'
import { useModelRunStates } from '../../hooks/useModelRunStates'
import { useReferenceText } from '../../hooks/useReferenceText'
import { playTranscriptionFinishedSound } from '../../lib/audio'
import {
    formatCompactTimestamp,
    removeFileExtension,
    toSafeFileStem,
} from '../../lib/files'
import { EMPTY_METRICS, calculateRtf, hasAnyMetric } from '../../lib/metrics'
import { getMetrics } from '../../requests/metrics'
import { normalizeText } from '../../requests/normalizeText'
import { createRun } from '../../requests/runs'
import { transcribeAudio } from '../../requests/transcription'
import type { RunResult } from '../../requests/runs.types'
import type { Metrics } from '../../types/metrics'
import { saveRunAndSyncOutputs } from './saveRun'
import styles from './MainPage.module.css'

const TRANSCRIPTION_FAILED_TEXT =
    'There was an error during transcription. Please try again.'
const EMPTY_TRANSCRIPTION_TEXT = 'No transcription text in response.'

function buildDefaultSaveName(audioFile: File): string {
    const stem = toSafeFileStem(removeFileExtension(audioFile.name), 'audio')

    return `${stem}_${formatCompactTimestamp(new Date())}`
}

export default function MainPage() {
    const {
        models,
        loading: isCatalogLoading,
        error: catalogError,
        getModelLabel,
        getDefaultVariant,
        getVariants,
    } = useModelCatalog()

    const reference = useReferenceText()
    const { getModelState, updateModel, updateAllModels, toggleModelExpanded } =
        useModelRunStates(models, getDefaultVariant)

    const audio = useAudioFile()
    const [saveName, setSaveName] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [historyMessage, setHistoryMessage] = useState('')

    const clearMessages = () => {
        setStatusMessage('')
        setHistoryMessage('')
    }

    const handleAudioFileChange = (selectedFile: File | null) => {
        audio.select(selectedFile)
        setSaveName(selectedFile ? buildDefaultSaveName(selectedFile) : '')
    }

    const handleTokenizeReference = async () => {
        playTranscriptionFinishedSound()
        await reference.normalize()
    }

    /**
     * Normalises the reference text before it is used for metrics, and reports
     * which reference version the resulting metrics belong to.
     */
    const prepareReferenceForMetrics = async () => {
        const trimmed = reference.text.trim()
        if (!trimmed) {
            return { normalizedText: '', version: reference.getVersion() }
        }

        const normalizedText = await normalizeText({ text: reference.text })
        const version =
            normalizedText === reference.text
                ? reference.getVersion()
                : reference.setText(normalizedText)

        return { normalizedText, version }
    }

    const runTranscriptionForModel = async (
        modelId: string
    ): Promise<RunResult | null> => {
        if (!audio.file) {
            setStatusMessage('Select an audio file first.')
            return null
        }

        const { normalizedText, version } = await prepareReferenceForMetrics()
        const selectedVariant = getModelState(modelId).variant

        clearMessages()
        updateModel(modelId, {
            isTranscribing: true,
            status: 'loading',
            transcription: '',
            metrics: EMPTY_METRICS,
            outputFile: null,
        })

        try {
            const result = await transcribeAudio(
                modelId,
                audio.file,
                normalizedText,
                selectedVariant
            )

            const resolvedDuration = await audio.resolveDuration(
                result.audioDuration
            )

            const transcription =
                result.transcription || EMPTY_TRANSCRIPTION_TEXT
            const metrics: Metrics = {
                wer: result.wer,
                cer: result.cer,
                rtTime: result.rtTime,
                rtf: calculateRtf(result.rtTime, resolvedDuration),
            }
            const usedVariant = result.modelVersion || selectedVariant

            updateModel(modelId, {
                transcription,
                metrics,
                status: 'success',
                usedVariant,
                outputFile: result.outputFile,
                metricsReferenceVersion: version,
            })

            return {
                model: modelId,
                modelVersion: usedVariant || undefined,
                transcription,
                ...metrics,
                audioDuration: resolvedDuration,
                outputFile: result.outputFile,
            }
        } catch (error) {
            console.error(error)
            updateModel(modelId, {
                transcription: TRANSCRIPTION_FAILED_TEXT,
                metrics: EMPTY_METRICS,
                status: 'error',
                outputFile: null,
            })
            return null
        } finally {
            updateModel(modelId, { isTranscribing: false })
        }
    }

    const recalculateMetricsForModel = async (modelId: string) => {
        const state = getModelState(modelId)
        const transcription = state.transcription.trim()

        if (!transcription || !reference.text.trim()) {
            return
        }

        const { normalizedText, version } = await prepareReferenceForMetrics()

        clearMessages()
        updateModel(modelId, { isRecalculatingMetrics: true })

        try {
            const { wer, cer } = await getMetrics({
                referenceText: normalizedText,
                hypothesisText: transcription,
                normalize: true,
            })

            updateModel(modelId, {
                metrics: {
                    wer,
                    cer,
                    rtTime: state.metrics.rtTime,
                    rtf:
                        state.metrics.rtf ??
                        calculateRtf(state.metrics.rtTime, audio.duration),
                },
                metricsReferenceVersion: version,
            })
        } catch (error) {
            console.error(error)
            setStatusMessage('Failed to recalculate metrics. Please try again.')
        } finally {
            updateModel(modelId, { isRecalculatingMetrics: false })
        }
    }

    const handleRefreshAllMetrics = async () => {
        if (!reference.text.trim()) {
            setStatusMessage('Reference text is required.')
            return
        }

        const targets = models.filter(
            (model) => getModelState(model.id).transcription.trim().length > 0
        )

        if (targets.length === 0) {
            setStatusMessage('Run at least one model first.')
            return
        }

        clearMessages()
        await Promise.all(
            targets.map((model) => recalculateMetricsForModel(model.id))
        )
    }

    /** Every model with something worth persisting. */
    const collectSavableResults = (): RunResult[] =>
        models.flatMap((model) => {
            const state = getModelState(model.id)
            const hasContent =
                state.transcription.trim().length > 0 ||
                state.metrics.wer !== null ||
                state.metrics.cer !== null

            if (!hasContent) {
                return []
            }

            return [
                {
                    model: model.id,
                    modelVersion:
                        state.usedVariant || state.variant || undefined,
                    transcription: state.transcription,
                    wer: state.metrics.wer,
                    cer: state.metrics.cer,
                    rtTime: state.metrics.rtTime,
                    rtf:
                        state.metrics.rtf ??
                        calculateRtf(state.metrics.rtTime, audio.duration),
                    audioDuration: audio.duration,
                    outputFile: state.outputFile,
                },
            ]
        })

    const buildRunRequest = (results: RunResult[]) => ({
        name: saveName.trim() || undefined,
        referenceText: reference.text,
        audioFileName: audio.fileName || null,
        results,
    })

    const handleSaveResults = async () => {
        const results = collectSavableResults()

        if (results.length === 0) {
            setHistoryMessage('Nothing to save yet.')
            return
        }

        try {
            setHistoryMessage(
                await saveRunAndSyncOutputs(buildRunRequest(results))
            )
        } catch (error) {
            console.error(error)
            setHistoryMessage('Failed to save run on server.')
        }
    }

    const handleRunSelectedModels = async () => {
        if (!audio.file) {
            setStatusMessage('Select an audio file first.')
            return
        }

        if (isCatalogLoading) {
            setStatusMessage('Model catalog is still loading. Please wait.')
            return
        }

        if (catalogError) {
            setStatusMessage(
                'Failed to load model catalog. Refresh and try again.'
            )
            return
        }

        const selectedModelIds = models
            .filter((model) => getModelState(model.id).enabled)
            .map((model) => model.id)

        if (selectedModelIds.length === 0) {
            setStatusMessage('Select at least one transcription model.')
            return
        }

        clearMessages()

        const settled = await Promise.allSettled(
            selectedModelIds.map((modelId) => runTranscriptionForModel(modelId))
        )
        const results = settled.flatMap((entry) =>
            entry.status === 'fulfilled' && entry.value ? [entry.value] : []
        )

        if (results.length === 0) {
            return
        }

        playTranscriptionFinishedSound()

        const shouldSave = window.confirm(
            'The selected model run finished. Save this session to the server?'
        )

        if (!shouldSave) {
            return
        }

        // The batch flow only records the run; the per-model output files were
        // already written with these metrics by the transcribe endpoint.
        try {
            await createRun(buildRunRequest(results))
            setHistoryMessage('Saved run to server.')
        } catch (error) {
            console.error(error)
            setHistoryMessage('Failed to save run on server.')
        }
    }

    const areAllModelsEnabled =
        models.length > 0 &&
        models.every((model) => getModelState(model.id).enabled)

    const chartMetrics = useMemo(
        () =>
            Object.fromEntries(
                models
                    .filter((model) => getModelState(model.id).enabled)
                    .map((model) => [model.id, getModelState(model.id).metrics])
            ),
        [models, getModelState]
    )

    const isMetricsStaleFor = (modelId: string) => {
        const state = getModelState(modelId)

        return (
            hasAnyMetric(state.metrics) &&
            state.metricsReferenceVersion < reference.version
        )
    }

    const hasAnyResult = models.some((model) => {
        const state = getModelState(model.id)

        return (
            state.transcription.trim().length > 0 ||
            state.metrics.wer !== null ||
            state.metrics.cer !== null
        )
    })

    return (
        <>
            <Panel as="section" elevation="md">
                <Text as="h3" size="sm" weight="semibold">
                    Input sources
                </Text>
                <Stack gap={4} className={styles.sectionBody}>
                    <FilePicker
                        compact
                        label="Audio file"
                        accept="audio/*"
                        fileName={audio.fileName}
                        onFileChange={handleAudioFileChange}
                    />
                    <ReferenceTextPanel
                        compactFilePicker
                        filePickerLabel="Reference text file"
                        text={reference.text}
                        fileName={reference.fileName}
                        onTextChange={reference.setText}
                        onFileChange={(file) => void reference.loadFromFile(file)}
                        onTokenize={() => void handleTokenizeReference()}
                        isTokenizing={reference.isNormalizing}
                        tokenizeHint="Replaces punctuation and extra whitespace with the normalized tokenized form."
                        onRefreshAllMetrics={() =>
                            void handleRefreshAllMetrics()
                        }
                        canRefreshAllMetrics={
                            reference.text.trim().length > 0 &&
                            models.some(
                                (model) =>
                                    getModelState(model.id).transcription.trim()
                                        .length > 0
                            )
                        }
                        hasStaleMetrics={models.some((model) =>
                            isMetricsStaleFor(model.id)
                        )}
                    />
                </Stack>
            </Panel>

            <Panel as="section" elevation="md">
                <Row justify="between" align="start" gap={4}>
                    <div>
                        <Text as="h3" size="sm" weight="semibold">
                            Saved results
                        </Text>
                        <Text
                            size="xs"
                            tone="muted"
                            className={styles.sectionDescription}
                        >
                            Give this run a name before saving so it is easier to
                            find later.
                        </Text>
                    </div>
                    <Button
                        disabled={!hasAnyResult}
                        onClick={() => void handleSaveResults()}
                    >
                        Save results
                    </Button>
                </Row>

                <div className={styles.field}>
                    <FieldLabel htmlFor="save-name">
                        Saved entry name
                    </FieldLabel>
                    <TextField
                        id="save-name"
                        className={styles.fieldControl}
                        value={saveName}
                        onChange={(event) => setSaveName(event.target.value)}
                        placeholder="Enter a custom name"
                    />
                    <Text
                        size="xs"
                        tone="muted"
                        className={styles.fieldControl}
                    >
                        Default name is based on the audio file and the current
                        date.
                    </Text>
                </div>

                {statusMessage ? (
                    <Text tone="danger" className={styles.message}>
                        {statusMessage}
                    </Text>
                ) : null}

                {catalogError ? (
                    <Text tone="danger" className={styles.message}>
                        {catalogError}
                    </Text>
                ) : null}

                {historyMessage ? (
                    <Text tone="success" className={styles.message}>
                        {historyMessage}
                    </Text>
                ) : null}

                <Row gap={3} className={styles.actions}>
                    <Button
                        variant="primary"
                        disabled={
                            models.length === 0 ||
                            models.every(
                                (model) => !getModelState(model.id).enabled
                            )
                        }
                        onClick={() => void handleRunSelectedModels()}
                    >
                        Send to selected models
                    </Button>
                    <Button
                        onClick={() =>
                            updateAllModels({
                                enabled: !areAllModelsEnabled,
                                ...(areAllModelsEnabled
                                    ? { status: 'idle' as const }
                                    : {}),
                            })
                        }
                    >
                        {areAllModelsEnabled ? 'Uncheck all' : 'Check all'}
                    </Button>
                </Row>

                <div className={styles.chart}>
                    <MetricsChartPanel
                        metricsByModel={chartMetrics}
                        title="Metrics overview"
                    />
                </div>

                <div className={styles.modelGrid}>
                    {models.map((model) => {
                        const state = getModelState(model.id)
                        const cellClassName = [
                            styles.modelCell,
                            state.isExpanded ? styles.modelCellExpanded : '',
                        ]
                            .filter(Boolean)
                            .join(' ')

                        return (
                            <div key={model.id} className={cellClassName}>
                                <ModelRunCard
                                    modelLabel={getModelLabel(model.id)}
                                    state={state}
                                    variantOptions={getVariants(model.id)}
                                    referenceText={reference.text}
                                    canRun={
                                        Boolean(audio.file) && !isCatalogLoading
                                    }
                                    isMetricsStale={isMetricsStaleFor(model.id)}
                                    onToggleEnabled={(enabled) =>
                                        updateModel(model.id, {
                                            enabled,
                                            ...(enabled
                                                ? {}
                                                : { status: 'idle' as const }),
                                        })
                                    }
                                    onToggleExpanded={() =>
                                        toggleModelExpanded(model.id)
                                    }
                                    onVariantChange={(variant) =>
                                        updateModel(model.id, { variant })
                                    }
                                    onRun={() =>
                                        void runTranscriptionForModel(model.id)
                                    }
                                    onRefreshMetrics={() =>
                                        void recalculateMetricsForModel(
                                            model.id
                                        )
                                    }
                                />
                            </div>
                        )
                    })}
                </div>
            </Panel>
        </>
    )
}
