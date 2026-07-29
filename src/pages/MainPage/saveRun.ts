import { createRun } from '../../requests/runs'
import { updateOutputFile } from '../../requests/updateOutput'
import type { CreateRunRequest, RunResult } from '../../requests/runs.types'

type ResultWithOutputFile = RunResult & { outputFile: string }

/**
 * Saves a run, then writes the freshly computed metrics back into the per-model
 * output files the backend produced.
 *
 * Returns the message to show the user. Throws only when the run itself could
 * not be saved; individual output-file updates are reported as counts, since a
 * partial write still leaves the run persisted.
 */
export async function saveRunAndSyncOutputs(
    request: CreateRunRequest
): Promise<string> {
    await createRun(request)

    const withOutputFiles = request.results.filter(
        (result): result is ResultWithOutputFile => Boolean(result.outputFile)
    )

    if (withOutputFiles.length === 0) {
        return 'Saved run to server.'
    }

    const updates = await Promise.allSettled(
        withOutputFiles.map((result) =>
            updateOutputFile({
                outputFile: result.outputFile,
                wer: result.wer,
                cer: result.cer,
                referenceText: request.referenceText,
            })
        )
    )

    const failedCount = updates.filter(
        (update) => update.status === 'rejected'
    ).length

    if (failedCount === 0) {
        return 'Saved run to server and updated output files.'
    }

    return `Saved run to server. Updated ${
        updates.length - failedCount
    } output files, ${failedCount} failed.`
}
