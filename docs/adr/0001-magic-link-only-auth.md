# ADR 0001 — Magic link as the only authentication method

**Status:** Accepted  
**Date:** 2026-06-03

## Context

The app originally offered three SSO providers (Google, Apple, Facebook) plus a magic link email fallback. The app is used by a small, known family group a few times per year — not a public product with acquisition pressure.

## Decision

Remove all three SSO providers. Magic link email is the sole sign-in method.

## Rationale

- SSO requires OAuth credentials per provider, redirect URIs, and app-review processes (especially Apple) that add operational burden for marginal value.
- The family's members already share an email list; email is the natural identity anchor for this group.
- Magic link is already implemented and working. No new infrastructure needed.
- Fewer auth paths means fewer edge cases (e.g. same email registered via two different providers).

## Trade-offs

- Users without easy email access (older relatives who rely on a social login) have one fewer option. Accepted: an admin can create registrations directly on their behalf.
- No persistent passwords — users must have email access every time they sign in. Accepted: sessions are long-lived so re-authentication is rare.

## Consequences

- `socialProviders` block removed from `src/lib/server/auth/index.ts`.
- Google, Apple, and Facebook OAuth env vars removed from `.env` and `.env.example`.
- Login page simplified to a single email input form.
- Better Auth's `account` table remains (magic link sign-in still populates it).
