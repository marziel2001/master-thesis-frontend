const TRANSCRIPTION_FINISHED_SOUND_URL = '/sounds/finish_transcription.mp3'

/**
 * Reads an audio file's duration in seconds via a throwaway `<audio>` element.
 * Resolves `null` when the metadata cannot be read or reports a bogus length.
 */
export function readAudioDuration(audioFile: File): Promise<number | null> {
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(audioFile)
        const audio = new Audio()
        let settled = false

        const cleanup = () => {
            if (settled) {
                return
            }
            settled = true
            audio.src = ''
            URL.revokeObjectURL(objectUrl)
        }

        audio.preload = 'metadata'
        audio.onloadedmetadata = () => {
            const duration =
                Number.isFinite(audio.duration) && audio.duration > 0
                    ? audio.duration
                    : null
            cleanup()
            resolve(duration)
        }
        audio.onerror = () => {
            cleanup()
            resolve(null)
        }
        audio.src = objectUrl
    })
}

/**
 * Plays the completion chime. Autoplay may be blocked until the user has
 * interacted with the page, so a rejected playback is logged and ignored.
 */
export function playTranscriptionFinishedSound(): void {
    const audio = new Audio(TRANSCRIPTION_FINISHED_SOUND_URL)

    audio.play().catch((error: unknown) => {
        console.warn('Could not play the completion sound:', error)
    })
}
