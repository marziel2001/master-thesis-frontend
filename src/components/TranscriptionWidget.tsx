type TranscriptionWidgetProps = {
    model: string
    checked: boolean
    loading: boolean
    result: string
    onCheckedChange: (checked: boolean) => void
}

export default function TranscriptionWidget({
    model,
    checked,
    loading,
    result,
    onCheckedChange,
}: TranscriptionWidgetProps) {
    return (
        <section className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-800">
                    {model}
                </span>
                <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={checked}
                    onChange={(event) => onCheckedChange(event.target.checked)}
                />
            </label>

            <textarea
                className="min-h-32 w-full resize-y rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-800"
                readOnly
                value={loading ? 'Transcribing...' : result}
                placeholder={
                    checked
                        ? 'Result will appear here'
                        : 'Enable this model to include it in transcription'
                }
            />
        </section>
    )
}
