/* British forms and the American word to use instead. Whole words only, matched case-insensitively.

   An explicit list, not suffix rules: "-ise" would flag promise, exercise and otherwise, and "-our"
   would flag four and hour. Forms American English shares are left out on purpose: enrolled and
   enrolling (enroll → enrolled), optimistic, and cancelled, which US style also accepts and which is
   the `?cancelled=true` parameter on /register. Add a form here when a review catches one. */
const ISE_STEMS = [
    'apologis',
    'authoris',
    'capitalis',
    'categoris',
    'customis',
    'emphasis',
    'finalis',
    'initialis',
    'maximis',
    'memoris',
    'minimis',
    'normalis',
    'optimis',
    'organis',
    'prioritis',
    'realis',
    'recognis',
    'sanitis',
    'serialis',
    'specialis',
    'standardis',
    'summaris',
    'synchronis',
    'utilis',
    'visualis',
]

const ISE_SUFFIXES = ['e', 'ed', 'es', 'ing', 'er', 'ers', 'ation', 'ations', 'able']

const OUR_STEMS = [
    'behaviour',
    'colour',
    'favour',
    'flavour',
    'honour',
    'humour',
    'labour',
    'neighbour',
    'rumour',
]

const OUR_SUFFIXES = ['', 's', 'ed', 'ing', 'al', 'ful', 'ite', 'ites', 'able', 'hood']

/* "emphasis" is a noun in both: only its verb forms are British. */
const isBritishIseForm = (stem: string, suffix: string) =>
    !(stem === 'emphasis' && !['e', 'ed', 'es', 'ing'].includes(suffix))

const iseForms = ISE_STEMS.flatMap((stem) =>
    ISE_SUFFIXES.filter((suffix) => isBritishIseForm(stem, suffix)).map((suffix) => ({
        british: `${stem}${suffix}`,
        american: `${stem.slice(0, -1)}z${suffix}`,
    })),
)

const ourForms = OUR_STEMS.flatMap((stem) =>
    OUR_SUFFIXES.map((suffix) => ({
        british: `${stem}${suffix}`,
        american: `${stem.replace(/our$/, 'or')}${suffix}`,
    })),
)

const singleForms = [
    ['cheque', 'check'],
    ['cheques', 'checks'],
    ['enrol', 'enroll'],
    ['enrols', 'enrolls'],
    ['enrolment', 'enrollment'],
    ['enrolments', 'enrollments'],
    ['fulfil', 'fulfill'],
    ['fulfils', 'fulfills'],
    ['fulfilment', 'fulfillment'],
    ['instalment', 'installment'],
    ['instalments', 'installments'],
    ['licence', 'license'],
    ['licences', 'licenses'],
    ['centre', 'center'],
    ['centres', 'centers'],
    ['centred', 'centered'],
    ['theatre', 'theater'],
    ['defence', 'defense'],
    ['offence', 'offense'],
    ['analyse', 'analyze'],
    ['analysed', 'analyzed'],
    ['analysing', 'analyzing'],
    ['programme', 'program'],
    ['programmes', 'programs'],
    ['catalogue', 'catalog'],
    ['travelled', 'traveled'],
    ['travelling', 'traveling'],
    ['labelled', 'labeled'],
    ['labelling', 'labeling'],
    ['modelled', 'modeled'],
    ['modelling', 'modeling'],
].map(([british, american]) => ({ british, american }))

export const britishSpellingsValue: { british: string; american: string }[] = [
    ...iseForms,
    ...ourForms,
    ...singleForms,
]
