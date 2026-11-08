import { parseVoiceTranscript, type ParseResult } from '../nlp/index.js';
import { timerStore } from '../stores/timerStore.svelte.js';
import { unlockAudioContext } from '../audio/earcons.js';
import { audioChecker } from './audioChecker.svelte.js';
import { whisperEngine } from './whisperEngine.svelte.js';
import { debugLogger } from '../utils/debugLogger.svelte.js';
import type { SpeechInputMode, SpeechEngineType } from './types.js';

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
	onaudiostart?: (() => void) | null;
	onaudioend?: (() => void) | null;
	onspeechstart?: (() => void) | null;
	onspeechend?: (() => void) | null;
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
	selectedEngine = $state<SpeechEngineType>('NATIVE');

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
			debugLogger.info('SPEECH', 'Inisialisasi SpeechRecognition API browser', {
				vendor: 'SpeechRecognition' in window ? 'Standard' : 'webkitSpeechRecognition'
			});

			try {
				const rec = new SpeechClass() as SpeechRecognitionInstance;
				rec.continuous = true;
				rec.interimResults = true;
				rec.lang = 'id-ID';

				rec.onstart = () => {
					this.isListening = true;
					this.isOverlayOpen = true;
					this.lastError = null;
					debugLogger.info('SPEECH', 'recognition.onstart: Mikrofon aktif mendengarkan');
				};

				rec.onaudiostart = () => {
					debugLogger.debug('SPEECH', 'recognition.onaudiostart: Audio capture hardware connected');
				};

				rec.onspeechstart = () => {
					debugLogger.debug(
						'SPEECH',
						'recognition.onspeechstart: Suara terdeteksi oleh speech engine'
					);
				};

				rec.onspeechend = () => {
					debugLogger.debug('SPEECH', 'recognition.onspeechend: Suara berhenti terdeteksi');
				};

				rec.onaudioend = () => {
					debugLogger.debug('SPEECH', 'recognition.onaudioend: Audio stream capture ended');
				};

				rec.onend = () => {
					this.isListening = false;
					this.interimTranscript = '';
					debugLogger.info('SPEECH', 'recognition.onend: Sesi speech recognition berakhir', {
						shouldBeRunning: this.shouldBeRunning,
						mode: this.mode
					});

					// Auto-restart if in continuous mode and was intended to remain listening
					if (this.shouldBeRunning && this.mode === 'CONTINUOUS') {
						try {
							debugLogger.debug('SPEECH', 'Auto-restart recognition untuk mode CONTINUOUS');
							rec.start();
						} catch (e) {
							debugLogger.warn('SPEECH', 'Auto-restart recognition gagal', e);
						}
					}
				};

				rec.onerror = (e) => {
					debugLogger.error('SPEECH', `recognition.onerror: ${e.error}`, e);

					if (e.error === 'no-speech') {
						return;
					}
					if (e.error === 'not-allowed') {
						this.lastError = 'Izin mikrofon ditolak oleh browser.';
						audioChecker.openModal();
					} else if (e.error === 'network') {
						this.lastError = 'Gagal terhubung ke layanan pengenalan suara (Network timeout).';
					} else if (e.error === 'service-not-allowed') {
						this.lastError =
							'Layanan speech recognition browser tidak diizinkan atau dinonaktifkan di sistem.';
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
					debugLogger.debug('SPEECH', 'recognition.onresult', {
						interim,
						final: finalTranscript.trim()
					});

					if (finalTranscript.trim()) {
						this.processTranscript(finalTranscript.trim());
					}
				};

				this.recognition = rec;
			} catch (err) {
				this.lastError = `Inisialisasi speech recognition gagal: ${err}`;
				debugLogger.error('SPEECH', 'Gagal membuat instance SpeechRecognition', err);
			}
		} else {
			this.isSupported = false;
			debugLogger.warn('SPEECH', 'SpeechRecognition API tidak didukung di browser ini');
		}
	}

	/**
	 * Processes recognized or simulated speech transcript through the NLP Engine.
	 */
	processTranscript(text: string): ParseResult {
		this.lastTranscript = text;

		// Detect Firefox dummy phonemes / dashes (e.g. "--e-", "-e-", "u-u", "-------")
		const isGarbage = /^[-_\s.euo]+$/i.test(text.trim()) && text.trim().length <= 8;
		if (isGarbage) {
			debugLogger.warn(
				'SPEECH',
				`Transkrip "${text}" terdeteksi sebagai artefak dummy Firefox. Diabaikan dari pencocokan timer.`
			);
			const emptyResult: ParseResult = {
				rawTranscript: text,
				cleanedTokens: [],
				pairs: [],
				isUndo: false,
				isReset: false,
				unmatchedSpells: []
			};
			this.lastParsedResult = emptyResult;
			return emptyResult;
		}

		const result = parseVoiceTranscript(text);
		this.lastParsedResult = result;

		debugLogger.info('NLP', `Memproses transkrip: "${text}"`, {
			pairs: result.pairs.map((p) => `${p.heroName} -> ${p.spell.name} (PYT:${p.hasPyt})`),
			isUndo: result.isUndo,
			isReset: result.isReset
		});

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
	 * Sets the active speech recognition engine ('NATIVE' or 'WHISPER').
	 */
	setEngine(engine: SpeechEngineType): void {
		this.selectedEngine = engine;
		debugLogger.info('SPEECH', `Speech engine diubah ke: ${engine}`);

		if (engine === 'WHISPER' && whisperEngine.isCachedLocally && !whisperEngine.isLoaded) {
			debugLogger.info('SPEECH', 'Model Whisper di cache lokal terdeteksi, memuat otomatis...');
			whisperEngine.loadModel().catch((e) => {
				debugLogger.warn('SPEECH', 'Gagal memuat otomatis model Whisper dari cache', e);
			});
		}
	}

	/**
	 * Starts microphone recording and opens the Shazam visualizer overlay.
	 */
	startListening(source: string = 'manual'): void {
		debugLogger.info(
			'SPEECH',
			`startListening dipanggil (sumber: ${source}, engine: ${this.selectedEngine})`,
			{
				currentIsListening: this.isListening,
				isSupported: this.isSupported,
				engine: this.selectedEngine
			}
		);

		unlockAudioContext().catch((e) => {
			debugLogger.warn('AUDIO', 'unlockAudioContext gagal', e);
		});

		this.shouldBeRunning = true;
		this.isListening = true;
		this.isOverlayOpen = true;
		this.lastParsedResult = null;
		this.interimTranscript = '';

		// Connect audio meter for live visualizer
		audioChecker.requestAndStartAudioAnalysis().catch((err) => {
			debugLogger.warn('AUDIO', 'requestAndStartAudioAnalysis error', err);
		});

		// 1. Whisper AI Offline Engine Branch
		if (this.selectedEngine === 'WHISPER') {
			if (!whisperEngine.isLoaded) {
				debugLogger.warn('SPEECH', 'Model Whisper belum dimuat, mengarahkan ke /settings');
				audioChecker.openModal();
				return;
			}
			whisperEngine.startRecording().catch((err) => {
				debugLogger.error('SPEECH', 'whisperEngine.startRecording error', err);
			});
			return;
		}

		// 2. Native Web Speech API Branch
		if (!this.isSupported) {
			debugLogger.warn('SPEECH', 'SpeechRecognition tidak didukung, mengarahkan ke /settings');
			audioChecker.openModal();
			return;
		}

		if (this.recognition) {
			try {
				this.recognition.start();
				debugLogger.debug('SPEECH', 'recognition.start() berhasil dipanggil');
			} catch (err: unknown) {
				const error = err as { name?: string; message?: string };
				// In mobile Chrome or after rapid toggle, already started is common
				if (error.name === 'InvalidStateError') {
					debugLogger.debug('SPEECH', 'recognition sudah dalam status aktif (InvalidStateError)');
				} else {
					debugLogger.warn('SPEECH', `Eksepsi saat recognition.start(): ${error.name || err}`);
				}
			}
		}
	}

	/**
	 * Stops microphone recording cleanly and schedules overlay auto-close if action processed.
	 */
	stopListening(source: string = 'manual'): void {
		debugLogger.info(
			'SPEECH',
			`stopListening dipanggil (sumber: ${source}, engine: ${this.selectedEngine})`,
			{
				currentIsListening: this.isListening,
				hasInterim: Boolean(this.interimTranscript.trim()),
				engine: this.selectedEngine
			}
		);

		this.shouldBeRunning = false;
		this.isListening = false;
		audioChecker.stopAudioAnalysis();

		// 1. Whisper AI Offline Engine Branch
		if (this.selectedEngine === 'WHISPER') {
			if (whisperEngine.isLoaded) {
				whisperEngine.stopRecordingAndTranscribe().then((text) => {
					if (text) {
						this.processTranscript(text);
						this.scheduleOverlayAutoClose();
					}
				});
			}
			return;
		}

		// 2. Native Web Speech API Branch
		if (this.recognition) {
			try {
				this.recognition.stop();
				debugLogger.debug('SPEECH', 'recognition.stop() berhasil dipanggil');
			} catch (err) {
				debugLogger.debug('SPEECH', 'recognition.stop() dilewati (mungkin sudah berhenti)', err);
			}
		}

		// If interim transcript accumulated before stopping, process it
		if (this.interimTranscript.trim()) {
			debugLogger.info(
				'SPEECH',
				`Memproses sisa transkrip interim saat berhenti: "${this.interimTranscript.trim()}"`
			);
			this.processTranscript(this.interimTranscript.trim());
			this.interimTranscript = '';
		}

		this.scheduleOverlayAutoClose();
	}

	private scheduleOverlayAutoClose(): void {
		// Auto-close overlay after 1.3 seconds if an action was recognized
		if (
			this.lastParsedResult &&
			(this.lastParsedResult.pairs.length > 0 ||
				this.lastParsedResult.isUndo ||
				this.lastParsedResult.isReset)
		) {
			setTimeout(() => {
				if (!this.isListening) {
					this.isOverlayOpen = false;
					debugLogger.debug('OVERLAY', 'Overlay otomatis ditutup setelah aksi diproses');
				}
			}, 1300);
		}
	}

	/**
	 * Toggles microphone recording state.
	 */
	toggleListening(source: string = 'toggle'): void {
		debugLogger.info('SPEECH', `toggleListening dipanggil (sumber: ${source})`, {
			targetState: !this.isListening
		});
		if (this.isListening) {
			this.stopListening(source);
		} else {
			this.startListening(source);
		}
	}

	/**
	 * Opens overlay without starting mic immediately (e.g. for preview / manual tap).
	 */
	openOverlay(source: string = 'manual'): void {
		debugLogger.info('OVERLAY', `openOverlay dipanggil (sumber: ${source})`);
		this.isOverlayOpen = true;
	}

	/**
	 * Closes the voice overlay manually.
	 */
	closeOverlay(source: string = 'manual'): void {
		debugLogger.info('OVERLAY', `closeOverlay dipanggil (sumber: ${source})`);
		this.isOverlayOpen = false;
		if (this.isListening) {
			this.stopListening(source);
		}
	}

	/**
	 * Allows simulating incoming speech transcript without microphone (for testing / manual HUD input).
	 */
	simulateTranscript(phrase: string): ParseResult {
		debugLogger.info('SPEECH', `simulateTranscript: "${phrase}"`);
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
