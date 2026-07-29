import type { HTMLAttributes } from 'react'
import { GAP_CLASS, type SpacingStep } from '../spacing'
import styles from './Stack.module.css'

export type StackProps = HTMLAttributes<HTMLDivElement> & {
    gap?: SpacingStep
}

/** Vertical flow with a token-based gap. */
export default function Stack({
    gap = 4,
    className,
    ...divProps
}: StackProps) {
    const classNames = [styles.stack, GAP_CLASS[gap], className]
        .filter(Boolean)
        .join(' ')

    return <div className={classNames} {...divProps} />
}
