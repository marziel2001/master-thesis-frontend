import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import {
    Button,
    Checkbox,
    IconButton,
    Row,
    Select,
    Text,
    TextArea,
} from '../../atoms'
import MetricsGrid from '../../molecules/MetricsGrid/MetricsGrid'
import ColoredDiff from '../ColoredDiff/ColoredDiff'
import TranscriptionCard from '../TranscriptionCard/TranscriptionCard'
import type { ModelRunState } from '../../../hooks/useModelRunStates'
import styles from './ModelRunCard.module.css'

export type ModelRunCardProps = {
    modelLabel: string
    state: ModelRunState
    variantOptions: readonly string[]
    referenceText: string
    /** Whether the model can be run right now (audio picked, catalog ready). */
    canRun: boolean
    /** True when the metrics predate the current reference text. */
    isMetricsStale: boolean
    onToggleEnabled: (enabled: boolean) => void
    onToggleExpanded: () => void
    onVariantChange: (variant: string) => void
    onRun: () => void
    onRefreshMetrics: () => void
}

/** One model's controls, transcription, metrics and diff. */
export default function ModelRunCard({
    modelLabel,
    state,
    variantOptions,
    referenceText,
    canRun,
    isMetricsStale,
    onToggleEnabled,
    onToggleExpanded,
    onVariantChange,
    onRun,
    onRefreshMetrics,
}: ModelRunCardProps) {
    const diffLabel = state.usedVariant
        ? `${modelLabel} (${state.usedVariant})`
        : modelLabel

    const diffContainerClassName = [
        styles.diffContainer,
        state.enabled ? styles.diffContainerOpen : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <TranscriptionCard
            status={state.status}
            header={
                <div className={styles.header}>
                    <Checkbox
                        checked={state.enabled}
                        aria-label={`Include ${modelLabel} in the next run`}
                        onChange={(event) =>
                            onToggleEnabled(event.target.checked)
                        }
                    />
                    <div className={styles.headerTitle}>
                        <Text size="sm" weight="semibold" truncate>
                            {modelLabel}
                        </Text>
                    </div>
                    <IconButton
                        icon={state.isExpanded ? Minimize2 : Maximize2}
                        label={state.isExpanded ? 'Collapse' : 'Expand'}
                        aria-pressed={state.isExpanded}
                        onClick={onToggleExpanded}
                    />
                </div>
            }
        >
            <Row justify="between" gap={3}>
                <Text size="xs" weight="semibold" tone="muted" eyebrow>
                    Transcription
                </Text>
                <Row gap={2}>
                    {variantOptions.length > 0 ? (
                        <Select
                            size="sm"
                            aria-label={`${modelLabel} variant`}
                            value={state.variant}
                            onChange={(event) =>
                                onVariantChange(event.target.value)
                            }
                        >
                            {variantOptions.map((variant) => (
                                <option key={variant} value={variant}>
                                    {variant}
                                </option>
                            ))}
                        </Select>
                    ) : null}
                    <IconButton
                        icon={RotateCcw}
                        label={state.isTranscribing ? 'Running...' : 'Run again'}
                        disabled={state.isTranscribing || !canRun}
                        onClick={onRun}
                    />
                </Row>
            </Row>

            <TextArea
                className={styles.transcription}
                surface="muted"
                value={state.transcription}
                readOnly
                placeholder="Run the model to see transcription here"
            />

            <div className={styles.metrics}>
                <MetricsGrid
                    metrics={state.metrics}
                    title="Metrics"
                    subtitle={
                        state.usedVariant
                            ? `Model used: ${state.usedVariant}`
                            : undefined
                    }
                    footer={
                        <Button
                            size="sm"
                            variant={
                                isMetricsStale ? 'dangerSoft' : 'accentSoft'
                            }
                            disabled={
                                state.isRecalculatingMetrics ||
                                state.transcription.trim().length === 0 ||
                                referenceText.trim().length === 0
                            }
                            onClick={onRefreshMetrics}
                        >
                            {state.isRecalculatingMetrics
                                ? 'Refreshing...'
                                : 'Refresh'}
                        </Button>
                    }
                />
            </div>

            <div className={diffContainerClassName}>
                <ColoredDiff
                    enabled={state.enabled}
                    referenceText={referenceText}
                    hypothesisText={state.transcription}
                    modelName={diffLabel}
                    title="Diff"
                />
            </div>
        </TranscriptionCard>
    )
}
