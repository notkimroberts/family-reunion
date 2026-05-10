<script lang="ts">
import MdiCalendarClock from 'virtual:icons/mdi/calendar-clock'
import MdiClipboardEdit from 'virtual:icons/mdi/clipboard-edit'
import MdiFamilyTree from 'virtual:icons/mdi/family-tree'
import MdiImageMultiple from 'virtual:icons/mdi/image-multiple'
import { APP_NAME } from '$lib/general/constants'
</script>

<svelte:head>
    <title>{APP_NAME} — Home</title>
    <meta
        name="description"
        content="Family reunion management — registration, events, and family tree" />
</svelte:head>

<section class="card bg-primary text-primary-content col-span-12 shadow-xs">
    <div class="card-body">
        <h2 class="card-title text-2xl">Welcome to the {APP_NAME} Reunion</h2>
        <p>Bringing our family together, year after year.</p>
    </div>
</section>

<section class="col-span-12">
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <a href="/register" class="card bg-base-100 shadow-xs hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
                <MdiClipboardEdit class="h-8 w-8 text-primary" />
                <h3 class="card-title text-base">Register</h3>
                <p class="text-sm text-base-content/70">Sign up for the reunion</p>
            </div>
        </a>
        <a href="/program" class="card bg-base-100 shadow-xs hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
                <MdiCalendarClock class="h-8 w-8 text-primary" />
                <h3 class="card-title text-base">Program</h3>
                <p class="text-sm text-base-content/70">View the schedule</p>
            </div>
        </a>
        <a href="/gallery" class="card bg-base-100 shadow-xs hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
                <MdiImageMultiple class="h-8 w-8 text-primary" />
                <h3 class="card-title text-base">Gallery</h3>
                <p class="text-sm text-base-content/70">Browse reunion photos</p>
            </div>
        </a>
        <a href="/family-tree" class="card bg-base-100 shadow-xs hover:shadow-md transition-shadow">
            <div class="card-body items-center text-center">
                <MdiFamilyTree class="h-8 w-8 text-primary" />
                <h3 class="card-title text-base">Family Tree</h3>
                <p class="text-sm text-base-content/70">Explore connections</p>
            </div>
        </a>
    </div>
</section>
