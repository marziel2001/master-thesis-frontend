import Panel from '../Panel/Panel'
import styles from './MetricTile.module.css'

export type MetricTileProps = {
    label: string
    value: string
}

/** A single labelled metric readout, e.g. "WER / 0.1234". */
export default function MetricTile({ label, value }: MetricTileProps) {
    return (
        <Panel surface="muted" radius="md" padding="xs">
            <p className={styles.label}>{label}</p>
            <p className={styles.value}>{value}</p>
        </Panel>
    )
}
