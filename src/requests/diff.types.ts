export type GetDiffHtmlParams = {
    referenceText: string
    hypothesisText: string
    modelName: string
}

export type GetDiffHtmlResponse = {
    ref_html: string
    hyp_html: string
}
