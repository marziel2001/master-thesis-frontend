import { useCallback, useRef, useState } from 'react'
import { normalizeText } from '../requests/normalizeText'

export type ReferenceTextController = {
    text: string
    fileName: string
    /**
     * Bumped on every edit. Metrics computed against an older version are
     * stale, which is how the UI decides to flag a refresh.
     */
    version: number
    /** Current version read synchronously, for use inside async flows. */
    getVersion: () => number
    setText: (text: string) => number
    loadFromFile: (file: File | null) => Promise<void>
    /** Forgets the source file name, e.g. after loading text from a saved run. */
    clearFileName: () => void
    /** Sends the text through the backend tokenizer and stores the result. */
    normalize: () => Promise<string>
    isNormalizing: boolean
    clear: () => void
}

/**
 * Owns the reference text plus its version counter.
 *
 * Both the transcription page and the results reader need the identical
 * "text + monotonically increasing version" pairing to detect stale metrics;
 * this keeps the ref/state bookkeeping in one place.
 */
export function useReferenceText(): ReferenceTextController {
    const [text, setTextState] = useState('')
    const [fileName, setFileName] = useState('')
    const [isNormalizing, setIsNormalizing] = useState(false)

    // Mirrored in a ref so async flows can read the version they started with
    // without waiting for a re-render.
    const versionRef = useRef(0)
    const [version, setVersion] = useState(0)

    const setText = useCallback((nextText: string) => {
        setTextState(nextText)
        versionRef.current += 1
        setVersion(versionRef.current)
        return versionRef.current
    }, [])

    const getVersion = useCallback(() => versionRef.current, [])

    const clearFileName = useCallback(() => {
        setFileName('')
    }, [])

    const clear = useCallback(() => {
        setFileName('')
        setText('')
    }, [setText])

    const loadFromFile = useCallback(
        async (file: File | null) => {
            if (!file) {
                clear()
                return
            }

            setText(await file.text())
            setFileName(file.name)
        },
        [clear, setText]
    )

    const normalize = useCallback(async () => {
        setIsNormalizing(true)
        try {
            const normalized = await normalizeText({ text })
            setText(normalized)
            return normalized
        } finally {
            setIsNormalizing(false)
        }
    }, [setText, text])

    return {
        text,
        fileName,
        version,
        getVersion,
        setText,
        loadFromFile,
        clearFileName,
        normalize,
        isNormalizing,
        clear,
    }
}
