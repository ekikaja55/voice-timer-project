import type { BattleSpell, ParsedPair, TimerInstance, TimerStatus } from '../types/index.js';
import { playReadyAlert, playSpellEarcon, playUndoEarcon } from '../audio/earcons.js';
import type {
	WorkerInboundMessage,
	WorkerOutboundMessage,
	WorkerTimerTick
} from '../workers/types.js';

class TimerStore {
	timers = $state<TimerInstance[]>([]);
	lastDispatchedId = $state<string | null>(null);
	audioEnabled = $state<boolean>(true);

	private worker: Worker | null = null;
	private fallbackInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		this.initWorker();
	}

	private initWorker(): void {
		if (typeof window === 'undefined') return;

		try {
			this.worker = new Worker(new URL('../workers/timer.worker.ts', import.meta.url), {
				type: 'module'
			});

			this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
				this.handleWorkerMessage(event.data);
			};
		} catch {
			// In environments where Worker isn't available (e.g. Node tests), use local fallback
			this.initFallbackLoop();
		}
	}

	private initFallbackLoop(): void {
		if (this.fallbackInterval === null) {
			this.fallbackInterval = setInterval(() => {
				this.tickFallback();
			}, 250);
		}
	}

	private tickFallback(): void {
		const now = Date.now();
		let hasChanges = false;

		const updated = this.timers.map((t) => {
			const elapsedMs = now - t.startedAt;
			const remaining = Math.max(0, Math.ceil((t.totalDuration * 1000 - elapsedMs) / 1000));
			let status: TimerStatus;

			if (remaining <= 0) {
				status = 'READY';
				if (t.status !== 'READY') {
					hasChanges = true;
					if (this.audioEnabled) playReadyAlert();
				}
			} else if (remaining <= 15) {
				status = 'WARNING';
			} else {
				status = 'COOLDOWN';
			}

			if (remaining !== t.remainingSeconds || status !== t.status) {
				hasChanges = true;
			}

			return {
				...t,
				remainingSeconds: remaining,
				status
			};
		});

		if (hasChanges) {
			this.timers = updated;
		}
	}

	private handleWorkerMessage(message: WorkerOutboundMessage): void {
		switch (message.type) {
			case 'TICK': {
				this.syncTicks(message.payload);
				break;
			}
			case 'TIMER_READY': {
				if (this.audioEnabled) {
					playReadyAlert();
				}
				break;
			}
			case 'TIMER_REMOVED': {
				this.timers = this.timers.filter((t) => t.id !== message.payload.id);
				break;
			}
		}
	}

	private syncTicks(ticks: WorkerTimerTick[]): void {
		const tickMap = new Map(ticks.map((tk) => [tk.id, tk]));

		// Update or maintain timers
		this.timers = this.timers.map((timer) => {
			const tick = tickMap.get(timer.id);
			if (tick) {
				return {
					...timer,
					remainingSeconds: tick.remainingSeconds,
					status: tick.status
				};
			}
			return timer;
		});
	}

	private postToWorker(msg: WorkerInboundMessage): void {
		if (this.worker) {
			this.worker.postMessage(msg);
		}
	}

	/**
	 * Starts a new battle spell cooldown timer.
	 */
	startTimer(heroName: string, spell: BattleSpell, hasPyt = false, heroId?: string): TimerInstance {
		// Scoped Modifier calculation: -15% if hasPYT is true
		const finalDuration = hasPyt ? Math.round(spell.cooldown * 0.85) : spell.cooldown;

		const id = `timer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

		const newTimer: TimerInstance = {
			id,
			heroId: heroId || heroName.toLowerCase(),
			heroName,
			spellId: spell.id,
			spellName: spell.name,
			totalDuration: finalDuration,
			remainingSeconds: finalDuration,
			hasPyt,
			startedAt: Date.now(),
			status: finalDuration <= 15 ? 'WARNING' : 'COOLDOWN'
		};

		// 1. Play auditory earcon confirmation
		if (this.audioEnabled) {
			playSpellEarcon(spell);
		}

		// 2. Dispatch to Web Worker
		this.postToWorker({
			type: 'ADD_TIMER',
			payload: {
				id,
				heroName,
				spellName: spell.name,
				heroId,
				spellId: spell.id,
				durationSeconds: finalDuration,
				hasPyt
			}
		});

		// 3. Add to local reactive state
		this.timers = [newTimer, ...this.timers];
		this.lastDispatchedId = id;

		return newTimer;
	}

	/**
	 * Dispatches an array of extracted pairs (from Burst NLP phrase).
	 */
	dispatchVoicePairs(pairs: ParsedPair[]): TimerInstance[] {
		const started: TimerInstance[] = [];
		for (const p of pairs) {
			const timer = this.startTimer(p.heroName, p.spell, p.hasPyt, p.heroId);
			started.push(timer);
		}
		return started;
	}

	/**
	 * Cancels the most recently created timer (Instant Undo).
	 */
	undoLastTimer(): boolean {
		if (!this.lastDispatchedId) return false;

		const idToUndo = this.lastDispatchedId;
		this.cancelTimer(idToUndo);
		this.lastDispatchedId = null;

		return true;
	}

	/**
	 * Cancels an individual timer by its ID.
	 */
	cancelTimer(id: string): void {
		if (this.audioEnabled) {
			playUndoEarcon();
		}

		this.postToWorker({
			type: 'REMOVE_TIMER',
			payload: { id }
		});

		this.timers = this.timers.filter((t) => t.id !== id);
		if (this.lastDispatchedId === id) {
			this.lastDispatchedId = null;
		}
	}

	/**
	 * Resets all active timers.
	 */
	resetAll(): void {
		this.postToWorker({ type: 'RESET_ALL' });
		this.timers = [];
		this.lastDispatchedId = null;
	}

	/**
	 * Toggles auditory feedback.
	 */
	setAudioEnabled(enabled: boolean): void {
		this.audioEnabled = enabled;
	}

	/**
	 * Destroys worker and intervals upon cleanup.
	 */
	destroy(): void {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		if (this.fallbackInterval !== null) {
			clearInterval(this.fallbackInterval);
			this.fallbackInterval = null;
		}
	}
}

export const timerStore = new TimerStore();
