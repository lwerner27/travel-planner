<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api } from '$lib/services/api';
  import { formatStringDate } from '$lib/utils/date';
  import { ChevronLeft, Upload, Loader2, FileText, Calendar, X } from 'lucide-svelte';
  import { fly, fade } from 'svelte/transition';

  $: tripId = $page.params.id;
  $: date = $page.url.searchParams.get('date');
  $: displayDate = formatStringDate(date || '');

  let files: FileList | null;
  let submitting = false;

  async function handleSubmit() {
    if (!files || files.length === 0) return;
    
    submitting = true;
    try {
      const file = files[0];
      await api.createAttachment({
        dayId: `${tripId}-${date}`,
        fileName: file.name,
        mimeType: file.type
      }, file);
      goto(`/trip/${tripId}`);
    } catch (e) {
      console.error(e);
      submitting = false;
    }
  }

  function clearFile() {
    files = null;
  }
</script>

<div class="min-h-screen bg-slate-50 p-6">
  <header class="max-w-md mx-auto mb-10 flex items-center justify-between">
    <button on:click={() => history.back()} class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
      <ChevronLeft size={20} />
    </button>
    <h1 class="text-xl font-black text-slate-800">Upload File</h1>
    <div class="w-11"></div>
  </header>

  <main class="max-w-md mx-auto" in:fly={{ y: 20 }}>
    <div class="flex items-center gap-2 mb-6 ml-2">
      <Calendar size={14} class="text-indigo-500" />
      <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">For {displayDate}</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-8">
      <div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50">
        <div class="border-2 border-dashed border-slate-100 rounded-[2rem] p-10 text-center bg-slate-50 group hover:border-indigo-200 transition-colors relative">
          <input 
            type="file" 
            id="file" 
            bind:files 
            class="hidden"
            required
          />
          
          {#if files && files[0]}
            <div class="flex flex-col items-center" in:fade>
              <div class="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg mb-4">
                <FileText size={32} />
              </div>
              <p class="text-sm font-black text-slate-800 break-all px-4">{files[0].name}</p>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">
                {(files[0].size / 1024).toFixed(1)} KB
              </p>
              
              <button 
                type="button" 
                on:click={clearFile}
                class="mt-6 flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
              >
                <X size={12} strokeWidth={3} />
                Remove
              </button>
            </div>
          {:else}
            <label for="file" class="cursor-pointer flex flex-col items-center">
              <div class="bg-white p-4 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Upload size={32} class="text-indigo-500" />
              </div>
              <h2 class="text-sm font-black text-slate-800 mb-1">Select a document</h2>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                PDF, Image, or Ticket
              </p>
            </label>
          {/if}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={submitting || !files || files.length === 0}
        class="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        {#if submitting}
          <Loader2 class="animate-spin" size={20} />
          Uploading...
        {:else}
          Save to Itinerary
        {/if}
      </button>
    </form>
  </main>
</div>
