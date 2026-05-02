import { apiClient } from './api'
import type { GetDiffHtmlParams, GetDiffHtmlResponse } from './diff.types'

export async function getDiffHtml({
    referenceText,
    hypothesisText,
    modelName,
}: GetDiffHtmlParams): Promise<string> {
    const response = await apiClient.post<GetDiffHtmlResponse>(
        '/api/diff-html',
        {
            reference_text: referenceText,
            hypothesis_text: hypothesisText,
            model_name: modelName,
            normalize: true,
        }
    )

    return typeof response.data?.html === 'string' ? response.data.html : ''
}
