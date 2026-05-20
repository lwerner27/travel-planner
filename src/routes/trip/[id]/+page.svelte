<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, slide, fly } from 'svelte/transition';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api, type Trip, type Event, type Location, type Attachment } from '$lib/services/api';
  import { getDaysBetween, formatDisplayDate, formatDate } from '$lib/utils/date';
  import { 
    ChevronLeft, 
    Calendar, 
    MapPin, 
    FileText, 
    Clock, 
    Plus, 
    Upload, 
    MoreHorizontal,
    Trash2,
    Loader2
  } from 'lucide-svelte';
  
  $: id = $page.params.id;
  
  let trip: Trip | null = null;
  let loading = true;
  let days: Date[] = [];
  let selectedDayIndex = 0;
  let events: Event[] = [];
  let locations: Location[] = [];
  let attachments: Attachment[] = [];
  let loadingEvents = false;
  let loadingLocations = false;
  let loadingAttachments = false;
  let deletingAttachmentId: string | null = null;
  let deletingTrip = false;

  $: selectedDate = days[selectedDayIndex] ? formatDate(days[selectedDayIndex]) : null;

  async function fetchDayData(date: string | null) {
    if (!date) return;
    loadingEvents = true;
    loadingLocations = true;
    loadingAttachments = true;
    
    const dayId = `${id}-${date}`;
    try {
      const [e, l, a] = await Promise.all([
        api.getEvents(dayId),
        api.getLocations(dayId),
        api.getAttachments(dayId)
      ]);
      // Update state only if we haven't switched dates while loading
      if (date === selectedDate) {
        events = e;
        locations = l;
        attachments = a;
      }
    } catch (err) {
      console.error('Error fetching day data:', err);
    }
    
    loadingEvents = false;
    loadingLocations = false;
    loadingAttachments = false;
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    deletingAttachmentId = attachmentId;
    try {
      await api.deleteAttachment(attachmentId);
      // Optimistically update UI
      attachments = attachments.filter(a => a.id !== attachmentId);
      // Then re-fetch to be absolutely sure
      await fetchDayData(selectedDate);
    } catch (e) {
      alert('Failed to delete file');
      console.error(e);
    } finally {
      deletingAttachmentId = null;
    }
  }

  async function handleDeleteTrip() {
    if (!confirm('Are you sure you want to delete this entire trip? This action cannot be undone.')) return;
    
    deletingTrip = true;
    try {
      if (id) await api.deleteTrip(id);
      goto('/');
    } catch (e) {
      alert('Failed to delete trip');
      console.error(e);
      deletingTrip = false;
    }
  }

  $: if (selectedDate) fetchDayData(selectedDate);

  onMount(async () => {
    try {
      if (id) {
        const result = await api.getTrip(id);
        trip = result ?? null;
        if (trip) {
          days = getDaysBetween(trip.startDate, trip.endDate);
        }
      }
    } catch (err) {
      console.error('Error loading trip:', err);
    }
    loading = false;
  });
</script>

