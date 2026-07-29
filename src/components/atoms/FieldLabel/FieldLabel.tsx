import type { LabelHTMLAttributes } from 'react'
import styles from './FieldLabel.module.css'

export type FieldLabelSize = 'xs' | 'sm'
export type FieldLabelWeight = 'normal' | 'medium' | 'semibold'
export type FieldLabelTone = 'primary' | 'muted'

const SIZE_CLASS: Record<FieldLabelSize, string> = {
    xs: styles.sizeXs,
    sm: styles.sizeSm,
}

const WEIGHT_CLASS: Record<FieldLabelWeight, string> = {
    normal: styles.weightNormal,
    medium: styles.weightMedium,
    semibold: styles.weightSemibold,
}

const TONE_CLASS: Record<FieldLabelTone, string> = {
    primary: styles.tonePrimary,
    muted: styles.toneMuted,
}

export type FieldLabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
    size?: FieldLabelSize
    weight?: FieldLabelWeight
    tone?: FieldLabelTone
    /** Lay the label out as a row, for labels that wrap their own control. */
    inline?: boolean
}

export default function FieldLabel({
    size = 'sm',
    weight = 'semibold',
    tone = 'primary',
    inline = false,
    className,
    ...labelProps
}: FieldLabelProps) {
    const classNames = [
        styles.label,
        inline ? styles.inline : styles.block,
        SIZE_CLASS[size],
        WEIGHT_CLASS[weight],
        TONE_CLASS[tone],
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <label className={classNames} {...labelProps} />
}
