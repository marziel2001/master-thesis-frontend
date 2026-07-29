import type { HTMLAttributes } from 'react'
import { GAP_CLASS, type SpacingStep } from '../spacing'
import styles from './Row.module.css'

export type RowAlign = 'center' | 'start'
export type RowJustify = 'start' | 'between'

const ALIGN_CLASS: Record<RowAlign, string> = {
    center: styles.alignCenter,
    start: styles.alignStart,
}

const JUSTIFY_CLASS: Record<RowJustify, string> = {
    start: styles.justifyStart,
    between: styles.justifyBetween,
}

export type RowProps = HTMLAttributes<HTMLDivElement> & {
    gap?: SpacingStep
    align?: RowAlign
    justify?: RowJustify
}

/** Horizontal, wrapping flow with a token-based gap. */
export default function Row({
    gap = 3,
    align = 'center',
    justify = 'start',
    className,
    ...divProps
}: RowProps) {
    const classNames = [
        styles.row,
        GAP_CLASS[gap],
        ALIGN_CLASS[align],
        JUSTIFY_CLASS[justify],
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <div className={classNames} {...divProps} />
}