<div class="min-h-screen bg-slate-50 pb-12">
  {#if loading}
    <div class="flex flex-col items-center justify-center h-screen" in:fade>
      <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p class="text-slate-500 font-medium tracking-wide">Fetching itinerary...</p>
    </div>
  {:else if !trip}
    <div class="p-10 text-center" in:fade>
      <div class="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <ChevronLeft class="text-red-500" />
      </div>
      <h2 class="text-xl font-bold text-slate-800">Trip not found</h2>
      <a href="/" class="mt-4 inline-block text-indigo-600 font-bold">Return to Dashboard</a>
    </div>
  {:else}
    <header class="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
      <div class="max-w-md mx-auto px-4 pt-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3 overflow-hidden">
            <a href="/" class="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft size={24} class="text-slate-700" />
            </a>
            <h1 class="text-xl font-black text-slate-900 truncate">{trip.title}</h1>
          </div>
          <button 
            on:click={handleDeleteTrip}
            disabled={deletingTrip}
            class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
            title="Delete Trip"
          >
            {#if deletingTrip}
              <Loader2 size={20} class="animate-spin" />
            {:else}
              <Trash2 size={20} />
            {/if}
          </button>
        </div>
        
        <!-- Day Selector -->
        <div class="flex overflow-x-auto gap-3 pb-4 no-scrollbar -mx-2 px-2">
          {#each days as day, i}
            <button 
              on:click={() => selectedDayIndex = i}
              class="flex-shrink-0 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all
                     {selectedDayIndex === i 
                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                       : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"
            >
              {formatDisplayDate(day)}
            </button>
          {/each}
        </div>
      </div>
    </header>

    <main class="max-w-md mx-auto p-4 pt-6">
      <div class="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-50 min-h-[60vh]" in:fly={{ y: 20 }}>
        <div class="mb-8">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">Current Date</p>
          <h2 class="text-3xl font-black text-slate-900">
            {days[selectedDayIndex] ? formatDisplayDate(days[selectedDayIndex]) : 'Select a day'}
          </h2>
        </div>

        <div class="space-y-10">
          <!-- Events Section -->
          <section>
            <div class="flex justify-between items-center mb-6">
              <div class="flex items-center gap-2">
                <div class="p-1.5 bg-indigo-50 rounded-lg">
                  <Clock size={16} class="text-indigo-600" />
                </div>
                <h3 class="font-black text-slate-800 uppercase text-xs tracking-widest">Events</h3>
              </div>
              <a 
                href="/trip/{id}/add-event?date={selectedDate}" 
                class="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
              >
                <Plus size={12} strokeWidth={3} />
                Add
              </a>
            </div>
            
            {#if loadingEvents}
              <div class="flex gap-4 p-4 animate-pulse">
                <div class="w-10 h-4 bg-slate-100 rounded"></div>
                <div class="flex-1 space-y-2">
                  <div class="w-2/3 h-4 bg-slate-100 rounded"></div>
                  <div class="w-1/2 h-3 bg-slate-100 rounded"></div>
                </div>
              </div>
            {:else if events.length === 0}
              <div class="text-center py-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100" in:fade>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Nothing planned yet</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each events as event (event.id)}
                  <div class="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-white shadow-sm" transition:slide>
                    {#if event.time}
                      <span class="text-xs font-black text-indigo-600 pt-1">{event.time}</span>
                    {/if}
                    <div class="flex-1">
                      <h4 class="font-black text-slate-800 leading-tight">{event.title}</h4>
                      {#if event.description}
                        <p class="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">{event.description}</p>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>

          <!-- Locations Section -->
          <section>
            <div class="flex justify-between items-center mb-6">
              <div class="flex items-center gap-2">
                <div class="p-1.5 bg-indigo-50 rounded-lg">
                  <MapPin size={16} class="text-indigo-600" />
                </div>
                <h3 class="font-black text-slate-800 uppercase text-xs tracking-widest">Locations</h3>
              </div>
              <a 
                href="/trip/{id}/add-location?date={selectedDate}" 
                class="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
              >
                <Plus size={12} strokeWidth={3} />
                Pin
              </a>
            </div>
            
            {#if loadingLocations}
              <div class="p-4 animate-pulse space-y-2">
                <div class="w-1/2 h-4 bg-slate-100 rounded"></div>
                <div class="w-full h-3 bg-slate-100 rounded"></div>
              </div>
            {:else if locations.length === 0}
              <div class="text-center py-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100" in:fade>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">No places pinned</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each locations as location (location.id)}
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(location.address || location.name)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block p-4 bg-slate-50 rounded-2xl border border-white shadow-sm group hover:border-indigo-100 hover:bg-indigo-50 transition-all" 
                    transition:slide
                  >
                    <div class="flex items-start justify-between">
                      <h4 class="font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{location.name}</h4>
                    </div>
                    {#if location.address}
                      <p class="text-xs text-slate-500 mt-1.5 font-medium flex items-start gap-1">
                        <MapPin size={10} class="mt-0.5 text-slate-400 group-hover:text-indigo-400" />
                        {location.address}
                      </p>
                    {/if}
                  </a>
                {/each}
              </div>
            {/if}
          </section>

          <!-- Attachments Section -->
          <section>
            <div class="flex justify-between items-center mb-6">
              <div class="flex items-center gap-2">
                <div class="p-1.5 bg-indigo-50 rounded-lg">
                  <FileText size={16} class="text-indigo-600" />
                </div>
                <h3 class="font-black text-slate-800 uppercase text-xs tracking-widest">Tickets & Files</h3>
              </div>
              <a 
                href="/trip/{id}/upload-attachment?date={selectedDate}" 
                class="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors"
              >
                <Upload size={12} strokeWidth={3} />
                Upload
              </a>
            </div>
            
            {#if loadingAttachments}
              <div class="flex items-center gap-3 p-4 animate-pulse">
                <div class="w-8 h-8 bg-slate-100 rounded-lg"></div>
                <div class="w-2/3 h-4 bg-slate-100 rounded"></div>
              </div>
            {:else if attachments.length === 0}
              <div class="text-center py-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100" in:fade>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">No documents saved</p>
              </div>
            {:else}
              <div class="grid grid-cols-1 gap-3">
                {#each attachments as attachment (attachment.id)}
                  <div class="flex gap-2" transition:slide>
                    <a 
                      href={attachment.fileUrl} 
                      target="_blank" 
                      class="flex-1 flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-white shadow-sm hover:bg-indigo-50 hover:border-indigo-100 transition-all overflow-hidden"
                    >
                      <div class="bg-white p-2.5 rounded-xl shadow-sm">
                        <FileText size={18} class="text-indigo-500" />
                      </div>
                      <div class="flex-1 overflow-hidden">
                        <span class="text-xs font-black text-slate-700 block truncate">{attachment.fileName}</span>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5 block">{attachment.mimeType.split('/')[1]}</span>
                      </div>
                    </a>
                    <button 
                      on:click|preventDefault={() => handleDeleteAttachment(attachment.id)}
                      disabled={deletingAttachmentId === attachment.id}
                      class="bg-red-50 border border-red-100 p-4 rounded-2xl shadow-sm text-red-500 hover:bg-red-100 transition-all active:scale-90 flex items-center justify-center disabled:opacity-50"
                      title="Delete file"
                    >
                      {#if deletingAttachmentId === attachment.id}
                        <Loader2 size={18} class="animate-spin" />
                      {:else}
                        <Trash2 size={18} />
                      {/if}
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        </div>
      </div>
    </main>
  {/if}
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
