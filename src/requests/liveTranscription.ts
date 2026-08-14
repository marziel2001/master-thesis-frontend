import { API_BASE_URL } from './api'

/** `/ws/live-transcription`, on the same host/port as the REST API. */
export function getLiveTranscriptionSocketUrl(): string {
    const wsScheme = API_BASE_URL.startsWith('https') ? 'wss' : 'ws'
    const hostAndPath = API_BASE_URL.replace(/^https?:\/\//, '')

    return `${wsScheme}://${hostAndPath}/ws/live-transcription`
}
