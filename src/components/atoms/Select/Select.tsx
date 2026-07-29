import type { SelectHTMLAttributes } from 'react'
import styles from './Select.module.css'

export type SelectSize = 'sm' | 'md'

/**
 * `size` shadows the native numeric `<select size>` attribute, which the app
 * never uses, so it is omitted rather than intersected (an intersection would
 * collapse to `never`).
 */
export type SelectProps = Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'size'
> & {
    size?: SelectSize
    fullWidth?: boolean
}

export default function Select({
    size = 'md',
    fullWidth = false,
    className,
    ...selectProps
}: SelectProps) {
    const classNames = [
        styles.select,
        size === 'sm' ? styles.sizeSm : styles.sizeMd,
        fullWidth ? styles.fullWidth : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <select className={classNames} {...selectProps} />
}
