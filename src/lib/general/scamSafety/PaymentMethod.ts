/* One accepted way to pay. `detail` continues `label` as a phrase ("Zelle" + "to …"), so it reads
   as a sentence in an email and as a label with a caption on the site. */
export type PaymentMethod = {
    kind: 'card' | 'zelle' | 'check'
    label: string
    detail: string
}
