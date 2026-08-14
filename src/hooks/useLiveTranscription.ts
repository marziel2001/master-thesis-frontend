import { useCallback, useEffect, useRef, useState } from 'react'
import { getLiveTranscriptionSocketUrl } from '../requests/liveTranscription'
import type { LiveServerMessage } from '../requests/liveTranscription.types'

export type LiveModelStatus = 'pending' | 'listening' | 'error'

export type LiveModelState = {
    status: LiveModelStatus
    transcript: string
    lastComputeTime: number | null
    skippedChunks: number
    lastErrorMessage: string | null
}

export type LiveSessionStatus = 'idle' | 'connecting' | 'active' | 'error'

export type LiveTranscriptionController = {
    isSupported: boolean
    sessionStatus: LiveSessionStatus
    statusMessage: string
    modelIds: string[]
    getModelState: (modelId: string) => LiveModelState
    start: () => Promise<void>
    stop: () => void
    clearTranscripts: () => void
}

/** How much audio each independently-decodable chunk covers. */
const CHUNK_DURATION_MS = 4000

const IDLE_MODEL_STATE: LiveModelState = {
    status: 'pending',
    transcript: '',
    lastComputeTime: null,
    skippedChunks: 0,
    lastErrorMessage: null,
}

function pickSupportedMimeType(): string | undefined {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
    ]

    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate))
}

/**
 * Records fixed-length, independently-decodable chunks by restarting the
 * `MediaRecorder` every `CHUNK_DURATION_MS`, rather than relying on
 * `start(timeslice)`, which only gives the *first* slice a valid container
 * header - later slices from the same recorder can't be decoded on their own.
 *
 * Returns a function that stops the cycle after the in-flight chunk closes.
 */
function startSegmentedRecording(
    stream: MediaStream,
    onChunk: (blob: Blob) => void
): () => void {
    let stopped = false
    const mimeType = pickSupportedMimeType()

    const recordOnce = () => {
        if (stopped) {
            return
        }

        const recorder = new MediaRecorder(
            stream,
            mimeType ? { mimeType } : undefined
        )
        const parts: BlobPart[] = []

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                parts.push(event.data)
            }
        }

        recorder.onstop = () => {
            if (parts.length > 0) {
                onChunk(new Blob(parts, { type: recorder.mimeType }))
            }
            recordOnce()
        }

        recorder.start()
        setTimeout(() => {
            if (recorder.state !== 'inactive') {
                recorder.stop()
            }
        }, CHUNK_DURATION_MS)
    }

    recordOnce()

    return () => {
        stopped = true
    }
}

/**
 * Drives one live-transcription session: microphone capture, chunked upload
 * over the live-transcription websocket, and per-model transcript state.
 *
 * There is no native low-latency streaming API wired up for any provider on
 * the backend, so every model transcribes the same short audio chunks
 * independently; a model that falls behind has chunks dropped for it (see
 * `chunk_skipped`) instead of building up a backlog.
 */
