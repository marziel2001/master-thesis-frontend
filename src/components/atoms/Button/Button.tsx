import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export type ButtonVariant =
    | 'surface'
    | 'surfaceMuted'
    | 'primary'
    | 'accentSoft'
    | 'dangerSoft'
    | 'dangerSolid'
    | 'ghostDanger'

export type ButtonSize = 'md' | 'sm' | 'xs'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
}

export default function Button({
    variant = 'surface',
    size = 'md',
    type = 'button',
    className,
    ...buttonProps
}: ButtonProps) {
    const classNames = [styles.button, styles[size], styles[variant], className]
        .filter(Boolean)
        .join(' ')

    return <button type={type} className={classNames} {...buttonProps} />
}
