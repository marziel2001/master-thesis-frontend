import { apiClient } from './api'
import type {
    UpdateOutputApiResponse,
    UpdateOutputRequest,
} from './updateOutput.types'

export async function updateOutputFile(
    payload: UpdateOutputRequest
): Promise<string> {
    const response = await apiClient.post<UpdateOutputApiResponse>(
        '/api/output/update',
        {
            output_file: payload.outputFile,
            wer: payload.wer,
            cer: payload.cer,
            reference_text: payload.referenceText,
        }
    )

    return typeof response.data?.output_file === 'string'
        ? response.data.output_file
        : payload.outputFile
}
