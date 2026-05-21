<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/services/api';
  import { formatStringDate } from '$lib/utils/date';
  import { ChevronLeft, Clock, FileText, Loader2, Calendar, MapPin, Upload, X, Plus } from 'lucide-svelte';
  import { fly, slide } from 'svelte/transition';

  $: tripId = $page.params.id;
  $: date = $page.url.searchParams.get('date');
  $: displayDate = formatStringDate(date || '');

  let title = '';
  let time = '';
  let description = '';
  let locationName = '';
  let locationAddress = '';
  let files: File[] = [];
  let submitting = false;

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const newFiles = Array.from(target.files);
      files = [...files, ...newFiles];
    }
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index);
  }

  async function handleSubmit() {
    if (!title) return;
    
    submitting = true;
    try {
      const eventData = {
        dayId: `${tripId}-${date}`,
        title,
        time: time || undefined,
        description: description || undefined,
        location: locationName ? { name: locationName, address: locationAddress } : undefined
      };

      await api.createEvent(eventData, files);
      goto(`/trip/${tripId}`);
    } catch (e) {
      console.error(e);
      submitting = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 p-6 pb-20">
  <header class="max-w-md mx-auto mb-10 flex items-center justify-between">
    <button on:click={() => history.back()} class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
      <ChevronLeft size={20} />
    </button>
    <h1 class="text-xl font-black text-slate-800">Add Event</h1>
    <div class="w-11"></div>
  </header>

  <main class="max-w-md mx-auto" in:fly={{ y: 20 }}>
    <div class="flex items-center gap-2 mb-6 ml-2">
      <Calendar size={14} class="text-indigo-500" />
      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">For {displayDate}</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-8">
      <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-8">
        <!-- Basic Info -->
        <div class="space-y-6">
          <div>
            <label for="title" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Event Name</label>
            <input 
              type="text" 
              id="title" 
              bind:value={title} 
              placeholder="e.g. Dinner at Ichiraku" 
              class="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
              required
            />
          </div>

          <div class="grid grid-cols-1 gap-6">
            <div>
              <label for="time" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Time (Optional)</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Clock size={18} />
                </div>
                <input 
                  type="time" 
                  id="time" 
                  bind:value={time} 
                  class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div>
            <label for="description" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Notes (Optional)</label>
            <textarea 
              id="description" 
              bind:value={description} 
              rows="3"
              placeholder="Reservations made for 4 people..."
              class="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 resize-none"
            ></textarea>
          </div>
        </div>

        <div class="h-px bg-slate-100"></div>

        <!-- Location Info -->
        <div class="space-y-6">
          <div class="flex items-center gap-2 mb-2 ml-1">
            <MapPin size={14} class="text-indigo-500" />
            <h3 class="text-[10px] font-black uppercase tracking-widest text-indigo-500">Location (Optional)</h3>
          </div>
          
          <div>
            <input 
              type="text" 
              placeholder="Place Name (e.g. Ichiraku Ramen)" 
              bind:value={locationName}
              class="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
            />
          </div>
          
          <div>
            <input 
              type="text" 
              placeholder="Address" 
              bind:value={locationAddress}
              class="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
            />
          </div>
        </div>

        <div class="h-px bg-slate-100"></div>

        <!-- Attachments -->
        <div class="space-y-6">
          <div class="flex items-center gap-2 mb-2 ml-1">
            <Upload size={14} class="text-indigo-500" />
            <h3 class="text-[10px] font-black uppercase tracking-widest text-indigo-500">Attachments (Optional)</h3>
          </div>

          <div class="flex flex-wrap gap-3">
            {#each files as file, i}
              <div class="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold" transition:slide>
                <span class="max-w-[150px] truncate">{file.name}</span>
                <button type="button" on:click={() => removeFile(i)} class="hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            {/each}
            
            <label class="flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 px-4 py-3 rounded-2xl text-xs font-bold cursor-pointer hover:bg-slate-100 hover:border-indigo-200 hover:text-indigo-400 transition-all">
              <Plus size={16} />
              <span>Add Files</span>
              <input type="file" multiple on:change={handleFileChange} class="hidden" />
            </label>
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
          Adding...
        {:else}
          Add to Itinerary
        {/if}
      </button>
    </form>
  </main>
</div>
