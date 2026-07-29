import type { InputHTMLAttributes } from 'react'
import styles from './Checkbox.module.css'

export type CheckboxProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type'
>

export default function Checkbox({ className, ...inputProps }: CheckboxProps) {
    const classNames = [styles.checkbox, className].filter(Boolean).join(' ')

    return <input type="checkbox" className={classNames} {...inputProps} />
}
