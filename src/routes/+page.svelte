<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { api, type Trip } from '$lib/services/api';
  import { Plus, Calendar, MapPin, Plane, LogIn } from 'lucide-svelte';
  
  let trips: Trip[] = [];
  let loading = true;

  onMount(async () => {
    trips = await api.getTrips();
    loading = false;
  });

  function getDuration(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }
</script>

<div class="min-h-screen bg-slate-50 pb-24">
  <header class="bg-gradient-to-br from-indigo-600 to-violet-700 pt-12 pb-24 px-6 rounded-b-[3rem] shadow-lg relative">
    <div class="max-w-md mx-auto">
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-3">
          <div class="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <Plane class="text-white" size={24} />
          </div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Travel Planner</h1>
        </div>
        <form method="POST" action="/logout">
          <button type="submit" class="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white/80" title="Log out">
            <LogIn size={20} class="rotate-180" />
          </button>
        </form>
      </div>
      <p class="text-indigo-100 font-medium">Where is your next adventure?</p>
    </div>
  </header>

  <main class="px-6 -mt-12 max-w-md mx-auto relative z-10">
    {#if loading}
      <div class="flex flex-col items-center justify-center py-20" in:fade>
        <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-500 font-medium tracking-wide">Loading your adventures...</p>
      </div>
    {:else if trips.length === 0}
      <div class="bg-white rounded-3xl p-10 text-center shadow-xl border border-slate-100" in:fly={{ y: 20 }}>
        <div class="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Plane class="text-indigo-500" size={40} />
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">No trips planned yet</h2>
        <p class="text-slate-500 mb-8 leading-relaxed">Start organizing your next journey by adding a trip today!</p>
        <a 
          href="/trip/new" 
          class="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          Create a Trip
        </a>
      </div>
    {:else}
      <div class="space-y-5">
        {#each trips as trip, i}
          <a 
            href="/trip/{trip.id}" 
            class="group block bg-white p-5 rounded-3xl shadow-md border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all active:scale-[0.98]"
            in:fly={{ y: 20, delay: i * 100 }}
          >
            <div class="flex justify-between items-start mb-4">
              <h2 class="font-black text-xl text-slate-800 group-hover:text-indigo-600 transition-colors">{trip.title}</h2>
              <span class="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                {getDuration(trip.startDate, trip.endDate)}
              </span>
            </div>
            
            <div class="flex items-center gap-4 text-slate-500 text-sm font-medium">
              <div class="flex items-center gap-1.5">
                <Calendar size={14} class="text-indigo-400" />
                <span>{new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
              <div class="w-1 h-1 bg-slate-300 rounded-full"></div>
              <div class="flex items-center gap-1.5">
                <MapPin size={14} class="text-indigo-400" />
                <span>Itinerary ready</span>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </main>

  <!-- FAB -->
  {#if !loading && trips.length > 0}
    <div class="fixed bottom-8 right-8 z-50" in:fade>
      <a 
        href="/trip/new" 
        class="flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-300 hover:bg-indigo-700 hover:rotate-90 transition-all active:scale-90"
      >
        <Plus size={32} />
      </a>
    </div>
  {/if}
</div>
