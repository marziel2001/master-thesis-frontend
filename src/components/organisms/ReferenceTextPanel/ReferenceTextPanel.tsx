import { Button, Row, Stack, Text, TextArea } from '../../atoms'
import FilePicker from '../../molecules/FilePicker/FilePicker'

export type ReferenceTextPanelProps = {
    text: string
    fileName: string
    onTextChange: (text: string) => void
    onFileChange: (file: File | null) => void
    onTokenize: () => void
    isTokenizing: boolean
    onRefreshAllMetrics: () => void
    canRefreshAllMetrics: boolean
    /** Highlights the refresh action when metrics predate the current text. */
    hasStaleMetrics: boolean
    /** Explains what tokenizing does; wording differs per page. */
    tokenizeHint: string
    filePickerLabel: string
    /** Render the file picker without its own panel. */
    compactFilePicker?: boolean
    textAreaMinHeight?: 'sm' | 'md'
}

/**
 * Reference-text input: file picker, editable text, and the two actions that
 * operate on it (tokenize, recompute every metric against it).
 */
export default function ReferenceTextPanel({
    text,
    fileName,
    onTextChange,
    onFileChange,
    onTokenize,
    isTokenizing,
    onRefreshAllMetrics,
    canRefreshAllMetrics,
    hasStaleMetrics,
    tokenizeHint,
    filePickerLabel,
    compactFilePicker = false,
    textAreaMinHeight = 'sm',
}: ReferenceTextPanelProps) {
    const isTextEmpty = text.trim().length === 0

    return (
        <Stack gap={3}>
            <FilePicker
                label={filePickerLabel}
                accept=".txt"
                fileName={fileName}
                onFileChange={onFileChange}
                compact={compactFilePicker}
            />

            <TextArea
                minHeight={textAreaMinHeight}
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder="Paste reference text here"
            />

            <Stack gap={2}>
                <Row gap={3}>
                    <Button
                        onClick={onTokenize}
                        disabled={isTokenizing || isTextEmpty}
                    >
                        {isTokenizing
                            ? 'Normalizing...'
                            : 'Tokenize reference text'}
                    </Button>
                    <Text size="xs" tone="muted">
                        {tokenizeHint}
                    </Text>
                </Row>
                <Row gap={3}>
                    <Button
                        variant={hasStaleMetrics ? 'dangerSoft' : 'surface'}
                        onClick={onRefreshAllMetrics}
                        disabled={!canRefreshAllMetrics}
                    >
                        Refresh all metrics
                    </Button>
                </Row>
            </Stack>
        </Stack>
    )
}
