import { join } from 'node:path'
import sharp from 'sharp'
import { CONTACT_PHONE } from '../../src/lib/general/constants/CONTACT_PHONE'

/* Renders the Facebook FAQ carousel: one HTML page of stacked 1080×1350 (4:5) slides, screenshotted
   at 2× by a headless Chromium, then cut into one PNG per slide.

   Run: bun social/facebook-faq/build.ts
   CHROME_BIN overrides the browser. Desktop Chrome refuses to start inside the agent sandbox (its
   profile lock needs a socket it may not bind), so the default is Playwright's headless shell. */

const SLIDE_WIDTH = 1080
const SLIDE_HEIGHT = 1350
const SCALE = 2
const OUT_DIR = import.meta.dir
const STATIC_DIR = join(OUT_DIR, '../../static')
const LUCIDE_DIR = join(OUT_DIR, '../../node_modules/@lucide/svelte/dist/icons')
const CHROME_BIN =
    Bun.env.CHROME_BIN ??
    `${Bun.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`
// The committee inbox, not CONTACT_EMAIL: that address is on the domain the new site has not moved to yet
const COMMITTEE_EMAIL = 'pattersonreunioncommittee@gmail.com'

type IconNode = [string, Record<string, string>][]

// Inline SVG for a lucide icon, read from the same package the site renders
const icon = async (name: string) => {
    const source = await Bun.file(join(LUCIDE_DIR, `${name}.svelte`)).text()
    const match = source.match(/iconNode = (\[.*?\]);/s)
    if (!match) {
        throw new Error(`No iconNode in ${name}.svelte`)
    }
    const nodes: IconNode = JSON.parse(match[1])
    const children = nodes
        .map(
            ([tag, attrs]) =>
                `<${tag} ${Object.entries(attrs)
                    .map(([key, value]) => `${key}="${value}"`)
                    .join(' ')}/>`,
        )
        .join('')
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`
}

const asset = (file: string) => `file://${join(STATIC_DIR, file)}`

const PHONE_ICON = await icon('phone')
const MAIL_ICON = await icon('mail')

type Faq = { icon: string; question: string; answer: string }
type FaqSlide = { title: string; items: Faq[] }

const FAQ_SLIDES: FaqSlide[] = [
    {
        title: 'The reunion',
        items: [
            {
                icon: 'calendar-days',
                question: 'When is the reunion?',
                answer: 'Friday, July 23, 2027 – Sunday, July 25, 2027.',
            },
            {
                icon: 'map-pin',
                question: 'Where is the venue for the main event?',
                answer: 'Oakstop, 2323 Broadway, Oakland, CA.',
            },
            {
                icon: 'calendar-heart',
                question: 'What’s the program for the weekend?',
                answer: 'The organizers are putting together a great weekend program for everyone. It will be published here and on the website as we get closer to the event.',
            },
            {
                icon: 'images',
                question: 'Will the photos from the past website still be available?',
                answer: 'Yes, they will.',
            },
        ],
    },
    {
        title: 'Registration',
        items: [
            {
                icon: 'clipboard-pen',
                question: 'When will registration open?',
                answer: 'October 31, 2026.',
            },
            {
                icon: 'hourglass',
                question: 'Why can’t I register yet?',
                answer: 'The organizers are putting finishing touches on the new website to handle registration. We appreciate your patience.',
            },
            {
                icon: 'mail',
                question: 'Can I register by mail?',
                answer: `Yes. We will mail paper registration, but we prefer you register online if you’re able. To request a paper registration or update your mailing address, email:
                    <span class="chips"><span class="chip email">${MAIL_ICON}${COMMITTEE_EMAIL}</span></span>`,
            },
            {
                icon: 'shirt',
                question: 'Will there be shirts?',
                answer: 'Yes! Shirts are included in the price of registration.',
            },
        ],
    },
    {
        title: 'Travel & stay',
        items: [
            {
                icon: 'hotel',
                question: 'Is there a host hotel?',
                answer: `Yes. We have a room block at the Kissel Uptown Oakland. Use the booking link in this post to get our rate, and book by June&nbsp;20,&nbsp;2027.
                    <span class="chips"><span class="chip">King · $189/night</span><span class="chip">Double queen · $239/night</span></span>`,
            },
            {
                icon: 'footprints',
                question: 'How far is the hotel from the event venue?',
                answer: 'Walking distance — less than 1 block.',
            },
            {
                icon: 'car',
                question: 'Is there parking?',
                answer: 'Yes, at the host hotel as well as nearby public lots.',
            },
            {
                icon: 'plane-takeoff',
                question: 'Should I book my flight now?',
                answer: 'Yes! The earlier the better.',
            },
            {
                icon: 'plane',
                question: 'What airport should I fly to?',
                answer: `<span class="airport"><span class="code">OAK</span>Oakland — the closest and most convenient</span>
                    <span class="airport"><span class="code muted">SFO</span>San Francisco — the next best option</span>`,
            },
        ],
    },
]

const TOTAL_SLIDES = FAQ_SLIDES.length + 1

const brandRow = (index: number) => `
    <header class="brand">
        <div class="logo">
            <img src="${asset('will_and_roxie_192.png')}" alt="" />
            <span>Pattersons</span>
        </div>
        <span class="counter">${index} / ${TOTAL_SLIDES}</span>
    </header>`

// Committee contact on every slide, since any one of them may be shared on its own
const footer = (isLast: boolean) => `
    <footer class="footer">
        <div class="contact">
            <span>${PHONE_ICON}${CONTACT_PHONE}</span>
            <span>${MAIL_ICON}${COMMITTEE_EMAIL}</span>
        </div>
        ${isLast ? '' : '<span class="hint">Swipe →</span>'}
    </footer>`

const portrait = (file: string, name: string, born: string) => `
    <figure class="frame">
        <img src="${asset(file)}" alt="${name}" />
        <figcaption><b>${name}</b><span>${born}</span></figcaption>
    </figure>`

const fact = (iconSvg: string, label: string, value: string, highlight = false) => `
    <div class="fact${highlight ? ' highlight' : ''}">
        <span class="icon-box">${iconSvg}</span>
        <div><p class="label">${label}</p><p class="value">${value}</p></div>
    </div>`

const coverSlide = async () => `
    <section class="slide">
        ${brandRow(1)}
        <div class="card cover">
            <div class="hero">
                <div class="portraits">
                    ${portrait('will_portrait.png', 'Will Patterson', 'b. 1869')}
                    ${portrait('roxie_portrait.png', 'Roxie Patterson', 'b. 1872')}
                </div>
                <div class="title">
                    <p class="eyebrow">FAQ</p>
                    <h1>Patterson Family Reunion</h1>
                    <p class="lede">An update on the reunion.</p>
                </div>
            </div>
            <div class="facts">
                ${fact(await icon('calendar-days'), 'When', 'Friday,&nbsp;July&nbsp;23,&nbsp;2027 – Sunday,&nbsp;July&nbsp;25,&nbsp;2027')}
                ${fact(await icon('map-pin'), 'Where', 'Oakstop · 2323 Broadway, Oakland, CA')}
                ${fact(await icon('clipboard-pen'), 'Registration opens', 'October 31, 2026', true)}
            </div>
        </div>
        ${footer(false)}
    </section>`

const faqSlide = async (slide: FaqSlide, index: number) => {
    const items = await Promise.all(
        slide.items.map(
            async (item) => `
                <li><div class="row">
                    <span class="icon-box">${await icon(item.icon)}</span>
                    <div><p class="q">${item.question}</p><p class="a">${item.answer}</p></div>
                </div></li>`,
        ),
    )
    return `
        <section class="slide">
            ${brandRow(index)}
            <div class="card faq">
                <div class="heading"><p class="eyebrow">An update on the reunion</p><h2>${slide.title}</h2></div>
                <ul class="qa">${items.join('')}</ul>
            </div>
            ${footer(index === TOTAL_SLIDES)}
        </section>`
}

// Light-theme tokens from src/app.css (oklch → hex), plus WARNING_SURFACE_CLASS's amber
const STYLES = `
    :root {
        --background: #f5f5f5; --card: #ffffff; --foreground: #0a0a0a; --primary: #171717;
        --primary-foreground: #fafafa; --muted: #ebebeb; --muted-foreground: #737373; --body: #404040;
        --border: #e5e5e5; --amber-bg: #fffbeb; --amber-border: #fcd34d; --amber-fg: #78350f;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: var(--background); color: var(--foreground); -webkit-font-smoothing: antialiased; }
    .slide { width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; padding: 52px 56px 48px; display: flex; flex-direction: column; gap: 28px; overflow: hidden; }
    .brand { display: flex; align-items: center; justify-content: space-between; }
    .logo { display: flex; align-items: center; gap: 20px; }
    .logo img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 4px var(--background), 0 0 0 7px var(--primary); }
    .logo span { font-size: 28px; font-weight: 600; letter-spacing: 0.025em; color: rgb(10 10 10 / 0.8); }
    .counter { font-size: 22px; font-weight: 700; letter-spacing: 0.06em; color: var(--muted-foreground); }
    .eyebrow { font-size: 21px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--muted-foreground); }
    .card { flex: 1; min-height: 0; background: var(--card); border: 2px solid var(--border); border-radius: 28px; padding: 52px; display: flex; flex-direction: column; box-shadow: 0 1px 3px rgb(0 0 0 / 0.04); }
    .footer { display: flex; justify-content: space-between; align-items: center; gap: 24px; font-size: 25px; color: var(--muted-foreground); padding: 0 6px; white-space: nowrap; }
    .contact { display: flex; gap: 32px; color: var(--foreground); font-weight: 500; }
    .contact span { display: flex; align-items: center; gap: 10px; }
    .contact svg { width: 26px; height: 26px; color: var(--muted-foreground); }
    .icon-box { flex: none; width: 64px; height: 64px; border-radius: 16px; background: var(--muted); color: var(--primary); display: flex; align-items: center; justify-content: center; }
    .icon-box svg { width: 32px; height: 32px; }

    .cover { justify-content: center; gap: 64px; }
    .hero { display: grid; grid-template-columns: auto 1fr; gap: 48px; align-items: center; }
    .portraits { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .frame { background: var(--background); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 2px rgb(0 0 0 / 0.08); }
    .frame img { width: 170px; height: 250px; object-fit: cover; border-radius: 4px; display: block; }
    .frame figcaption { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .frame b { font-size: 20px; font-weight: 600; }
    .frame figcaption span { font-size: 17px; color: var(--muted-foreground); }
    .title { display: flex; flex-direction: column; gap: 18px; }
    h1 { font-size: 78px; line-height: 1; font-weight: 700; letter-spacing: -0.025em; }
    .lede { font-size: 34px; color: var(--muted-foreground); }
    .facts { display: flex; flex-direction: column; gap: 18px; }
    .fact { display: flex; align-items: center; gap: 28px; padding: 24px 28px; border: 2px solid var(--border); border-radius: 20px; }
    .fact .icon-box { width: 76px; height: 76px; border-radius: 18px; }
    .fact .icon-box svg { width: 38px; height: 38px; }
    .label { font-size: 22px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted-foreground); }
    .value { font-size: 36px; font-weight: 600; letter-spacing: -0.01em; margin-top: 4px; }
    .fact.highlight { background: var(--amber-bg); border-color: var(--amber-border); color: var(--amber-fg); }
    .fact.highlight .icon-box { background: var(--card); color: var(--amber-fg); }
    .fact.highlight .label { color: var(--amber-fg); opacity: 0.8; }

    .faq { gap: 12px; }
    .heading { display: flex; flex-direction: column; gap: 10px; padding-bottom: 16px; }
    h2 { font-size: 60px; line-height: 1.05; font-weight: 700; letter-spacing: -0.025em; }
    .qa { list-style: none; display: flex; flex-direction: column; flex: 1; }
    .qa li { flex: 1; display: flex; align-items: center; padding: 22px 0; border-top: 2px solid var(--border); }
    .row { display: flex; gap: 28px; }
    .q { font-size: 34px; font-weight: 600; line-height: 1.25; letter-spacing: -0.01em; }
    .a { font-size: 29px; line-height: 1.45; color: var(--body); margin-top: 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
    .chip { font-size: 22px; font-weight: 600; color: var(--foreground); border: 2px solid var(--border); border-radius: 999px; padding: 6px 18px; }
    .chip.email { display: inline-flex; align-items: center; gap: 10px; font-size: 25px; font-weight: 500; }
    .chip.email svg { width: 26px; height: 26px; color: var(--muted-foreground); }
    .airport { display: flex; align-items: center; gap: 16px; margin-top: 6px; }
    .code { font-size: 21px; font-weight: 700; letter-spacing: 0.08em; border-radius: 8px; padding: 4px 12px; background: var(--primary); color: var(--primary-foreground); }
    .code.muted { background: var(--muted); color: var(--primary); }
`

const slides = [
    await coverSlide(),
    ...(await Promise.all(FAQ_SLIDES.map((slide, i) => faqSlide(slide, i + 2)))),
]
const htmlPath = join(OUT_DIR, 'faq.html')
await Bun.write(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8"><style>${STYLES}</style></head><body>${slides.join('')}</body></html>\n`,
)

const sheetPath = join(OUT_DIR, '.sheet.png')
const chrome = Bun.spawnSync([
    CHROME_BIN,
    '--user-data-dir=/tmp/facebook-faq-chrome',
    '--disable-gpu',
    '--use-gl=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--hide-scrollbars',
    `--force-device-scale-factor=${SCALE}`,
    `--window-size=${SLIDE_WIDTH},${SLIDE_HEIGHT * TOTAL_SLIDES}`,
    `--screenshot=${sheetPath}`,
    `file://${htmlPath}`,
])
if (!chrome.success) {
    throw new Error(chrome.stderr.toString())
}

// Cut the sheet into one 2160×2700 PNG per slide
await Promise.all(
    Array.from({ length: TOTAL_SLIDES }, (_, i) =>
        sharp(sheetPath)
            .extract({
                left: 0,
                top: i * SLIDE_HEIGHT * SCALE,
                width: SLIDE_WIDTH * SCALE,
                height: SLIDE_HEIGHT * SCALE,
            })
            .toFile(join(OUT_DIR, `slide-${i + 1}.png`)),
    ),
)
await Bun.file(sheetPath).delete()
console.log(`Wrote ${TOTAL_SLIDES} slides to ${OUT_DIR}`)
