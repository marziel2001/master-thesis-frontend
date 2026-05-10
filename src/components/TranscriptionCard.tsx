import type { ReactNode } from 'react'

export type TranscriptionCardStatus = 'idle' | 'loading' | 'success' | 'error'

export type TranscriptionCardProps = {
    status: TranscriptionCardStatus
    title: string
    subtitle?: string
    headerExtras?: ReactNode
    headerActions?: ReactNode
    children: ReactNode
}

const STATUS_STYLES: Record<TranscriptionCardStatus, string> = {
    idle: 'border-gray-200 bg-white',
    loading: 'border-yellow-300 bg-yellow-300',
    success: 'border-green-300 bg-green-200',
    error: 'border-red-300 bg-red-200',
}

export default function TranscriptionCard({
    status,
    title,
    subtitle,
    headerExtras,
    headerActions,
    children,
}: TranscriptionCardProps) {
    return (
        <section
            className={`w-full rounded-xl border p-4 shadow-sm transition-all duration-300 ease-out ${
                STATUS_STYLES[status]
            }`}
        >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-800">
                            {title}
                        </p>
                        {subtitle ? (
                            <p className="text-xs text-gray-600">{subtitle}</p>
                        ) : null}
                    </div>
                    {headerExtras ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {headerExtras}
                        </div>
                    ) : null}
                </div>
                {headerActions ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {headerActions}
                    </div>
                ) : null}
            </div>
            {children}
        </section>
    )
}
