import { useCallback, useRef, useState } from 'react'
import { readAudioDuration } from '../lib/audio'

export type AudioFileController = {
    file: File | null
    fileName: string
    /** Length in seconds, or `null` while unknown. */
    duration: number | null
    select: (file: File | null) => void
    /**
     * Duration for the current file, reading it from the file if the backend
     * did not report one.
     */
    resolveDuration: (reported: number | null) => Promise<number | null>
}

export function useAudioFile(): AudioFileController {
    const [file, setFile] = useState<File | null>(null)
    const [fileName, setFileName] = useState('')
    const [duration, setDuration] = useState<number | null>(null)

    // Guards against a slow metadata read landing after the user swapped files.
    const durationRequestId = useRef(0)

    const select = useCallback((selectedFile: File | null) => {
        durationRequestId.current += 1
        const requestId = durationRequestId.current

        setFile(selectedFile)
        setFileName(selectedFile?.name ?? '')

        if (!selectedFile) {
            setDuration(null)
            return
        }

        void readAudioDuration(selectedFile).then((readDuration) => {
            if (durationRequestId.current === requestId) {
                setDuration(readDuration)
            }
        })
    }, [])

    const resolveDuration = useCallback(
        async (reported: number | null) => {
            const resolved = reported ?? duration ?? (file ? await readAudioDuration(file) : null)

            if (resolved !== null) {
                setDuration(resolved)
            }

            return resolved
        },
        [duration, file]
    )

    return { file, fileName, duration, select, resolveDuration }
}
