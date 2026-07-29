import type { HTMLAttributes } from 'react'
import styles from './Panel.module.css'

export type PanelSurface = 'surface' | 'muted'
export type PanelRadius = 'md' | 'lg' | 'xl' | '2xl'
export type PanelPadding = 'xs' | 'sm' | 'md' | 'inline'
export type PanelElevation = 'none' | 'sm' | 'md'

const RADIUS_CLASS: Record<PanelRadius, string> = {
    md: styles.radiusMd,
    lg: styles.radiusLg,
    xl: styles.radiusXl,
    '2xl': styles.radius2xl,
}

const PADDING_CLASS: Record<PanelPadding, string> = {
    xs: styles.paddingXs,
    sm: styles.paddingSm,
    md: styles.paddingMd,
    inline: styles.paddingInline,
}

const ELEVATION_CLASS: Record<PanelElevation, string> = {
    none: '',
    sm: styles.elevationSm,
    md: styles.elevationMd,
}

export type PanelProps = HTMLAttributes<HTMLElement> & {
    as?: 'div' | 'section' | 'nav'
    surface?: PanelSurface
    radius?: PanelRadius
    padding?: PanelPadding
    elevation?: PanelElevation
}

/**
 * The bordered, themed box every card, section and tile in the app is built
 * from. Owns the surface/radius/padding/elevation scale so those values are
 * never spelled out at call sites.
 */
export default function Panel({
    as: Element = 'div',
    surface = 'surface',
    radius = 'xl',
    padding = 'md',
    elevation = 'none',
    className,
    ...elementProps
}: PanelProps) {
    const classNames = [
        styles.panel,
        styles[surface],
        RADIUS_CLASS[radius],
        PADDING_CLASS[padding],
        ELEVATION_CLASS[elevation],
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return <Element className={classNames} {...elementProps} />
}
