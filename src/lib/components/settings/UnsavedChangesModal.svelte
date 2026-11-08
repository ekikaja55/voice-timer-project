<script lang="ts">
	import { AlertTriangle, X, Check, Trash2 } from '@lucide/svelte';

	let {
		isOpen = false,
		onCancel = () => {},
		onDiscard = () => {},
		onSaveAndExit = () => {}
	}: {
		isOpen: boolean;
		onCancel?: () => void;
		onDiscard?: () => void;
		onSaveAndExit?: () => void;
	} = $props();
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		onclick={(e) => {
			if (e.target === e.currentTarget) onCancel();
		}}
		class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm select-none"
	>
		<div
			class="animate-in fade-in zoom-in-95 w-full max-w-md space-y-5 rounded-2xl border border-amber-500/40 bg-slate-900 p-6 text-slate-100 shadow-2xl duration-200"
		>
			<!-- Modal Header -->
			<div class="flex items-center justify-between border-b border-slate-800 pb-3.5">
				<div class="flex items-center space-x-2.5">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400"
					>
						<AlertTriangle class="h-5 w-5" />
					</div>
					<div>
						<h3 class="text-base font-black text-white">Perubahan Belum Disimpan</h3>
						<p class="font-mono text-xs text-slate-400">Konfirmasi Keluar dari Halaman</p>
					</div>
				</div>
				<button
					onclick={onCancel}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition hover:bg-slate-700 hover:text-white"
					title="Batal"
				>
					<X class="h-4 w-4" />
				</button>
			</div>

			<!-- Message Body -->
			<div class="space-y-2">
				<p class="text-xs leading-relaxed text-slate-300">
					Anda memiliki pengaturan yang telah diubah namun belum disimpan. Jika keluar sekarang,
					perubahan tersebut akan dibuang.
				</p>
				<p class="font-mono text-[11px] text-amber-300">
					Apa yang ingin Anda lakukan sebelum meninggalkan halaman ini?
				</p>
			</div>

			<!-- Action Buttons -->
			<div
				class="flex flex-col items-center justify-end gap-2 border-t border-slate-800 pt-2 sm:flex-row"
			>
				<button
					type="button"
					onclick={onCancel}
					class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-xs font-bold text-slate-200 transition hover:bg-slate-700 sm:w-auto"
				>
					Batal Keluar
				</button>

				<button
					type="button"
					onclick={onDiscard}
					class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-2 font-mono text-xs font-bold text-rose-300 transition hover:bg-rose-900/60 sm:w-auto"
				>
					<Trash2 class="h-3.5 w-3.5" />
					<span>Buang Perubahan</span>
				</button>

				<button
					type="button"
					onclick={onSaveAndExit}
					class="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 font-mono text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 sm:w-auto"
				>
					<Check class="h-3.5 w-3.5" />
					<span>Simpan & Keluar</span>
				</button>
			</div>
		</div>
	</div>
{/if}
