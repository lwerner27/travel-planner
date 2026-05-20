<script>
  import { goto } from '$app/navigation';
  import { api } from '$lib/services/api';
  import { ChevronLeft, Map, Calendar, Loader2 } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';

  let title = '';
  let startDate = '';
  let endDate = '';
  let submitting = false;

  async function handleSubmit() {
    if (!title || !startDate || !endDate) return;
    
    submitting = true;
    try {
      const newTrip = await api.createTrip({ title, startDate, endDate });
      goto(`/trip/${newTrip.id}`);
    } catch (e) {
      console.error(e);
      submitting = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 p-6">
  <header class="max-w-md mx-auto mb-10 flex items-center justify-between">
    <a href="/" class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
      <ChevronLeft size={20} />
    </a>
    <h1 class="text-xl font-black text-slate-800">Plan New Trip</h1>
    <div class="w-11"></div> <!-- Spacer -->
  </header>

  <main class="max-w-md mx-auto" in:fly={{ y: 20 }}>
    <form on:submit|preventDefault={handleSubmit} class="space-y-8">
      <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-6">
        <div>
          <label for="title" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Trip Name</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Map size={18} />
            </div>
            <input 
              type="text" 
              id="title" 
              bind:value={title} 
              placeholder="e.g. Summer in Tokyo" 
              class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="startDate" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Start Date</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Calendar size={18} />
              </div>
              <input 
                type="date" 
                id="startDate" 
                bind:value={startDate} 
                class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                required
              />
            </div>
          </div>
          <div>
            <label for="endDate" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">End Date</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Calendar size={18} />
              </div>
              <input 
                type="date" 
                id="endDate" 
                bind:value={endDate} 
                class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                required
              />
            </div>
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
          Creating...
        {:else}
          Start Adventure
        {/if}
      </button>
    </form>
  </main>
</div>
