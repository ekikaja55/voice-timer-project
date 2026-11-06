/// <reference lib="webworker" />

import type {
	WorkerInboundMessage,
	WorkerOutboundMessage,
	WorkerTimerEntry,
	WorkerTimerTick
} from './types.js';

const activeTimers = new Map<string, WorkerTimerEntry>();
let tickIntervalId: ReturnType<typeof setInterval> | null = null;

function calculateTimerStatus(remainingSeconds: number): 'COOLDOWN' | 'WARNING' | 'READY' {
	if (remainingSeconds <= 0) return 'READY';
	if (remainingSeconds <= 15) return 'WARNING';
	return 'COOLDOWN';
}

function tick(): void {
	const now = Date.now();
	const ticks: WorkerTimerTick[] = [];

	for (const timer of activeTimers.values()) {
		if (timer.isPaused) {
			const elapsedBeforePause =
				(timer.pausedAt || now) - timer.startedAt - timer.totalPausedDuration;
			const remaining = Math.max(
				0,
				Math.ceil((timer.totalDuration * 1000 - elapsedBeforePause) / 1000)
			);
			ticks.push({
				id: timer.id,
				heroName: timer.heroName,
				spellName: timer.spellName,
				heroId: timer.heroId,
				spellId: timer.spellId,
				totalDuration: timer.totalDuration,
				remainingSeconds: remaining,
				hasPyt: timer.hasPyt,
				status: timer.status,
				isPaused: true
			});
			continue;
		}

		// Calculate exact elapsed milliseconds
		const elapsedMs = now - timer.startedAt - timer.totalPausedDuration;
		const remainingSeconds = Math.max(
			0,
			Math.ceil((timer.totalDuration * 1000 - elapsedMs) / 1000)
		);
		const status = calculateTimerStatus(remainingSeconds);
		timer.status = status;

		// If timer just completed (0s), trigger TIMER_READY alert
		if (remainingSeconds === 0 && !timer.readyNotified) {
			timer.readyNotified = true;
			const readyMsg: WorkerOutboundMessage = {
				type: 'TIMER_READY',
				payload: {
					id: timer.id,
					heroName: timer.heroName,
					spellName: timer.spellName
				}
			};
			self.postMessage(readyMsg);
		}

		ticks.push({
			id: timer.id,
			heroName: timer.heroName,
			spellName: timer.spellName,
			heroId: timer.heroId,
			spellId: timer.spellId,
			totalDuration: timer.totalDuration,
			remainingSeconds,
			hasPyt: timer.hasPyt,
			status,
			isPaused: false
		});
	}

	const tickMsg: WorkerOutboundMessage = {
		type: 'TICK',
		payload: ticks
	};
	self.postMessage(tickMsg);

	// Stop interval if no timers exist
	if (activeTimers.size === 0 && tickIntervalId !== null) {
		clearInterval(tickIntervalId);
		tickIntervalId = null;
	}
}

function ensureIntervalRunning(): void {
	if (tickIntervalId === null) {
		tickIntervalId = setInterval(tick, 250);
	}
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
	const message = event.data;

	switch (message.type) {
		case 'ADD_TIMER': {
			const { id, heroName, spellName, heroId, spellId, durationSeconds, hasPyt } = message.payload;
			const entry: WorkerTimerEntry = {
				id,
				heroName,
				spellName,
				heroId,
				spellId,
				totalDuration: durationSeconds,
				startedAt: Date.now(),
				totalPausedDuration: 0,
				isPaused: false,
				hasPyt,
				status: calculateTimerStatus(durationSeconds),
				readyNotified: false
			};
			activeTimers.set(id, entry);
			ensureIntervalRunning();
			tick(); // Immediate initial tick
			break;
		}

		case 'REMOVE_TIMER': {
			activeTimers.delete(message.payload.id);
			const removedMsg: WorkerOutboundMessage = {
				type: 'TIMER_REMOVED',
				payload: { id: message.payload.id }
			};
			self.postMessage(removedMsg);
			tick();
			break;
		}

		case 'PAUSE_TIMER': {
			const timer = activeTimers.get(message.payload.id);
			if (timer && !timer.isPaused) {
				timer.isPaused = true;
				timer.pausedAt = Date.now();
			}
			tick();
			break;
		}

		case 'RESUME_TIMER': {
			const timer = activeTimers.get(message.payload.id);
			if (timer && timer.isPaused) {
				timer.isPaused = false;
				if (timer.pausedAt) {
					timer.totalPausedDuration += Date.now() - timer.pausedAt;
					timer.pausedAt = undefined;
				}
			}
			tick();
			break;
		}

		case 'RESET_ALL': {
			activeTimers.clear();
			if (tickIntervalId !== null) {
				clearInterval(tickIntervalId);
				tickIntervalId = null;
			}
			tick();
			break;
		}
	}
};
