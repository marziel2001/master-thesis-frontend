import { apiClient } from './api'

type GetDiffHtmlParams = {
    referenceText: string
    hypothesisText: string
    modelName: string
}

type GetDiffHtmlResponse = {
    html?: unknown
}

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
