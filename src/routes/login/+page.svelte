<script lang="ts">
	import { ChevronLeft, Mail, Lock, Loader2, LogIn } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import { auth } from '$lib/firebase/client';
	import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let message = '';
	let submitting = false;
	let googleSubmitting = false;

	async function createSession(idToken: string) {
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
	}

	async function handleLogin() {
		submitting = true;
		message = '';
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			const idToken = await userCredential.user.getIdToken();
			await createSession(idToken);
		} catch (error) {
			console.error('Login error:', error);
			message = 'Incorrect email or password';
		} finally {
			submitting = false;
		}
	}

	async function handleGoogleLogin() {
		googleSubmitting = true;
		message = '';
		try {
			const provider = new GoogleAuthProvider();
			const userCredential = await signInWithPopup(auth, provider);
			const idToken = await userCredential.user.getIdToken();
			await createSession(idToken);
		} catch (error) {
			console.error('Google login error:', error);
			message = 'Failed to sign in with Google';
		} finally {
			googleSubmitting = false;
		}
	}
</script>

<div class="min-h-screen bg-slate-50 p-6 flex flex-col justify-center">
	<header class="max-w-md mx-auto mb-10 w-full flex items-center justify-center">
		<h1 class="text-xl font-black text-slate-800 tracking-tight">Welcome Back</h1>
	</header>

	<main class="max-w-md mx-auto w-full" in:fly={{ y: 20 }}>
		<div class="space-y-8">
			<form 
				on:submit|preventDefault={handleLogin}
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
							/>
						</div>
					</div>
				</div>

				<button 
					type="submit" 
					disabled={submitting || googleSubmitting}
					class="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2"
				>
					{#if submitting}
						<Loader2 class="animate-spin" size={20} />
						Authenticating...
					{:else}
						<LogIn size={20} />
						Log In
					{/if}
				</button>
			</form>

			<div class="flex items-center gap-4">
				<div class="flex-1 h-px bg-slate-200"></div>
				<span class="text-[10px] font-black uppercase tracking-widest text-slate-400">or</span>
				<div class="flex-1 h-px bg-slate-200"></div>
			</div>

			<button 
				on:click={handleGoogleLogin}
				disabled={googleSubmitting || submitting}
				class="w-full bg-white text-slate-700 font-bold py-4 rounded-[2rem] shadow-md border border-slate-100 hover:bg-slate-50 disabled:bg-slate-300 transition-all active:scale-95 flex items-center justify-center gap-3"
			>
				{#if googleSubmitting}
					<Loader2 class="animate-spin" size={20} />
					Connecting...
				{:else}
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					Continue with Google
				{/if}
			</button>
		</div>

		<p class="text-center mt-8 text-sm font-medium text-slate-500">
			New here? 
			<a href="/register" class="text-indigo-600 font-bold hover:underline">Create an account</a>
		</p>
	</main>
</div>
