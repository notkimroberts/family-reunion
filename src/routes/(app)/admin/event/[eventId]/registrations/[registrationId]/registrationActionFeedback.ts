/* Every action on this page returns the same optional feedback keys.

   SvelteKit types `form` as a union across the page's actions, and accessing a key that only some
   branches carry is a type error. Annotating each action's feedback with this type — then spreading it
   into the return — gives every branch the full key set without casting anything. */
export type RegistrationActionFeedback = {
    saved?: boolean
    changes?: string[]
    notified?: boolean
    notifyError?: string
    saveError?: string
    memberAdded?: boolean
    linkReissued?: boolean
    reissueError?: string
    cancelled?: boolean
    cancelError?: string
}
