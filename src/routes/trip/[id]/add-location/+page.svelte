<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/services/api';
  import { formatStringDate } from '$lib/utils/date';
  import { ChevronLeft, MapPin, Loader2, Calendar, Map } from 'lucide-svelte';
  import { fly } from 'svelte/transition';

  $: tripId = $page.params.id;
  $: date = $page.url.searchParams.get('date');
  $: displayDate = formatStringDate(date || '');

  let name = '';
  let address = '';
  let submitting = false;

  async function handleSubmit() {
    if (!name) return;
    
    submitting = true;
    try {
      await api.createLocation({
        dayId: `${tripId}-${date}`,
        name,
        address
      });
      goto(`/trip/${tripId}`);
    } catch (e) {
      console.error(e);
      submitting = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 p-6">
  <header class="max-w-md mx-auto mb-10 flex items-center justify-between">
    <button on:click={() => history.back()} class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
      <ChevronLeft size={20} />
    </button>
    <h1 class="text-xl font-black text-slate-800">Pin Location</h1>
    <div class="w-11"></div>
  </header>

  <main class="max-w-md mx-auto" in:fly={{ y: 20 }}>
    <div class="flex items-center gap-2 mb-6 ml-2">
      <Calendar size={14} class="text-indigo-500" />
      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">For {displayDate}</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-8">
      <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-6">
        <div>
          <label for="name" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Location Name</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Map size={18} />
            </div>
            <input 
              type="text" 
              id="name" 
              bind:value={name} 
              placeholder="e.g. Tokyo Skytree" 
              class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
              required
            />
          </div>
        </div>

        <div>
          <label for="address" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Address / Instructions</label>
          <div class="relative">
            <div class="absolute top-4 left-4 pointer-events-none text-slate-400">
              <MapPin size={18} />
            </div>
            <textarea 
              id="address" 
              bind:value={address} 
              rows="4"
              placeholder="1 Chome-1-2 Oshiage, Sumida City, Tokyo..."
              class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 resize-none"
            ></textarea>
          </div>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={submitting}
        class="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {#if submitting}
          <Loader2 class="animate-spin" size={20} />
          Pinning...
        {:else}
          Save Location
        {/if}
      </button>
    </form>
  </main>
</div>
