export type AdminContext = {
    readonly selectedEventId: string
    setSelectedEventId(id: string): void
    readonly events: Array<{ id: string; year: number; title: string; status: string }>
}
