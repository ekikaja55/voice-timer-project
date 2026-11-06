import { parseVoiceTranscript, type ParseResult } from '../nlp/index.js';
import { timerStore } from '../stores/timerStore.svelte.js';
import { unlockAudioContext } from '../audio/earcons.js';
import { audioChecker } from './audioChecker.svelte.js';
import type { SpeechInputMode } from './types.js';

interface WebkitSpeechRecognitionEvent {
	results: {
		[index: number]: {
			[index: number]: {
				transcript: string;
				confidence: number;
			};
			isFinal?: boolean;
		};
		length: number;
	};
}

interface WebkitSpeechRecognitionErrorEvent {
	error: string;
	message?: string;
}

interface SpeechRecognitionInstance {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start: () => void;
	stop: () => void;
	abort: () => void;
	onstart: (() => void) | null;
	onend: (() => void) | null;
	onresult: ((event: WebkitSpeechRecognitionEvent) => void) | null;
	onerror: ((event: WebkitSpeechRecognitionErrorEvent) => void) | null;
}

class SpeechManager {
	isListening = $state<boolean>(false);
	isOverlayOpen = $state<boolean>(false);
	isSupported = $state<boolean>(false);
	lastTranscript = $state<string>('');
	interimTranscript = $state<string>('');
	lastError = $state<string | null>(null);
	lastParsedResult = $state<ParseResult | null>(null);
	mode = $state<SpeechInputMode>('HOLD_TO_TALK');

	private recognition: SpeechRecognitionInstance | null = null;
	private shouldBeRunning = false;

	constructor() {
		this.initRecognition();
	}

	private initRecognition(): void {
		if (typeof window === 'undefined') return;

		const SpeechClass =
			// @ts-expect-error webkit prefix fallback
			window.SpeechRecognition || window.webkitSpeechRecognition;

		if (SpeechClass) {
			this.isSupported = true;
			try {
				const rec = new SpeechClass() as SpeechRecognitionInstance;
				rec.continuous = true;
				rec.interimResults = true;
				rec.lang = 'id-ID';

				rec.onstart = () => {
					this.isListening = true;
					this.isOverlayOpen = true;
					this.lastError = null;
				};

				rec.onend = () => {
					this.isListening = false;
					this.interimTranscript = '';

					// Auto-restart if in continuous mode and was intended to remain listening
					if (this.shouldBeRunning && this.mode === 'CONTINUOUS') {
						try {
							rec.start();
						} catch {
							// Ignored if already started
						}
					}
				};

				rec.onerror = (e) => {
					if (e.error === 'no-speech') {
						return;
					}
					if (e.error === 'not-allowed') {
						this.lastError = 'Izin mikrofon ditolak oleh browser.';
						audioChecker.openModal();
					} else if (e.error === 'network') {
						this.lastError = 'Gagal terhubung ke layanan pengenalan suara (Network timeout).';
					} else {
						this.lastError = `Speech error: ${e.error}`;
					}
					this.isListening = false;
				};

				rec.onresult = (event) => {
					let finalTranscript = '';
					let interim = '';

					for (let i = 0; i < event.results.length; i++) {
						const res = event.results[i];
						if (res.isFinal) {
							finalTranscript += res[0].transcript + ' ';
						} else {
							interim += res[0].transcript;
						}
					}

					this.interimTranscript = interim;

					if (finalTranscript.trim()) {
						this.processTranscript(finalTranscript.trim());
					}
				};

				this.recognition = rec;
			} catch (err) {
				this.lastError = `Inisialisasi speech recognition gagal: ${err}`;
			}
		} else {
			this.isSupported = false;
		}
	}

	/**
	 * Processes recognized or simulated speech transcript through the NLP Engine.
	 */
	processTranscript(text: string): ParseResult {
		this.lastTranscript = text;
		const result = parseVoiceTranscript(text);
		this.lastParsedResult = result;

		// 1. Instant Undo Command ("batal", "cancel")
		if (result.isUndo) {
			timerStore.undoLastTimer();
			return result;
		}

		// 2. Reset All Command ("reset", "ulang")
		if (result.isReset) {
			timerStore.resetAll();
			return result;
		}

		// 3. Dispatch Extracted Pairs
		if (result.pairs.length > 0) {
			timerStore.dispatchVoicePairs(result.pairs);
		}

		return result;
	}

	/**
	 * Starts microphone recording and opens the Shazam visualizer overlay.
	 */
	startListening(): void {
		unlockAudioContext().catch(() => {});
		this.shouldBeRunning = true;
		this.isListening = true;
		this.isOverlayOpen = true;
		this.lastParsedResult = null;
		this.interimTranscript = '';

		// Connect audio meter for live visualizer
		audioChecker.requestAndStartAudioAnalysis().catch(() => {});

		if (!this.isSupported) {
			// Trigger diagnostic modal if browser does not support SpeechRecognition
			audioChecker.openModal();
			return;
		}

		if (this.recognition) {
			try {
				this.recognition.start();
			} catch {
				// Handled by browser if already running
			}
		}
	}

	/**
	 * Stops microphone recording cleanly and schedules overlay auto-close if action processed.
	 */
	stopListening(): void {
		this.shouldBeRunning = false;
		this.isListening = false;
		audioChecker.stopAudioAnalysis();

		if (this.recognition) {
			try {
				this.recognition.stop();
			} catch {
				// Handled by browser
			}
		}

		// If interim transcript accumulated before stopping, process it
		if (this.interimTranscript.trim()) {
			this.processTranscript(this.interimTranscript.trim());
			this.interimTranscript = '';
		}

		// Auto-close overlay after 1.5 seconds if an action was recognized
		if (
			this.lastParsedResult &&
			(this.lastParsedResult.pairs.length > 0 ||
				this.lastParsedResult.isUndo ||
				this.lastParsedResult.isReset)
		) {
			setTimeout(() => {
				if (!this.isListening) {
					this.isOverlayOpen = false;
				}
			}, 1300);
		}
	}

	/**
	 * Toggles microphone recording state.
	 */
	toggleListening(): void {
		if (this.isListening) {
			this.stopListening();
		} else {
			this.startListening();
		}
	}

	/**
	 * Closes the voice overlay manually.
	 */
	closeOverlay(): void {
		this.isOverlayOpen = false;
		if (this.isListening) {
			this.stopListening();
		}
	}

	/**
	 * Allows simulating incoming speech transcript without microphone (for testing / manual HUD input).
	 */
	simulateTranscript(phrase: string): ParseResult {
		unlockAudioContext().catch(() => {});
		this.isOverlayOpen = true;
		this.lastTranscript = phrase;
		const res = this.processTranscript(phrase);

		setTimeout(() => {
			if (!this.isListening) {
				this.isOverlayOpen = false;
			}
		}, 1400);

		return res;
	}
}

export const speechManager = new SpeechManager();
