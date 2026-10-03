/* One place to park near a reunion location: the hotel's own valet or garage, or a public lot nearby.

   Every field is display text, never computed on — prices change and are quoted as the operator
   words them ("$35 / night", "$2 / hour, $14 max"). Confirmed facts only: an attendee will drive to
   it. */
export type ParkingOption = {
    name: string
    price: string
    address?: string
    /* Walking time to the location, e.g. "2 min walk". */
    walk?: string
    /* Height limit, EV charging, in-and-out privileges, hours. */
    note?: string
}
