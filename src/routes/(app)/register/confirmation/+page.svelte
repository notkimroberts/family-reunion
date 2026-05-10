<script lang="ts">
import { getAge } from '$lib/utils/age'

let { data } = $props()
</script>

<section class="col-span-12 text-center">
    <h2 class="text-3xl font-bold text-primary">You're Registered!</h2>
    <p class="text-lg mt-2">See you at {data.event.title}!</p>
</section>

<section class="card bg-base-100 col-span-12 xl:col-span-8 xl:col-start-3 shadow-xs">
    <div class="card-body">
        <h2 class="card-title">Registration Summary</h2>

        <div class="overflow-x-auto">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Age</th>
                        <th>Category</th>
                        <th>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.members as member}
                        <tr>
                            <td>{member.name}</td>
                            <td>
                                {getAge(member.birthYear, member.birthMonth, member.birthDay)}
                            </td>
                            <td>{member.tierLabel}</td>
                            <td>${(member.priceCents / 100).toFixed(2)}</td>
                        </tr>
                    {/each}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="font-bold text-right">Total Paid:</td>
                        <td class="font-bold">
                            ${(data.registration.totalAmountCents / 100).toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <p class="text-sm text-base-content/60 mt-4">
            A confirmation email has been sent to your email address.
        </p>
    </div>
</section>

<section class="col-span-12 flex gap-4 justify-center">
    <a href="/program" class="btn btn-primary">View Program</a>
    <a href="/profile" class="btn btn-ghost">My Profile</a>
</section>
