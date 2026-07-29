import styles from './spacing.module.css'

export type SpacingStep = 1 | 2 | 3 | 4 | 5 | 6

export const GAP_CLASS: Record<SpacingStep, string> = {
    1: styles.gap1,
    2: styles.gap2,
    3: styles.gap3,
    4: styles.gap4,
    5: styles.gap5,
    6: styles.gap6,
}
