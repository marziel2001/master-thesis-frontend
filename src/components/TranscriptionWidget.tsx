import ColoredDiff from './ColoredDiff'

type Metrics = {
    wer: number | null
    cer: number | null
}

type TranscriptionWidgetProps = {
    model: string
    checked: boolean
    loading: boolean
    result: string
    metrics: Metrics
    referenceText: string
    onCheckedChange: (checked: boolean) => void
}

export default function TranscriptionWidget({
    model,
    checked,
    loading,
    result,
    metrics,
    referenceText,
    onCheckedChange,
}: TranscriptionWidgetProps) {
    const hasMetrics = metrics.wer !== null && metrics.cer !== null

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

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                    <p className="font-medium text-gray-600">WER</p>
                    <p className="text-gray-900">
                        {hasMetrics ? metrics.wer.toFixed(4) : '-'}
                    </p>
                </div>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                    <p className="font-medium text-gray-600">CER</p>
                    <p className="text-gray-900">
                        {hasMetrics ? metrics.cer.toFixed(4) : '-'}
                    </p>
                </div>
            </div>

            <ColoredDiff
                enabled={checked}
                referenceText={referenceText}
                hypothesisText={result}
                modelName={model}
            />
        </section>
    )
}
