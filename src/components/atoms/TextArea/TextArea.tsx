import type { Ref, TextareaHTMLAttributes } from 'react'
import styles from './TextArea.module.css'

export type TextAreaSurface = 'surface' | 'muted'
export type TextAreaMinHeight = 'sm' | 'md'

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    surface?: TextAreaSurface
    minHeight?: TextAreaMinHeight
    ref?: Ref<HTMLTextAreaElement>
}

export default function TextArea({
    surface = 'surface',
    minHeight = 'sm',
    className,
    ref,
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

    return <textarea ref={ref} className={classNames} {...textAreaProps} />
}
