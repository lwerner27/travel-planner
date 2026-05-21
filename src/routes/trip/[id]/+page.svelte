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
    ExternalLink,
    X,
    Info,
    Paperclip
  } from 'lucide-svelte';
  
  $: id = $page.params.id;
  
  let trip: Trip | null = null;
  let loading = true;
  let days: Date[] = [];
  let selectedDayIndex = 0;
  let events: Event[] = [];
  let loadingEvents = false;
  let deletingAttachmentId: string | null = null;
  let deletingEventId: string | null = null;
  let deletingLocationId: string | null = null;
  let deletingTrip = false;
  
  // State for event detail view
  let selectedEvent: Event | null = null;

  $: selectedDate = days[selectedDayIndex] ? formatDate(days[selectedDayIndex]) : null;

  async function fetchDayData(date: string | null) {
    if (!date) return;
    loadingEvents = true;
    
    const dayId = `${id}-${date}`;
    try {
      events = await api.getEvents(dayId);
      // Refresh selectedEvent if it's currently open
      if (selectedEvent) {
        const updated = events.find(e => e.id === selectedEvent?.id);
        selectedEvent = updated || null;
      }
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
      await fetchDayData(selectedDate);
    } catch (e) {
      alert('Failed to delete file');
      console.error(e);
    } finally {
      deletingAttachmentId = null;
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm('Are you sure you want to delete this event and all its attachments?')) return;
    
    deletingEventId = eventId;
    try {
      await api.deleteEvent(eventId);
      if (selectedEvent?.id === eventId) selectedEvent = null;
      await fetchDayData(selectedDate);
    } catch (e) {
      alert('Failed to delete event');
      console.error(e);
    } finally {
      deletingEventId = null;
    }
  }

  async function handleDeleteLocation(locationId: string) {
    if (!confirm('Are you sure you want to remove the location from this event?')) return;
    
    deletingLocationId = locationId;
    try {
      await api.deleteLocation(locationId);
      await fetchDayData(selectedDate);
    } catch (e) {
      alert('Failed to delete location');
      console.error(e);
    } finally {
      deletingLocationId = null;
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

  function openEventDetails(event: Event) {
    selectedEvent = event;
  }

  function closeEventDetails() {
    selectedEvent = null;
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

        <div class="space-y-4">
          {#if loadingEvents}
            {#each Array(3) as _}
              <div class="p-5 bg-slate-50 rounded-2xl animate-pulse flex items-center gap-4">
                <div class="h-4 bg-slate-200 rounded w-12"></div>
                <div class="h-5 bg-slate-200 rounded w-full"></div>
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
                <button 
                  on:click={() => openEventDetails(event)}
                  class="w-full text-left p-5 bg-slate-50 rounded-2xl border border-white shadow-sm hover:border-indigo-100 hover:bg-indigo-50 transition-all flex items-center gap-4 active:scale-[0.98]" 
                >
                  {#if event.time}
                    <span class="text-[10px] font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md whitespace-nowrap">
                      {event.time}
                    </span>
                  {/if}
                  <div class="flex-1 min-w-0">
                    <h4 class="font-black text-slate-800 truncate">{event.title}</h4>
                  </div>
                  <div class="flex items-center gap-2 text-slate-300">
                    {#if event.location}
                      <MapPin size={14} />
                    {/if}
                    {#if event.attachments && event.attachments.length > 0}
                      <Paperclip size={14} />
                    {/if}
                    <ChevronLeft size={16} class="rotate-180 text-slate-400 ml-1" />
                  </div>
                </button>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </main>
  {/if}

  <!-- Event Details Modal -->
  {#if selectedEvent}
    <!-- Backdrop -->
    <button 
      on:click={closeEventDetails} 
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" 
      in:fade={{ duration: 200 }} 
      out:fade={{ duration: 200 }}
    ></button>
    
    <!-- Modal -->
    <div 
      class="fixed inset-x-0 bottom-0 max-w-md mx-auto bg-white rounded-t-[3rem] shadow-2xl z-50 overflow-hidden" 
      in:fly={{ y: 400, duration: 400 }} 
      out:fly={{ y: 400, duration: 300 }}
    >
      <div class="p-8 pb-12">
        <div class="flex justify-center mb-4">
          <div class="w-12 h-1 bg-slate-100 rounded-full"></div>
        </div>
        
        <div class="flex justify-between items-start mb-8">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              {#if selectedEvent.time}
                <div class="px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                  {selectedEvent.time}
                </div>
              {/if}
              <p class="text-[10px] font-black uppercase tracking-widest text-indigo-500">{formatDisplayDate(days[selectedDayIndex])}</p>
            </div>
            <h3 class="text-3xl font-black text-slate-900 leading-tight break-words">{selectedEvent.title}</h3>
          </div>
          <div class="flex items-center gap-2">
            <button 
              on:click={() => handleDeleteEvent(selectedEvent?.id || '')}
              disabled={deletingEventId === selectedEvent?.id}
              class="p-3 bg-red-50 rounded-2xl text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
              title="Delete Event"
            >
              {#if deletingEventId === selectedEvent?.id}
                <Loader2 size={20} class="animate-spin" />
              {:else}
                <Trash2 size={20} />
              {/if}
            </button>
            <button on:click={closeEventDetails} class="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div class="space-y-8 overflow-y-auto max-h-[60vh] no-scrollbar pr-1">
          {#if selectedEvent.description}
            <section>
              <div class="flex items-center gap-2 mb-3">
                <Info size={14} class="text-indigo-500" />
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notes</h4>
              </div>
              <p class="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-5 rounded-3xl border border-white">
                {selectedEvent.description}
              </p>
            </section>
          {/if}

          {#if selectedEvent.location}
            <section>
              <div class="flex items-center gap-2 mb-3">
                <MapPin size={14} class="text-indigo-500" />
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Location</h4>
              </div>
              <div class="flex items-start gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm relative group/loc">
                <div class="p-2.5 bg-rose-50 rounded-2xl text-rose-500">
                  <MapPin size={20} />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-black text-slate-800 break-words">{selectedEvent.location.address}</p>
                </div>
                <div class="flex items-center gap-1">
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(selectedEvent.location.address || '')}"
                    target="_blank"
                    class="p-3 text-slate-300 hover:text-indigo-600 transition-colors"
                    title="Open in Maps"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button 
                    on:click={() => handleDeleteLocation(selectedEvent?.location?.id || '')}
                    disabled={deletingLocationId === selectedEvent?.location?.id}
                    class="p-3 text-slate-300 hover:text-red-500 transition-colors"
                    title="Remove location"
                  >
                    {#if deletingLocationId === selectedEvent?.location?.id}
                      <Loader2 size={18} class="animate-spin" />
                    {:else}
                      <Trash2 size={18} />
                    {/if}
                  </button>
                </div>
              </div>
            </section>
          {/if}

          {#if selectedEvent.attachments && selectedEvent.attachments.length > 0}
            <section>
              <div class="flex items-center gap-2 mb-3">
                <Paperclip size={14} class="text-indigo-500" />
                <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attachments</h4>
              </div>
              <div class="grid grid-cols-1 gap-3">
                {#each selectedEvent.attachments as attachment (attachment.id)}
                  <div class="flex gap-2">
                    <a 
                      href={attachment.fileUrl} 
                      target="_blank" 
                      class="flex-1 flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-white shadow-sm hover:bg-indigo-50 hover:border-indigo-100 transition-all overflow-hidden"
                    >
                      <div class="bg-white p-2.5 rounded-xl shadow-sm text-indigo-500">
                        <FileText size={18} />
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
            </section>
          {/if}
        </div>
      </div>
    </div>
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
