<script lang="ts">
	import { Mic, CheckCircle2, AlertTriangle, XCircle, X, RefreshCw } from '@lucide/svelte';
	import { audioChecker } from '../speech/audioChecker.svelte.js';

	function handleRetry(): void {
		audioChecker.requestAndStartAudioAnalysis().catch(() => {});
	}
</script>

{#if audioChecker.state.isModalOpen}
	<!-- Diagnostic Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm select-none"
	>
		<div
			class="animate-in fade-in zoom-in-95 w-full max-w-lg space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl duration-200"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-slate-800 pb-3.5">
				<div class="flex items-center space-x-2.5">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-400"
					>
						<Mic class="h-4 w-4" />
					</div>
					<div>
						<h3 class="text-base font-black text-white">Diagnostik Audio & Mikrofon</h3>
						<p class="font-mono text-[11px] text-slate-400">
							Pemeriksaan status perangkat dan Web Speech API
						</p>
					</div>
				</div>
				<button
					onclick={() => audioChecker.closeModal()}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
					title="Tutup Modal"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Diagnostic Items -->
			<div class="space-y-3">
				<!-- 1. Browser Speech Recognition Support -->
				<div
					class="flex items-start space-x-3 rounded-xl border p-3.5 {audioChecker.state
						.isSpeechSupported
						? 'border-emerald-500/30 bg-emerald-950/20'
						: 'border-amber-500/30 bg-amber-950/20'}"
				>
					{#if audioChecker.state.isSpeechSupported}
						<CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
						<div>
							<h4 class="text-xs font-bold text-white">Browser Mendukung Web Speech API</h4>
							<p class="mt-0.5 font-mono text-[11px] text-slate-400">
								Pengenalan suara native (id-ID) siap digunakan.
							</p>
						</div>
					{:else}
						<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
						<div>
							<h4 class="text-xs font-bold text-amber-300">
								SpeechRecognition Belum Aktif di Browser Ini
							</h4>
							<p class="mt-1 text-[11px] leading-relaxed text-slate-300">
								Jika Anda menggunakan <strong>Firefox</strong>, Web Speech API dinonaktifkan secara
								default oleh Mozilla.
							</p>
							<div class="mt-2 rounded-lg border border-amber-500/20 bg-slate-950 p-2.5">
								<p class="font-mono text-[10px] text-slate-400">Cara Mengaktifkan di Firefox:</p>
								<ol class="mt-1 list-decimal space-y-0.5 pl-4 font-mono text-[10px] text-slate-300">
									<li>
										Buka tab baru: <code class="text-amber-300">about:config</code>
									</li>
									<li>
										Set <code class="text-amber-300">media.webspeech.recognition.enable</code> ke
										<strong>true</strong>
									</li>
									<li>
										Set <code class="text-amber-300">media.webspeech.recognition.force_enable</code>
										ke <strong>true</strong>
									</li>
								</ol>
								<p class="mt-2 font-mono text-[10px] text-slate-400">
									Rekomendasi terbaik: Buka aplikasi ini di <strong>Microsoft Edge</strong> atau
									<strong>Google Chrome</strong> untuk pengalaman voice HUD tanpa konfigurasi.
								</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- 2. Hardware Microphone Detection -->
				<div
					class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3.5"
				>
					<div class="flex items-center space-x-2.5">
						{#if audioChecker.state.hasAudioInputHardware}
							<CheckCircle2 class="h-4 w-4 text-emerald-400" />
							<span class="text-xs font-bold text-white">Hardware Mikrofon Terdeteksi</span>
						{:else}
							<XCircle class="h-4 w-4 text-rose-400" />
							<span class="text-xs font-bold text-rose-300">Mikrofon Tidak Terdeteksi</span>
						{/if}
					</div>
					<span
						class="rounded px-2 py-0.5 font-mono text-[10px] font-bold {audioChecker.state
							.hasAudioInputHardware
							? 'bg-emerald-500/20 text-emerald-300'
							: 'bg-rose-500/20 text-rose-300'}"
					>
						{audioChecker.state.hasAudioInputHardware ? 'CONNECTED' : 'NOT FOUND'}
					</span>
				</div>

				<!-- 3. Permission & Audio Stream Level Visualizer -->
				<div
					class="flex flex-col space-y-2.5 rounded-xl border border-slate-800 bg-slate-950 p-3.5"
				>
					<div class="flex items-center justify-between">
						<span class="text-xs font-bold text-white">Izin Akses Mikrofon Browser</span>
						<span
							class="rounded px-2 py-0.5 font-mono text-[10px] font-bold {audioChecker.state
								.permissionStatus === 'granted'
								? 'bg-emerald-500/20 text-emerald-300'
								: audioChecker.state.permissionStatus === 'denied'
									? 'bg-rose-500/20 text-rose-300'
									: 'bg-slate-800 text-slate-400'}"
						>
							{audioChecker.state.permissionStatus.toUpperCase()}
						</span>
					</div>

					<!-- Real-time Volume Bar -->
					<div class="space-y-1">
						<div class="flex items-center justify-between font-mono text-[10px] text-slate-400">
							<span>Indikator Sinyal Audio:</span>
							<span>{audioChecker.state.audioLevel}%</span>
						</div>
						<div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
							<div
								class="h-full rounded-full transition-all duration-75 {audioChecker.state
									.audioLevel > 50
									? 'bg-emerald-400'
									: 'bg-indigo-500'}"
								style="width: {audioChecker.state.audioLevel}%"
							></div>
						</div>
						<p class="font-mono text-[10px] text-slate-500">
							Bicaralah ke mikrofon untuk memverifikasi level sinyal audio.
						</p>
					</div>
				</div>
			</div>

			<!-- Footer Buttons -->
			<div class="flex items-center justify-between border-t border-slate-800 pt-3.5">
				<button
					onclick={handleRetry}
					class="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 font-mono text-xs font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white"
				>
					<RefreshCw class="h-3.5 w-3.5" />
					<span>Uji Ulang Mikrofon</span>
				</button>

				<button
					onclick={() => audioChecker.closeModal()}
					class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500"
				>
					Mengerti & Tutup
				</button>
			</div>
		</div>
	</div>
{/if}
