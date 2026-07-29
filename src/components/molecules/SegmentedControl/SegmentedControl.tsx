import styles from './SegmentedControl.module.css'

export type SegmentedControlOption<Value extends string> = {
    value: Value
    label: string
}

export type SegmentedControlProps<Value extends string> = {
    value: Value
    options: ReadonlyArray<SegmentedControlOption<Value>>
    onChange: (value: Value) => void
    /** Accessible name for the group. */
    label: string
}

/** Mutually exclusive choice rendered as a joined row of buttons. */
export default function SegmentedControl<Value extends string>({
    value,
    options,
    onChange,
    label,
}: SegmentedControlProps<Value>) {
    return (
        <div className={styles.group} role="group" aria-label={label}>
            {options.map((option) => {
                const isActive = option.value === value
                const className = [
                    styles.segment,
                    isActive ? styles.segmentActive : '',
                ]
                    .filter(Boolean)
                    .join(' ')

                return (
                    <button
                        key={option.value}
                        type="button"
                        className={className}
                        aria-pressed={isActive}
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
