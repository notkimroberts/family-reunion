import type { EventPerson } from '$lib/server/registrations'

export type CheckinGroup = {
    registrationId: string
    contactName: string
    members: EventPerson[]
    arrivedCount: number
    shirtsGivenCount: number
}

/* One group per booking, because that is how people physically arrive: the Pattersons turn up in two
   cars, not as five names scattered through an alphabetical list.

   Check-in itself stays per person — a party of five can be half here — so the group is a container
   with a count, never a state of its own.

   Relies on getEventPeople's ordering (contact, then person) rather than sorting again: a Map keeps
   insertion order, so the groups come out in the same order the query already chose. */
export function groupPeopleByBooking(people: readonly EventPerson[]): CheckinGroup[] {
    const groups = new Map<string, CheckinGroup>()

    people.forEach((person) => {
        const group = groups.get(person.registrationId)
        if (group) {
            group.members.push(person)
        } else {
            groups.set(person.registrationId, {
                registrationId: person.registrationId,
                contactName: person.contactName,
                members: [person],
                arrivedCount: 0,
                shirtsGivenCount: 0,
            })
        }
    })

    return [...groups.values()].map((group) => ({
        ...group,
        arrivedCount: group.members.filter((member) => member.checkedInAt !== null).length,
        /* Counted apart from arrivals, because a party can be entirely present with nobody holding a
           shirt yet — which is the state an organiser has to be able to see. */
        shirtsGivenCount: group.members.filter((member) => member.shirtGivenAt !== null).length,
    }))
}
