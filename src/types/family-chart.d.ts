declare module 'family-chart' {
    interface FamilyChartOptions {
        data: any[]
        main_id?: string
        node_separation?: number
        level_separation?: number
    }

    export default function FamilyChart(container: HTMLElement, options: FamilyChartOptions): void
}
