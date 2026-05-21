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
    Loader2,
    ExternalLink
  } from 'lucide-svelte';
  
  $: id = $page.params.id;
  
  let trip: Trip | null = null;
  let loading = true;
  let days: Date[] = [];
  let selectedDayIndex = 0;
  let events: Event[] = [];
  let loadingEvents = false;
  let deletingAttachmentId: string | null = null;
  let deletingTrip = false;

  $: selectedDate = days[selectedDayIndex] ? formatDate(days[selectedDayIndex]) : null;

  async function fetchDayData(date: string | null) {
    if (!date) return;
    loadingEvents = true;
    
    const dayId = `${id}-${date}`;
    try {
      events = await api.getEvents(dayId);
    } catch (err) {
      console.error('Error fetching day data:', err);
    }
    
    loadingEvents = false;
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    deletingAttachmentId = attachmentId;
    try {
      await api.deleteAttachment(attachmentId);
      // Re-fetch to update the nested state
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
        <div class="mb-8 flex justify-between items-end">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1">Current Date</p>
            <h2 class="text-3xl font-black text-slate-900">
              {days[selectedDayIndex] ? formatDisplayDate(days[selectedDayIndex]) : 'Select a day'}
            </h2>
          </div>
          <a 
            href="/trip/{id}/add-event?date={selectedDate}" 
            class="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all"
          >
            <Plus size={24} strokeWidth={3} />
          </a>
        </div>

        <div class="space-y-6">
          {#if loadingEvents}
            {#each Array(3) as _}
              <div class="p-6 bg-slate-50 rounded-3xl animate-pulse space-y-3">
                <div class="h-4 bg-slate-200 rounded w-1/4"></div>
                <div class="h-6 bg-slate-200 rounded w-3/4"></div>
              </div>
            {/each}
          {:else if events.length === 0}
            <div class="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100" in:fade>
              <Calendar class="mx-auto mb-4 text-slate-200" size={48} />
              <p class="text-sm font-black text-slate-400 uppercase tracking-widest">Itinerary Empty</p>
              <p class="text-xs text-slate-400 mt-2">Tap the + button to start planning</p>
            </div>
          {:else}
            {#each events as event (event.id)}
              <div class="relative group" transition:slide>
                <div class="p-6 bg-slate-50 rounded-[2rem] border border-white shadow-sm hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                      {#if event.time}
                        <div class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                          {event.time}
                        </div>
                      {/if}
                      <h4 class="text-lg font-black text-slate-800">{event.title}</h4>
                    </div>
                  </div>

                  {#if event.description}
                    <p class="text-sm text-slate-500 font-medium mb-4 leading-relaxed">
                      {event.description}
                    </p>
                  {/if}

                  {#if event.location}
                    <div class="flex items-start gap-3 p-3 bg-white rounded-2xl border border-slate-100 mb-4">
                      <div class="p-2 bg-rose-50 rounded-xl text-rose-500">
                        <MapPin size={18} />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-xs font-black text-slate-800 truncate">{event.location.name}</p>
                        <p class="text-[10px] text-slate-400 font-bold truncate">{event.location.address}</p>
                      </div>
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(event.location.address || event.location.name)}"
                        target="_blank"
                        class="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  {/if}

                  {#if event.attachments && event.attachments.length > 0}
                    <div class="flex flex-wrap gap-2">
                      {#each event.attachments as attachment (attachment.id)}
                        <div class="flex items-center gap-2 bg-white border border-slate-100 pl-3 pr-2 py-2 rounded-xl group/file">
                          <FileText size={14} class="text-indigo-400" />
                          <a 
                            href={attachment.fileUrl} 
                            target="_blank" 
                            class="text-[10px] font-black text-slate-600 truncate max-w-[120px] hover:text-indigo-600 transition-colors"
                          >
                            {attachment.fileName}
                          </a>
                          <button 
                            on:click|preventDefault={() => handleDeleteAttachment(attachment.id)}
                            class="p-1 text-slate-200 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
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
