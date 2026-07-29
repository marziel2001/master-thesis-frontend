import { useId, useRef } from 'react'
import { Button, FieldLabel, Panel, Row, Text } from '../../atoms'
import styles from './FilePicker.module.css'

export type FilePickerProps = {
    label: string
    accept: string
    /** Name of the currently selected file, or an empty string. */
    fileName: string
    onFileChange: (file: File | null) => void
    buttonLabel?: string
    placeholder?: string
    /** Drop the surrounding panel, for use inside an existing card. */
    compact?: boolean
}

export default function FilePicker({
    label,
    accept,
    fileName,
    onFileChange,
    buttonLabel = 'Wybierz plik',
    placeholder = 'Brak wybranego pliku',
    compact = false,
}: FilePickerProps) {
    const inputId = useId()
    const inputRef = useRef<HTMLInputElement | null>(null)

    const content = (
        <Row justify="between" gap={3}>
            <div className={styles.details}>
                <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
                <Text size="xs" tone="muted" className={styles.fileName}>
                    {fileName || placeholder}
                </Text>
            </div>
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept={accept}
                className={styles.nativeInput}
                onChange={(event) =>
                    onFileChange(event.target.files?.[0] ?? null)
                }
            />
            <Button onClick={() => inputRef.current?.click()}>
                {buttonLabel}
            </Button>
        </Row>
    )

    if (compact) {
        return content
    }

    return (
        <Panel surface="muted" elevation="sm">
            {content}
        </Panel>
    )
}
