import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../requests/api'

type ModelCatalogResponse = {
    models: ModelCatalogEntry[]
}

export type ModelCatalogEntry = {
    id: string
    label: string
    variants?: string[]
    defaultVariant?: string
}

export type ModelCatalogState = {
    models: ModelCatalogEntry[]
    loading: boolean
    error: string | null
    getModelById: (id: string) => ModelCatalogEntry | undefined
    getModelLabel: (id: string) => string
    getDefaultVariant: (id: string) => string
    getVariants: (id: string) => string[]
}

const FALLBACK_LABEL = 'Unknown model'

export function useModelCatalog(): ModelCatalogState {
    const [models, setModels] = useState<ModelCatalogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        const normalizeModels = (raw: unknown): ModelCatalogEntry[] => {
            if (!Array.isArray(raw)) {
                return []
            }

            return raw
                .map((entry) => {
                    if (typeof entry === 'string') {
                        return {
                            id: entry,
                            label: entry,
                        }
                    }

                    if (entry && typeof entry === 'object') {
                        const record = entry as {
                            id?: unknown
                            label?: unknown
                            variants?: unknown
                            defaultVariant?: unknown
                        }
                        const id =
                            typeof record.id === 'string' ? record.id : ''
                        if (!id) {
                            return null
                        }

                        const label =
                            typeof record.label === 'string' ? record.label : id
                        const variants = Array.isArray(record.variants)
                            ? record.variants.filter(
                                  (variant) => typeof variant === 'string'
                              )
                            : undefined
                        const defaultVariant =
                            typeof record.defaultVariant === 'string'
                                ? record.defaultVariant
                                : undefined

                        return {
                            id,
                            label,
                            variants,
                            defaultVariant,
                        }
                    }

                    return null
                })
                .filter((entry): entry is ModelCatalogEntry => Boolean(entry))
        }

        const loadCatalog = async () => {
            try {
                const response =
                    await apiClient.get<ModelCatalogResponse>('/api/models')
                const data = response.data
                const normalizedModels = normalizeModels(data.models)
                if (normalizedModels.length === 0) {
                    throw new Error('Model catalog is missing the models list.')
                }

                if (isMounted) {
                    setModels(normalizedModels)
                    setLoading(false)
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load model catalog.'
                    )
                    setLoading(false)
                }
            }
        }

        void loadCatalog()

        return () => {
            isMounted = false
        }
    }, [])

    const helpers = useMemo(() => {
        const modelMap = new Map(models.map((model) => [model.id, model]))

        const getModelById = (id: string) => modelMap.get(id)
        const getModelLabel = (id: string) => {
            const entry = modelMap.get(id)
            return entry?.label ?? (id || FALLBACK_LABEL)
        }
        const getVariants = (id: string) => modelMap.get(id)?.variants ?? []
        const getDefaultVariant = (id: string) => {
            const entry = modelMap.get(id)
            return entry?.defaultVariant ?? entry?.variants?.[0] ?? ''
        }

        return {
            getModelById,
            getModelLabel,
            getDefaultVariant,
            getVariants,
        }
    }, [models])

    return {
        models,
        loading,
        error,
        ...helpers,
    }
}
