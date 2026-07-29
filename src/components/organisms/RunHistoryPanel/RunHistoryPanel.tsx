import { useId } from 'react'
import {
    Button,
    FieldLabel,
    Panel,
    Row,
    Select,
    Stack,
    Text,
    TextField,
} from '../../atoms'
import { formatRunLabel } from '../../../lib/runLabel'
import type { RunData } from '../../../requests/runs.types'
import styles from './RunHistoryPanel.module.css'

export type RunHistoryPanelProps = {
    runs: readonly RunData[]
    selectedRunId: string
    onSelectRun: (runId: string) => void
    /** Deleting is a two-step confirmation; true once the first click landed. */
    isDeleteConfirmPending: boolean
    onDeleteSelectedRun: () => void
    onReload: () => void
    saveName: string
    onSaveNameChange: (name: string) => void
    onSaveRun: () => void
    onExportCsv: () => void
    canExportCsv: boolean
    /** Feedback scoped to this panel. */
    message?: string
}

/** Load / save / delete / export controls for the saved-run history. */
export default function RunHistoryPanel({
    runs,
    selectedRunId,
    onSelectRun,
    isDeleteConfirmPending,
    onDeleteSelectedRun,
    onReload,
    saveName,
    onSaveNameChange,
    onSaveRun,
    onExportCsv,
    canExportCsv,
    message,
}: RunHistoryPanelProps) {
    const saveNameId = useId()

    return (
        <Panel surface="muted" elevation="sm">
            <Stack gap={3}>
                <Row gap={3}>
                    <Select
                        fullWidth
                        className={styles.runSelect}
                        aria-label="Load from history"
                        value={selectedRunId}
                        onChange={(event) => onSelectRun(event.target.value)}
                    >
                        <option value="">Load from history</option>
                        {runs.map((run) => (
                            <option key={run.id} value={run.id}>
                                {formatRunLabel(run)}
                            </option>
                        ))}
                    </Select>
                    <Button
                        variant={
                            isDeleteConfirmPending ? 'dangerSolid' : 'dangerSoft'
                        }
                        disabled={!selectedRunId}
                        onClick={onDeleteSelectedRun}
                    >
                        {isDeleteConfirmPending ? 'Confirm delete' : 'Delete'}
                    </Button>
                    <Button onClick={onReload}>Reload history</Button>
                </Row>

                <Stack gap={2} className={styles.saveGroup}>
                    <FieldLabel htmlFor={saveNameId}>Save as</FieldLabel>
                    <Row gap={3}>
                        <TextField
                            id={saveNameId}
                            className={styles.saveNameField}
                            value={saveName}
                            onChange={(event) =>
                                onSaveNameChange(event.target.value)
                            }
                            placeholder="Enter a new result name"
                        />
                        <Button variant="accentSoft" onClick={onSaveRun}>
                            Save run
                        </Button>
                        <Button onClick={onExportCsv} disabled={!canExportCsv}>
                            Export CSV
                        </Button>
                    </Row>
                    <Text size="xs" tone="muted">
                        This creates a new saved result and keeps older ones
                        untouched.
                    </Text>
                </Stack>
            </Stack>

            {isDeleteConfirmPending ? (
                <Text size="xs" tone="muted" className={styles.note}>
                    Click the delete button again to permanently remove this
                    history entry.
                </Text>
            ) : null}

            {message ? (
                <Text tone="danger" className={styles.note}>
                    {message}
                </Text>
            ) : null}
        </Panel>
    )
}
