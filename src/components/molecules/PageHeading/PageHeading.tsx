import { Stack, Text } from '../../atoms'

export type PageHeadingProps = {
    title: string
    description: string
    /** `h1` for standalone pages, `h2` when the layout already has a title. */
    as?: 'h1' | 'h2'
}

export default function PageHeading({
    title,
    description,
    as = 'h1',
}: PageHeadingProps) {
    return (
        <Stack gap={2}>
            <Text as={as} size="2xl" weight="semibold">
                {title}
            </Text>
            <Text tone="muted">{description}</Text>
        </Stack>
    )
}
