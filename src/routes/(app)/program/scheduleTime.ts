interface ScheduleItem {
    day: string
    time: string
    activity: string
}

function deriveTimestamp(
    day: string,
    time: string,
    orderedDays: string[],
    eventStartDate: string,
): number {
    const base = new Date(eventStartDate)
    base.setDate(base.getDate() + orderedDays.indexOf(day))
    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) {
        return base.getTime()
    }
    let h = parseInt(match[1])
    const m = parseInt(match[2])
    if (match[3].toUpperCase() === 'PM' && h !== 12) {
        h += 12
    }
    if (match[3].toUpperCase() === 'AM' && h === 12) {
        h = 0
    }
    base.setHours(h, m, 0, 0)
    return base.getTime()
}

// Returns the first upcoming schedule item relative to now, or the first item if none are upcoming or no start date is given
export function pickDefaultItem(
    items: ScheduleItem[],
    eventStartDate: string | undefined,
): ScheduleItem {
    if (!eventStartDate || items.length === 0) {
        return items[0]
    }
    const days = [...new Set(items.map((i) => i.day))]
    const now = Date.now()
    return (
        items.find((item) => deriveTimestamp(item.day, item.time, days, eventStartDate) >= now) ??
        items[0]
    )
}
