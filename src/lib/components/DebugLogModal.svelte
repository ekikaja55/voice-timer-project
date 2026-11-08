<script lang="ts">
	import {
		Bug,
		X,
		Copy,
		Check,
		Trash2,
		Smartphone,
		ShieldCheck,
		ShieldAlert,
		Mic,
		AlertTriangle
	} from '@lucide/svelte';
	import { debugLogger, type LogLevel, type LogEntry } from '../utils/debugLogger.svelte.js';

	let copied = $state(false);
	let selectedLevel = $state<LogLevel | 'ALL'>('ALL');
	let selectedTag = $state<string>('ALL');

	let snapshot = $derived(debugLogger.getSystemSnapshot());

	let filteredLogs = $derived(
		debugLogger.entries.filter((entry: LogEntry) => {
			const matchesLevel = selectedLevel === 'ALL' || entry.level === selectedLevel;
			const matchesTag = selectedTag === 'ALL' || entry.tag === selectedTag;
			return matchesLevel && matchesTag;
		})
	);

	async function handleCopy(): Promise<void> {
		const success = await debugLogger.copyToClipboard();
		if (success) {
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		}
	}

	const tags = ['ALL', 'OVERLAY', 'SPEECH', 'TOUCH', 'AUDIO', 'NLP', 'SYS'];
</script>

