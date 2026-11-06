import type { BattleSpell } from '../types/index.js';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

/**
 * Lazily obtains or initializes the singleton AudioContext.
 * Returns null if running in an environment without Web Audio API (e.g. SSR or Node).
 */
export function getAudioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;

	if (!audioCtx) {
		const AudioContextClass =
			window.AudioContext ||
			// @ts-expect-error webkit prefix fallback
			window.webkitAudioContext;

		if (AudioContextClass) {
			audioCtx = new AudioContextClass();
			masterGain = audioCtx.createGain();
			masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime); // Safe initial volume
			masterGain.connect(audioCtx.destination);
		}
	}

	return audioCtx;
}

/**
 * Resumes AudioContext on initial user gesture (Spacebar, Click, Touch) to comply with browser autoplay policy.
 */
export async function unlockAudioContext(): Promise<void> {
	const ctx = getAudioContext();
	if (ctx && ctx.state === 'suspended') {
		await ctx.resume();
	}
}

/**
 * Sets master volume (0.0 to 1.0).
 */
export function setMasterVolume(volume: number): void {
	if (masterGain && audioCtx) {
		const clamped = Math.max(0, Math.min(1, volume));
		masterGain.gain.setValueAtTime(clamped, audioCtx.currentTime);
	}
}

/**
 * Helper to create a single tone with frequency ramp and gain envelope.
 */
function playTone({
	startFreq,
	endFreq,
	duration,
	type = 'sine',
	peakGain = 0.5
}: {
	startFreq: number;
	endFreq?: number;
	duration: number; // in seconds
	type?: OscillatorType;
	peakGain?: number;
}): void {
	const ctx = getAudioContext();
	if (!ctx || !masterGain) return;

	if (ctx.state === 'suspended') {
		ctx.resume().catch(() => {});
	}

	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.type = type;
	osc.frequency.setValueAtTime(startFreq, now);
	if (endFreq && endFreq !== startFreq) {
		osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
	}

	// Envelope: fast 4ms attack, smooth exponential decay to avoid click pops
	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.linearRampToValueAtTime(peakGain, now + 0.004);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

	osc.connect(gain);
	gain.connect(masterGain);

	osc.start(now);
	osc.stop(now + duration + 0.02);

	osc.onended = () => {
		osc.disconnect();
		gain.disconnect();
	};
}

/**
 * Play Dual Harmonic Chord (used for shields/defensive spells).
 */
function playDualChord(
	freq1: number,
	freq2: number,
	duration: number,
	type: OscillatorType = 'triangle',
	peakGain = 0.35
): void {
	playTone({ startFreq: freq1, duration, type, peakGain });
	playTone({ startFreq: freq2, duration, type, peakGain });
}

// ==========================================
// PROCEDURAL EARCONS PER CATEGORY & SPELL
// ==========================================

/**
 * [Flicker Chime]: High sine sweep (880 Hz -> 1174 Hz, 75 ms).
 * Feeling: Instant swift displacement.
 */
export function playFlickerEarcon(): void {
	playTone({
		startFreq: 880,
		endFreq: 1174,
		duration: 0.075,
		type: 'sine',
		peakGain: 0.55
	});
}

/**
 * [Defense Chime]: Dual harmonic chord (523 Hz + 659 Hz, 90 ms).
 * Feeling: Solid protective barrier (Aegis, Purify, Revitalize).
 */
export function playDefenseEarcon(): void {
	playDualChord(523.25, 659.25, 0.09, 'triangle', 0.4);
}

/**
 * [Retribution Pulse]: Low bass impact (150 Hz -> 70 Hz, 80 ms).
 * Feeling: Heavy jungle strike.
 */
export function playRetriEarcon(): void {
	playTone({
		startFreq: 150,
		endFreq: 70,
		duration: 0.08,
		type: 'triangle',
		peakGain: 0.65
	});
}

/**
 * [Sprint Earcon]: Rapid rising two-tone (659 Hz -> 784 Hz, 65 ms).
 * Feeling: Quick acceleration.
 */
export function playSprintEarcon(): void {
	playTone({
		startFreq: 659.25,
		endFreq: 783.99,
		duration: 0.065,
		type: 'sine',
		peakGain: 0.45
	});
}

/**
 * [Petrify Earcon]: Mid-low thud (220 Hz -> 160 Hz, 75 ms).
 * Feeling: Heavy stone lock.
 */
export function playPetrifyEarcon(): void {
	playTone({
		startFreq: 220,
		endFreq: 160,
		duration: 0.075,
		type: 'sawtooth',
		peakGain: 0.35
	});
}

/**
 * [Offense Earcon]: Sharp bright ping (800 Hz, 60 ms).
 * Feeling: Aggressive execution / shot.
 */
export function playOffenseEarcon(): void {
	playTone({
		startFreq: 800,
		endFreq: 950,
		duration: 0.06,
		type: 'sine',
		peakGain: 0.45
	});
}

/**
 * [COOLDOWN READY ALERT]: Double high-pitch chime (1046 Hz C6 x 2).
 * Distinct alert that enemy spell is active again.
 */
export function playReadyAlert(): void {
	const ctx = getAudioContext();
	if (!ctx) return;

	playTone({ startFreq: 1046.5, duration: 0.05, type: 'sine', peakGain: 0.5 });

	setTimeout(() => {
		playTone({ startFreq: 1046.5, duration: 0.06, type: 'sine', peakGain: 0.55 });
	}, 90);
}

/**
 * [UNDO / CANCEL TONE]: Low error blip (240 Hz -> 140 Hz, 70 ms).
 * Instant confirmation that a misrecorded timer has been cancelled.
 */
export function playUndoEarcon(): void {
	playTone({
		startFreq: 240,
		endFreq: 140,
		duration: 0.07,
		type: 'sawtooth',
		peakGain: 0.4
	});
}

/**
 * Smart Dispatcher: Plays the corresponding procedural earcon for a given battle spell.
 */
export function playSpellEarcon(spell: BattleSpell): void {
	switch (spell.id) {
		case 'flicker':
			playFlickerEarcon();
			break;
		case 'purify':
		case 'aegis':
		case 'revitalize':
			playDefenseEarcon();
			break;
		case 'retribution':
			playRetriEarcon();
			break;
		case 'sprint':
		case 'arrival':
			playSprintEarcon();
			break;
		case 'petrify':
			playPetrifyEarcon();
			break;
		case 'flameshot':
		case 'inspire':
		case 'execute':
		case 'vengeance':
		default:
			playOffenseEarcon();
			break;
	}
}
