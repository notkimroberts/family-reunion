export const EVENT_STATUSES = ['draft', 'open', 'closed', 'archived'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]
