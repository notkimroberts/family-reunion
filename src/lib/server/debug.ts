import Debug from 'debug'

export const dbg = {
    auth: Debug('reunion:auth'),
    db: Debug('reunion:db'),
    email: Debug('reunion:email'),
    storage: Debug('reunion:storage'),
    hooks: Debug('reunion:hooks'),
    stripe: Debug('reunion:stripe'),
    register: Debug('reunion:register'),
    contact: Debug('reunion:contact'),
    upload: Debug('reunion:upload'),
    profile: Debug('reunion:profile'),
    admin: Debug('reunion:admin'),
}
