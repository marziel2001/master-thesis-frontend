import type { HTMLAttributes } from 'react'
import styles from './Text.module.css'

export type TextSize = '2xs' | 'xs' | 'sm' | 'base' | '2xl'
export type TextWeight = 'normal' | 'medium' | 'semibold'
export type TextTone =
    | 'primary'
    | 'muted'
    | 'subtle'
    | 'danger'
    | 'dangerSubtle'
    | 'success'

const SIZE_CLASS: Record<TextSize, string> = {
    '2xs': styles.size2xs,
    xs: styles.sizeXs,
    sm: styles.sizeSm,
    base: styles.sizeBase,
    '2xl': styles.size2xl,
}

const WEIGHT_CLASS: Record<TextWeight, string> = {
    normal: styles.weightNormal,
    medium: styles.weightMedium,
    semibold: styles.weightSemibold,
}

const TONE_CLASS: Record<TextTone, string> = {
    primary: styles.tonePrimary,
    muted: styles.toneMuted,
    subtle: styles.toneSubtle,
    danger: styles.toneDanger,
    dangerSubtle: styles.toneDangerSubtle,
    success: styles.toneSuccess,
}

export type TextProps = HTMLAttributes<HTMLElement> & {
    as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3'
    size?: TextSize
    weight?: TextWeight
    tone?: TextTone
    /** Uppercase + wide tracking, for the small section labels. */
    eyebrow?: boolean
    truncate?: boolean
}

export default function Text({
    as: Element = 'p',
    size = 'sm',
    weight = 'normal',
    tone = 'primary',
    eyebrow = false,
    truncate = false,
    className,
    ...elementProps
}: TextProps) {
    const classNames = [
        styles.text,
        SIZE_CLASS[size],
        WEIGHT_CLASS[weight],
        TONE_CLASS[tone],
        eyebrow ? styles.eyebrow : '',
        truncate ? styles.truncate : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <Element className={classNames} {...elementProps} />
}
