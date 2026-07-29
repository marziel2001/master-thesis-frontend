import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './IconButton.module.css'

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: LucideIcon
    /**
     * Accessible name. Icon-only buttons expose no text, so this is required
     * and doubles as the default tooltip.
     */
    label: string
}

export default function IconButton({
    icon: Icon,
    label,
    title,
    type = 'button',
    className,
    ...buttonProps
}: IconButtonProps) {
    const classNames = [styles.iconButton, className].filter(Boolean).join(' ')

    return (
        <button
            type={type}
            className={classNames}
            aria-label={label}
            title={title ?? label}
            {...buttonProps}
        >
            <Icon aria-hidden="true" className={styles.icon} />
        </button>
    )
}
