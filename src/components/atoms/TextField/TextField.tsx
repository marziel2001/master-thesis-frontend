import type { InputHTMLAttributes } from 'react'
import styles from './TextField.module.css'

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement>

export default function TextField({
    type = 'text',
    className,
    ...inputProps
}: TextFieldProps) {
    const classNames = [styles.textField, className].filter(Boolean).join(' ')

    return <input type={type} className={classNames} {...inputProps} />
}
