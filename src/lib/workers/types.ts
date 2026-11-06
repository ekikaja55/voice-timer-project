import type { BattleSpellId, TimerStatus } from '../types/index.js';

export interface WorkerTimerEntry {
	id: string;
	heroName: string;
	spellName: string;
	heroId?: string;
	spellId: BattleSpellId;
	totalDuration: number;
	startedAt: number;
	pausedAt?: number;
	totalPausedDuration: number;
	isPaused: boolean;
	hasPyt: boolean;
	status: TimerStatus;
	readyNotified: boolean;
}

export type WorkerInboundMessage =
	| {
			type: 'ADD_TIMER';
			payload: {
				id: string;
				heroName: string;
				spellName: string;
				heroId?: string;
				spellId: BattleSpellId;
				durationSeconds: number;
				hasPyt: boolean;
			};
	  }
	| {
			type: 'REMOVE_TIMER';
			payload: {
				id: string;
			};
	  }
	| {
			type: 'PAUSE_TIMER';
			payload: {
				id: string;
			};
	  }
	| {
			type: 'RESUME_TIMER';
			payload: {
				id: string;
			};
	  }
	| {
			type: 'RESET_ALL';
	  };

export interface WorkerTimerTick {
	id: string;
	heroName: string;
	spellName: string;
	heroId?: string;
	spellId: BattleSpellId;
	totalDuration: number;
	remainingSeconds: number;
	hasPyt: boolean;
	status: TimerStatus;
	isPaused: boolean;
}

export type WorkerOutboundMessage =
	| {
			type: 'TICK';
			payload: WorkerTimerTick[];
	  }
	| {
			type: 'TIMER_READY';
			payload: {
				id: string;
				heroName: string;
				spellName: string;
			};
	  }
	| {
			type: 'TIMER_REMOVED';
			payload: {
				id: string;
			};
	  };
