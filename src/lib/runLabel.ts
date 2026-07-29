type LabelledRun = {
    createdAt: string
    name?: string
}

/**
 * Human-readable label for a saved run: `name · date`, or just the date when
 * the run was saved without a name.
 */
export function formatRunLabel(run: LabelledRun): string {
    const date = new Date(run.createdAt)
    const isValidDate = !Number.isNaN(date.getTime())
    const dateLabel = isValidDate
        ? date.toLocaleString('pl-PL', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
          })
        : run.createdAt

    const name = run.name?.trim()

    return name ? `${name} · ${dateLabel}` : dateLabel
}
