import { useMemo } from 'react'
import { Mic, MicOff, Trash2 } from 'lucide-react'
import { Button, Panel, Row, Stack, Text } from '../../components/atoms'
import PageHeading from '../../components/molecules/PageHeading/PageHeading'
import LiveModelPanel from '../../components/organisms/LiveModelPanel/LiveModelPanel'
import { useLiveTranscription } from '../../hooks/useLiveTranscription'
import { useModelCatalog } from '../../hooks/useModelCatalog'
import styles from './LiveTranscribePage.module.css'

export default function LiveTranscribePage() {
    const {
        models,
        loading: isCatalogLoading,
        error: catalogError,
        getModelLabel,
    } = useModelCatalog()
    const live = useLiveTranscription()

    const isActive =
        live.sessionStatus === 'connecting' || live.sessionStatus === 'active'

    const onlineModelCount = useMemo(
        () =>
            models.filter((model) => live.getModelState(model.id).status !== 'pending')
                .length,
        [models, live]
    )

    const statusDescription = (() => {
        switch (live.sessionStatus) {
            case 'connecting':
                return 'Connecting to the live-transcription server...'
            case 'active':
                return `Listening - ${onlineModelCount}/${models.length} models online.`
            case 'error':
                return 'Session stopped because of an error.'
            case 'idle':
            default:
                return 'Press "Start" and speak into the microphone.'
        }
    })()

    return (
        <>
            <PageHeading
                title="Live transcription"
                description="Speak into the microphone - every model in the catalog transcribes the same live audio at once, independently."
            />

            <Panel as="section" elevation="md">
                <Row justify="between" gap={4}>
                    <Stack gap={1}>
                        <Text size="sm" weight="semibold">
                            {isActive ? 'Session active' : 'Session stopped'}
                        </Text>
                        <Text size="xs" tone="muted">
                            {statusDescription}
                        </Text>
                    </Stack>

                    <Row gap={2}>
                        <Button
                            variant="surfaceMuted"
                            onClick={live.clearTranscripts}
                            disabled={models.length === 0}
                        >
                            <Trash2 aria-hidden="true" size={16} />
                            Clear
                        </Button>
                        {isActive ? (
                            <Button variant="dangerSolid" onClick={live.stop}>
                                <MicOff aria-hidden="true" size={16} />
                                Stop
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={() => void live.start()}
                                disabled={!live.isSupported || isCatalogLoading}
                            >
                                <Mic aria-hidden="true" size={16} />
                                Start
                            </Button>
                        )}
                    </Row>
                </Row>

                {!live.isSupported ? (
                    <Text tone="danger" className={styles.message}>
                        This browser does not support microphone capture
                        (MediaRecorder and getUserMedia are required).
                    </Text>
                ) : null}

                {live.statusMessage ? (
                    <Text tone="danger" className={styles.message}>
                        {live.statusMessage}
                    </Text>
                ) : null}

                {catalogError ? (
                    <Text tone="danger" className={styles.message}>
                        Failed to load the model catalog: {catalogError}
                    </Text>
                ) : null}
            </Panel>

            <div className={styles.modelGrid}>
                {models.map((model) => (
                    <LiveModelPanel
                        key={model.id}
                        modelLabel={getModelLabel(model.id)}
                        state={live.getModelState(model.id)}
                    />
                ))}
            </div>
        </>
    )
}
