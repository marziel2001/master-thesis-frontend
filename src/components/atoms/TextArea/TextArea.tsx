import type { TextareaHTMLAttributes } from 'react'
import styles from './TextArea.module.css'

export type TextAreaSurface = 'surface' | 'muted'
export type TextAreaMinHeight = 'sm' | 'md'

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    surface?: TextAreaSurface
    minHeight?: TextAreaMinHeight
}

export default function TextArea({
    surface = 'surface',
    minHeight = 'sm',
    className,
    ...textAreaProps
}: TextAreaProps) {
    const classNames = [
        styles.textArea,
        surface === 'muted' ? styles.mutedSurface : '',
        minHeight === 'md' ? styles.minHeightMd : styles.minHeightSm,
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <textarea className={classNames} {...textAreaProps} />
}
