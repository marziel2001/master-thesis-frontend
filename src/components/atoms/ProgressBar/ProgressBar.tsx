import type { CSSProperties } from 'react'
import styles from './ProgressBar.module.css'

export type ProgressBarProps = {
    /** Fill width as a percentage, 0-100. */
    percent: number
}

export default function ProgressBar({ percent }: ProgressBarProps) {
    const fillStyle = {
        '--progress-bar-width': `${percent}%`,
    } as CSSProperties

    return (
        <div className={styles.track}>
            <div className={styles.fill} style={fillStyle} />
        </div>
    )
}
