import ColoredDiff from './ColoredDiff'
import MetricsGrid from './MetricsGrid'
import type { TranscriptionWidgetProps } from './TranscriptionWidget.types'

export default function TranscriptionWidget({
    model,
    checked,
    loading,
    status,
    result,
    metrics,
    referenceText,
    onCheckedChange,
}: TranscriptionWidgetProps) {
    const statusStyles: Record<TranscriptionWidgetProps['status'], string> = {
        idle: 'border-gray-200 bg-white',
        loading: 'border-yellow-300 bg-yellow-300',
        success: 'border-green-300 bg-green-200',
        error: 'border-red-300 bg-red-200',
    }
    const diffContainerClassName = checked
        ? 'max-h-[9999px] opacity-100 mt-3'
        : 'max-h-0 opacity-0 mt-0'

    return (
        <section
            className={`w-full rounded-xl border p-4 shadow-sm transition-all duration-300 ease-out ${
                statusStyles[status]
            }`}
        >
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

            <MetricsGrid metrics={metrics} />

            <div
                className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${diffContainerClassName}`}
            >
                <ColoredDiff
                    enabled={checked}
                    referenceText={referenceText}
                    hypothesisText={result}
                    modelName={model}
                />
            </div>
        </section>
    )
}
