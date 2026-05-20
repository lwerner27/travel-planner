<script>
	import { ChevronLeft, Mail, Lock, Loader2, UserPlus } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { auth } from '$lib/firebase/client';
	import { createUserWithEmailAndPassword } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let message = '';
	let submitting = false;

	async function handleRegister() {
		submitting = true;
		message = '';
		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const idToken = await userCredential.user.getIdToken();

			const response = await fetch('/api/session', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ idToken })
			});

			if (response.ok) {
				await goto('/', { invalidateAll: true });
			} else {
				message = 'Failed to create session';
			}
		} catch (error) {
			console.error('Registration error:', error);
			message = 'Failed to create account. Email may already be in use.';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="min-h-screen bg-slate-50 p-6 flex flex-col justify-center">
	<header class="max-w-md mx-auto mb-10 w-full flex items-center justify-start">
		<a href="/login" class="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-indigo-600 transition-colors">
			<ChevronLeft size={20} />
		</a>
		<h1 class="text-xl font-black text-slate-800 tracking-tight ml-4">Create Account</h1>
	</header>

	<main class="max-w-md mx-auto w-full" in:fly={{ y: 20 }}>
		<form 
			on:submit|preventDefault={handleRegister}
			class="space-y-8"
		>
			<div class="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-6">
				{#if message}
					<p class="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-2xl border border-red-100 italic">
						{message}
					</p>
				{/if}

				<div>
					<label for="email" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Email Address</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
							<Mail size={18} />
						</div>
						<input 
							type="email" 
							id="email" 
							bind:value={email}
							placeholder="you@example.com" 
							class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
							required
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 ml-1">Password</label>
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
							<Lock size={18} />
						</div>
						<input 
							type="password" 
							id="password" 
							bind:value={password}
							placeholder="••••••••" 
							class="w-full pl-11 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300"
							required
							minlength="6"
						/>
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
					Creating Account...
				{:else}
					<UserPlus size={20} />
					Join Now
				{/if}
			</button>
		</form>

		<p class="text-center mt-8 text-sm font-medium text-slate-500">
			Already have an account? 
			<a href="/login" class="text-indigo-600 font-bold hover:underline">Log in</a>
		</p>
	</main>
</div>
