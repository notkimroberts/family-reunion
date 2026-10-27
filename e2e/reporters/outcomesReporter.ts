import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { E2E_RESULTS_DIR } from '../support/env'

type Entry = {
    title: string
    status: string
    durationMs: number
    outcome?: unknown
    error?: string
}

/* Writes e2e/results/outcomes.md (and .json): one section per scenario with its status and the facts
   it recorded through recordOutcome — what Stripe charged and refunded, what the database holds, and
   which emails went to whom. */
export default class OutcomesReporter implements Reporter {
    private entries: Entry[] = []

    onTestEnd(test: TestCase, result: TestResult): void {
        const attachment = result.attachments.find((item) => item.name === 'outcome' && item.body)
        this.entries.push({
            title: test.titlePath().slice(2).join(' › '),
            status: result.status,
            durationMs: result.duration,
            outcome: attachment?.body ? JSON.parse(attachment.body.toString()) : undefined,
            error: result.error?.message?.split('\n')[0],
        })
    }

    onEnd(): void {
        mkdirSync(E2E_RESULTS_DIR, { recursive: true })
        writeFileSync(join(E2E_RESULTS_DIR, 'outcomes.json'), JSON.stringify(this.entries, null, 2))
        const lines = [`# Stripe registration scenarios — ${new Date().toISOString()}`, '']
        this.entries.forEach((entry) => {
            lines.push(`## ${entry.status === 'passed' ? '✅' : '❌'} ${entry.title}`, '')
            if (entry.error) {
                lines.push(`**Failed:** ${entry.error}`, '')
            }
            const outcome = entry.outcome as
                | { facts: Record<string, unknown>; emails: { to: string; subject: string }[] }
                | undefined
            if (outcome) {
                lines.push('| Fact | Value |', '| --- | --- |')
                Object.entries(outcome.facts).forEach(([key, value]) => {
                    lines.push(`| ${key} | ${String(value)} |`)
                })
                lines.push('', `Emails (${outcome.emails.length}):`)
                outcome.emails.forEach((email) => lines.push(`- to ${email.to}: ${email.subject}`))
            }
            lines.push('')
        })
        writeFileSync(join(E2E_RESULTS_DIR, 'outcomes.md'), lines.join('\n'))
    }
}
