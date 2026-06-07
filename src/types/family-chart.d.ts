declare module 'family-chart' {
    interface CardNode {
        data: { data: Record<string, string> }
    }

    interface CardHtml {
        setCardInnerHtmlCreator(creator: (d: CardNode) => string): Chart
    }

    interface UpdateTreeOptions {
        initial?: boolean
        transition_time?: number
        tree_position?: 'fit' | 'main_to_middle' | 'inherit'
        scale?: number
    }

    interface Chart {
        setSingleParentEmptyCard(value: boolean): this
        setCardHtml(): CardHtml
        updateTree(options?: UpdateTreeOptions): this
        updateMainId(id: string): this
        svg: SVGElement
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
