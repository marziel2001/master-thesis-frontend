import { Button, FieldLabel, Row, Select, Text, TextArea } from '../../atoms'
import FilePicker from '../../molecules/FilePicker/FilePicker'
import MetricsGrid from '../../molecules/MetricsGrid/MetricsGrid'
import ColoredDiff from '../ColoredDiff/ColoredDiff'
import TranscriptionCard from '../TranscriptionCard/TranscriptionCard'
import { SECONDS_FRACTION_DIGITS } from '../../../lib/metrics'
import type { ModelCatalogEntry } from '../../../hooks/useModelCatalog'
import type { CompareEntry } from '../../../types/compare'
import styles from './CompareEntryCard.module.css'

export type CompareEntryCardProps = {
    entry: CompareEntry
    models: readonly ModelCatalogEntry[]
    modelLabel: string
    referenceText: string
    /** True when the metrics predate the reference or hypothesis text. */
    isMetricsStale: boolean
    onModelChange: (modelId: string) => void
    onTextChange: (text: string) => void
    onHypothesisFileChange: (file: File | null) => void
    onResultJsonChange: (file: File | null) => void
    onComputeMetrics: () => void
    onRemove: () => void
}

export default function CompareEntryCard({
    entry,
    models,
    modelLabel,
    referenceText,
    isMetricsStale,
    onModelChange,
    onTextChange,
    onHypothesisFileChange,
    onResultJsonChange,
    onComputeMetrics,
    onRemove,
}: CompareEntryCardProps) {
    const displayLabel = entry.modelVersion
        ? `${modelLabel} (${entry.modelVersion})`
        : modelLabel

    const isComputing = entry.status === 'loading'

    return (
        <TranscriptionCard
            status={entry.status}
            title={modelLabel}
            subtitle={
                entry.modelVersion
                    ? `Model used: ${entry.modelVersion}`
                    : undefined
            }
            titleAdornment={
                <>
                    <FieldLabel size="xs" tone="muted">
                        Model
                    </FieldLabel>
                    <Select
                        fullWidth
                        className={styles.modelSelect}
                        value={entry.modelId}
                        onChange={(event) => onModelChange(event.target.value)}
                    >
                        <option value="" disabled>
                            Select model
                        </option>
                        {models.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.label}
                            </option>
                        ))}
                    </Select>
                </>
            }
            actions={
                <Row gap={2}>
                    <FilePicker
                        compact
                        label="Load from json"
                        accept=".json"
                        fileName={entry.fileName}
                        onFileChange={onResultJsonChange}
                        buttonLabel="Load from json"
                    />
                    <Button variant="ghostDanger" size="xs" onClick={onRemove}>
                        Remove
                    </Button>
                </Row>
            }
        >
            <FilePicker
                label="Hypothesis text"
                accept=".txt"
                fileName={entry.fileName}
                onFileChange={onHypothesisFileChange}
            />

            <TextArea
                className={styles.hypothesisText}
                surface="muted"
                value={entry.text}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder="Paste hypothesis text here"
            />

            <div className={styles.metrics}>
                <MetricsGrid
                    metrics={entry.metrics}
                    subtitle={
                        entry.audioDuration !== null
                            ? `Audio duration: ${entry.audioDuration.toFixed(
                                  SECONDS_FRACTION_DIGITS
                              )} s`
                            : undefined
                    }
                    footer={
                        <Button
                            size="sm"
                            variant={
                                isMetricsStale ? 'dangerSoft' : 'accentSoft'
                            }
                            disabled={
                                referenceText.trim().length === 0 ||
                                entry.text.trim().length === 0 ||
                                isComputing
                            }
                            onClick={onComputeMetrics}
                        >
                            {isComputing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    }
                />
            </div>

            {entry.status === 'error' ? (
                <Text
                    size="xs"
                    tone="dangerSubtle"
                    className={styles.errorMessage}
                >
                    Failed to compute metrics.
                </Text>
            ) : null}

            <div className={styles.diff}>
                <ColoredDiff
                    enabled
                    referenceText={referenceText}
                    hypothesisText={entry.text}
                    modelName={displayLabel}
                />
            </div>
        </TranscriptionCard>
    )
}
