<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/services/api';
  import { formatStringDate } from '$lib/utils/date';
  import { ChevronLeft, Clock, FileText, Loader2, Calendar, MapPin, Upload, X, Plus, Save } from 'lucide-svelte';
  import { fly, slide, fade } from 'svelte/transition';

  $: tripId = $page.params.id;
  $: eventId = $page.params.eventId;

  let title = '';
  let time = '';
  let description = '';
  let locationAddress = '';
  let files: File[] = [];
  let existingAttachments: any[] = [];
  let submitting = false;
  let loading = true;
  let date = '';

  async function loadEvent() {
    try {
      const event = await fetch(`/api/events/${eventId}`).then(r => r.json());
      title = event.title;
      time = event.time || '';
      description = event.description || '';
      locationAddress = event.location?.address || '';
      existingAttachments = event.attachments || [];
      date = event.date;
    } catch (e) {
      console.error('Failed to load event:', e);
      alert('Failed to load event data');
      goto(`/trip/${tripId}`);
    } finally {
      loading = false;
    }
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const newFiles = Array.from(target.files);
      files = [...files, ...newFiles];
    }
  }

  function removeNewFile(index: number) {
    files = files.filter((_, i) => i !== index);
  }

  async function handleDeleteExistingAttachment(attachmentId: string) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.deleteAttachment(attachmentId);
      existingAttachments = existingAttachments.filter(a => a.id !== attachmentId);
    } catch (e) {
      alert('Failed to delete file');
    }
  }

  async function handleSubmit() {
    if (!title || !eventId) return;
    
    submitting = true;
    try {
      const eventData = {
        title,
        time: time || '',
        description: description || '',
        location: locationAddress ? { address: locationAddress } : undefined
      };

      await api.updateEvent(eventId, eventData, files);
      goto(`/trip/${tripId}`);
    } catch (e) {
      console.error(e);
      submitting = false;
      alert('Failed to update event');
    }
  }

  onMount(loadEvent);

  $: displayDate = date ? formatStringDate(date) : '...';
</script>

<div class="min-h-screen bg-slate-50 p-6 pb-20">
  <header class="max-w-md mx-auto mb-10 flex items-center justify-between">
    <button on:click={() => history.back()} class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
      <ChevronLeft size={20} />
    </button>
    <h1 class="text-xl font-black text-slate-800">Edit Event</h1>
    <div class="w-11"></div>
  </header>

  <main class="max-w-md mx-auto">
    {#if loading}
      <div class="flex flex-col items-center justify-center py-20" in:fade>
        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading Details...</p>
      </div>
    {:else}
      <div class="flex items-center gap-2 mb-6 ml-2" in:fade>
        <Calendar size={14} class="text-indigo-500" />
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">For {displayDate}</p>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="space-y-8" in:fly={{ y: 20 }}>
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
                placeholder="Address or Place Name" 
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
              <h3 class="text-[10px] font-black uppercase tracking-widest text-indigo-500">Attachments</h3>
            </div>

            <!-- Existing Attachments -->
            {#if existingAttachments.length > 0}
              <div class="space-y-3">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Files</p>
                <div class="flex flex-wrap gap-2">
                  {#each existingAttachments as attachment}
                    <div class="bg-slate-50 border border-slate-100 pl-3 pr-2 py-2 rounded-xl flex items-center gap-2">
                      <FileText size={12} class="text-indigo-400" />
                      <span class="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">{attachment.fileName}</span>
                      <button type="button" on:click={() => handleDeleteExistingAttachment(attachment.id)} class="text-slate-300 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- New Attachments -->
            <div class="space-y-3">
              {#if files.length > 0}
                <p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">New Files to Upload</p>
              {/if}
              <div class="flex flex-wrap gap-3">
                {#each files as file, i}
                  <div class="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold" transition:slide>
                    <span class="max-w-[150px] truncate">{file.name}</span>
                    <button type="button" on:click={() => removeNewFile(i)} class="hover:text-red-500">
                      <X size={14} />
                    </button>
                  </div>
                {/each}
                
                <label class="flex items-center justify-center gap-2 bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 px-4 py-3 rounded-2xl text-xs font-bold cursor-pointer hover:bg-slate-100 hover:border-indigo-200 hover:text-indigo-400 transition-all">
                  <Plus size={16} />
                  <span>Add More Files</span>
                  <input type="file" multiple on:change={handleFileChange} class="hidden" />
                </label>
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
            Updating...
          {:else}
            <Save size={20} />
            Update Event
          {/if}
        </button>
      </form>
    {/if}
  </main>
</div>
