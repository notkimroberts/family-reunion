declare module 'family-chart' {
    interface CardNode {
        data: { data: Record<string, string> }
    }

    interface CardHtml {
        setCardInnerHtmlCreator(creator: (d: CardNode) => string): Chart
    }

    interface Chart {
        setSingleParentEmptyCard(value: boolean): this
        setCardHtml(): CardHtml
        updateTree(options?: { initial?: boolean }): this
        destroy?(): void
    }

    type ChartNode = {
        id: string
        data: Record<string, unknown>
        rels?: {
            spouses?: string[]
            children?: string[]
            father?: string | null
            mother?: string | null
        }
    }

    export function createChart(container: HTMLElement | string, data: ChartNode[]): Chart
}
