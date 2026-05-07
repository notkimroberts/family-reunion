/// <reference types="@sveltejs/kit" />
/// <reference types="unplugin-icons/types/svelte" />

declare const __APP_VERSION__: string

declare namespace App {
    interface Locals {
        user: {
            id: string
            name: string
            email: string
            emailVerified: boolean
            image?: string | null
            role?: string | null
            createdAt: Date
            updatedAt: Date
        } | null
        session: {
            id: string
            userId: string
            expiresAt: Date
            token: string
            createdAt: Date
            updatedAt: Date
        } | null
    }
}