export function useLiveTranscription(): LiveTranscriptionController {
    const isSupported =
        typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== 'undefined'

    const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus>('idle')
    const [statusMessage, setStatusMessage] = useState('')
    const [modelIds, setModelIds] = useState<string[]>([])
    const [statesByModel, setStatesByModel] = useState<
        Record<string, LiveModelState>
    >({})

    const socketRef = useRef<WebSocket | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const stopRecordingRef = useRef<(() => void) | null>(null)

    const getModelState = useCallback(
        (modelId: string) => statesByModel[modelId] ?? IDLE_MODEL_STATE,
        [statesByModel]
    )

    /**
     * Always folds into the latest state rather than a value captured when
     * the handler was created, so back-to-back socket messages (arriving
     * faster than React re-renders) never clobber each other.
     */
    const patchModel = useCallback(
        (
            modelId: string,
            patch:
                | Partial<LiveModelState>
                | ((previous: LiveModelState) => Partial<LiveModelState>)
        ) => {
            setStatesByModel((previous) => {
                const currentState = previous[modelId] ?? IDLE_MODEL_STATE
                const resolvedPatch =
                    typeof patch === 'function' ? patch(currentState) : patch

                return {
                    ...previous,
                    [modelId]: { ...currentState, ...resolvedPatch },
                }
            })
        },
        []
    )

    const teardown = useCallback(() => {
        stopRecordingRef.current?.()
        stopRecordingRef.current = null

        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        const socket = socketRef.current
        socketRef.current = null
        if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'stop' }))
        }
        socket?.close()
    }, [])

    const stop = useCallback(() => {
        teardown()
        setSessionStatus('idle')
    }, [teardown])

    const handleServerMessage = useCallback(
        (message: LiveServerMessage) => {
            switch (message.type) {
                case 'ready':
                    setModelIds(message.models)
                    setStatesByModel(
                        Object.fromEntries(
                            message.models.map((modelId) => [
                                modelId,
                                { ...IDLE_MODEL_STATE, status: 'listening' as const },
                            ])
                        )
                    )
                    setSessionStatus('active')
                    return

                case 'result':
                    patchModel(message.model, (previous) => ({
                        status: 'listening',
                        transcript: [previous.transcript, message.text.trim()]
                            .filter(Boolean)
                            .join(' '),
                        lastComputeTime: message.computeTime,
                        lastErrorMessage: null,
                    }))
                    return

                case 'error':
                    patchModel(message.model, {
                        status: 'error',
                        lastErrorMessage: message.message,
                    })
                    return

                case 'chunk_skipped':
                    patchModel(message.model, (previous) => ({
                        skippedChunks: previous.skippedChunks + 1,
                    }))
                    return

                case 'chunk_error':
                    setStatusMessage(
                        `Chunk ${message.index} could not be decoded: ${message.message}`
                    )
                    return

                case 'fatal':
                    setStatusMessage(message.message)
                    setSessionStatus('error')
                    teardown()
                    return

                case 'chunk_received':
                    return
            }
        },
        [patchModel, teardown]
    )

    const start = useCallback(async () => {
        if (!isSupported) {
            setStatusMessage('This browser does not support microphone capture.')
            setSessionStatus('error')
            return
        }

        setStatusMessage('')
        setModelIds([])
        setStatesByModel({})
        setSessionStatus('connecting')

        let stream: MediaStream
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (error) {
            console.error(error)
            setStatusMessage('Microphone access was denied or is unavailable.')
            setSessionStatus('error')
            return
        }
        streamRef.current = stream

        const socket = new WebSocket(getLiveTranscriptionSocketUrl())
        socketRef.current = socket

        socket.onmessage = (event) => {
            try {
                handleServerMessage(JSON.parse(event.data) as LiveServerMessage)
            } catch (error) {
                console.error('Malformed live-transcription message', error)
            }
        }

        socket.onerror = () => {
            setStatusMessage('Lost connection to the live-transcription server.')
            setSessionStatus('error')
        }

        socket.onclose = () => {
            stopRecordingRef.current?.()
            stopRecordingRef.current = null
            setSessionStatus((current) => (current === 'error' ? current : 'idle'))
        }

        socket.onopen = () => {
            stopRecordingRef.current = startSegmentedRecording(stream, (blob) => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(blob)
                }
            })
        }
    }, [handleServerMessage, isSupported])

    // Releases the microphone and socket if the page navigates away mid-session.
    useEffect(() => teardown, [teardown])

    const clearTranscripts = useCallback(() => {
        setStatesByModel((previous) =>
            Object.fromEntries(
                Object.entries(previous).map(([modelId, state]) => [
                    modelId,
                    {
                        ...state,
                        transcript: '',
                        skippedChunks: 0,
                        lastErrorMessage: null,
                    },
                ])
            )
        )
    }, [])

    return {
        isSupported,
        sessionStatus,
        statusMessage,
        modelIds,
        getModelState,
        start,
        stop,
        clearTranscripts,
    }
}
