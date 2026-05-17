import { useId } from 'react'

type FilePickerProps = {
    label: string
    accept: string
    fileName: string
    onFileChange: (file: File | null) => void
    buttonLabel?: string
    placeholder?: string
}

export default function FilePicker({
    label,
    accept,
    fileName,
    onFileChange,
    buttonLabel = 'Wybierz plik',
    placeholder = 'Brak wybranego pliku',
}: FilePickerProps) {
    const inputId = useId()

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-semibold text-gray-800"
                    >
                        {label}
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
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
                        className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:translate-y-px"
                    >
                        {buttonLabel}
                    </label>
                </div>
            </div>
        </div>
    )
}