{#if debugLogger.isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-6"
	>
		<!-- Modal Window -->
		<div
			class="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
		>
			<!-- Top Header -->
			<div class="flex items-center justify-between border-b border-slate-800 p-4 sm:px-6">
				<div class="flex items-center space-x-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10"
					>
						<Bug class="h-4 w-4 text-indigo-400" />
					</div>
					<div>
						<h2 class="text-sm font-bold text-white sm:text-base">Mobile & Voice Debugger</h2>
						<p class="font-mono text-[11px] text-slate-400">
							{debugLogger.entries.length} log tersimpan • Ring buffer 300 entri
						</p>
					</div>
				</div>

				<div class="flex items-center space-x-2">
					<button
						onclick={handleCopy}
						class="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-95"
						title="Salin semua log ke clipboard"
					>
						{#if copied}
							<Check class="h-3.5 w-3.5 text-emerald-400" />
							<span class="text-emerald-400">Tersalin!</span>
						{:else}
							<Copy class="h-3.5 w-3.5 text-slate-300" />
							<span>Salin Log</span>
						{/if}
					</button>

					<button
						onclick={() => debugLogger.clear()}
						class="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs font-semibold text-slate-400 transition hover:border-rose-900/50 hover:text-rose-400 active:scale-95"
						title="Bersihkan log"
					>
						<Trash2 class="h-3.5 w-3.5" />
						<span class="hidden sm:inline">Bersihkan</span>
					</button>

					<button
						onclick={() => debugLogger.closePanel()}
						class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white"
						title="Tutup debugger"
					>
						<X class="h-4 w-4" />
					</button>
				</div>
			</div>

			<!-- System Diagnostics Pill Strip -->
			<div
				class="flex flex-wrap items-center gap-2 border-b border-slate-800/80 bg-slate-900/50 px-4 py-2.5 sm:px-6"
			>
				<!-- Device Type -->
				<span
					class="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-300"
				>
					<Smartphone class="h-3 w-3 text-indigo-400" />
					{snapshot.isMobile ? 'Mobile' : 'Desktop'}
					{#if snapshot.isTouchSupported}
						<span class="text-slate-400">({snapshot.maxTouchPoints} pts)</span>
					{/if}
				</span>

				<!-- Secure Context -->
				{#if snapshot.isSecureContext}
					<span
						class="inline-flex items-center gap-1 rounded-md border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 font-mono text-[11px] text-emerald-300"
					>
						<ShieldCheck class="h-3 w-3 text-emerald-400" />
						Secure Context ({snapshot.protocol})
					</span>
				{:else}
					<span
						class="inline-flex items-center gap-1 rounded-md border border-rose-900/80 bg-rose-950/60 px-2 py-0.5 font-mono text-[11px] text-rose-300"
					>
						<ShieldAlert class="h-3 w-3 text-rose-400" />
						Insecure Context (Mic Terblokir di Mobile!)
					</span>
				{/if}

				<!-- SpeechRecognition API -->
				<span
					class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] {snapshot.hasSpeechRecognition
						? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-300'
						: 'border-amber-900/60 bg-amber-950/40 text-amber-300'}"
				>
					<Mic class="h-3 w-3" />
					STT: {snapshot.speechRecognitionVendor}
				</span>

				<!-- Screen Dimension -->
				<span
					class="hidden rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[11px] text-slate-400 sm:inline"
				>
					Layar: {snapshot.screenDimensions}
				</span>
			</div>

			<!-- Insecure Context Mobile Alert Banner if triggered over LAN HTTP -->
			{#if !snapshot.isSecureContext && snapshot.isMobile}
				<div
					class="flex items-start gap-2.5 border-b border-rose-900/60 bg-rose-950/40 px-4 py-2 text-rose-200 sm:px-6"
				>
					<AlertTriangle class="h-4 w-4 shrink-0 text-rose-400" />
					<p class="font-mono text-xs leading-relaxed">
						<strong>Peringatan Akses Jaringan:</strong> Anda mengakses aplikasi via HTTP di IP LAN (<code
							>{snapshot.host}</code
						>). Browser mobile (Chrome/Safari) secara otomatis
						<strong>memblokir akses mikrofon dan speech recognition</strong> tanpa protokol HTTPS atau
						port forwarding localhost (via USB debugging ADB).
					</p>
				</div>
			{/if}

			<!-- Filter Bar -->
			<div
				class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-4 py-2 sm:px-6"
			>
				<!-- Tag Filter Tabs -->
				<div class="flex flex-wrap items-center gap-1">
					<span class="mr-1 font-mono text-[11px] text-slate-400">Tag:</span>
					{#each tags as tag (tag)}
						<button
							onclick={() => (selectedTag = tag)}
							class="rounded-md px-2 py-0.5 font-mono text-xs transition {selectedTag === tag
								? 'bg-indigo-600 font-bold text-white'
								: 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
						>
							{tag}
						</button>
					{/each}
				</div>

				<!-- Level Filter Tabs -->
				<div class="flex items-center gap-1">
					<span class="mr-1 font-mono text-[11px] text-slate-400">Level:</span>
					{#each ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const as level (level)}
						<button
							onclick={() => (selectedLevel = level)}
							class="rounded-md px-2 py-0.5 font-mono text-[11px] transition {selectedLevel ===
							level
								? 'bg-slate-700 font-bold text-white'
								: 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
						>
							{level}
						</button>
					{/each}
				</div>
			</div>

			<!-- Log Output Stream Area -->
			<div class="flex-1 space-y-1.5 overflow-y-auto p-4 font-mono text-xs sm:px-6">
				{#if filteredLogs.length === 0}
					<div class="py-12 text-center text-slate-400">
						Belum ada log yang sesuai dengan filter yang dipilih.
					</div>
				{:else}
					{#each filteredLogs as log (log.id)}
						<div
							class="border-slate-850 flex flex-col items-start gap-1 rounded-lg border bg-slate-900/60 p-2 sm:flex-row sm:items-baseline sm:gap-2.5"
						>
							<div class="flex shrink-0 items-center gap-1.5">
								<span class="text-[10px] text-slate-400">{log.timestamp}</span>
								<span
									class="py-0.2 rounded px-1.5 text-[9px] font-bold tracking-wider uppercase {log.level ===
									'ERROR'
										? 'bg-rose-500/20 text-rose-400'
										: log.level === 'WARN'
											? 'bg-amber-500/20 text-amber-400'
											: log.level === 'INFO'
												? 'bg-emerald-500/20 text-emerald-400'
												: 'bg-indigo-500/20 text-indigo-400'}"
								>
									{log.level}
								</span>
								<span
									class="py-0.2 rounded bg-slate-800 px-1.5 text-[10px] font-semibold text-slate-300"
								>
									{log.tag}
								</span>
							</div>

							<div class="min-w-0 flex-1 break-all">
								<span class="text-slate-100">{log.message}</span>
								{#if log.data !== undefined}
									<pre
										class="mt-1 overflow-x-auto rounded bg-slate-950 p-2 text-[11px] text-slate-400">{JSON.stringify(
											log.data,
											null,
											2
										)}</pre>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-between border-t border-slate-800 px-4 py-2.5 font-mono text-[11px] text-slate-400 sm:px-6"
			>
				<span>Tips: Gunakan tombol "Salin Log" untuk membagikan detail diagnosa lengkap.</span>
				<span>{filteredLogs.length} ditampilkan</span>
			</div>
		</div>
	</div>
{/if}
