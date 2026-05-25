import { useId } from 'react'
import styles from '../styles/theme.module.css'

type FilePickerProps = {
    label: string
    accept: string
    fileName: string
    onFileChange: (file: File | null) => void
    buttonLabel?: string
    placeholder?: string
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

    const content = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <label
                    htmlFor={inputId}
                    className={`block text-sm font-semibold ${styles.textPrimary}`}
                >
                    {label}
                </label>
                <p className={`mt-1 text-xs ${styles.textMuted}`}>
                    {fileName || placeholder}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <input
                    id={inputId}
                    type="file"
                    accept={accept}
                    onChange={(event) =>
                        onFileChange(event.target.files?.[0] ?? null)
                    }
                    className="sr-only"
                />
                <label
                    htmlFor={inputId}
                    className={`cursor-pointer rounded-md px-4 py-2 text-sm font-medium shadow-sm transition hover:brightness-105 active:translate-y-px ${styles.border} ${styles.surface} ${styles.textPrimary}`}
                >
                    {buttonLabel}
                </label>
            </div>
        </div>
    )

    return compact ? (
        content
    ) : (
        <div
            className={`rounded-xl p-4 shadow-sm ${styles.border} ${styles.surfaceMuted}`}
        >
            {content}
        </div>
    )
}
