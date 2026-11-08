import { debugLogger } from '../utils/debugLogger.svelte.js';

export interface VoiceAnnouncerSettings {
	enabled: boolean;
	volume: number; // 0.0 to 1.0
	rate: number; // 1.0 to 1.5
	pitch: number; // 0.8 to 1.2
	warnAt10Seconds: boolean;
	announceReady: boolean;
	language: 'en' | 'id';
}

class VoiceAnnouncer {
	settings = $state<VoiceAnnouncerSettings>({
		enabled: true,
		volume: 0.85,
		rate: 1.3,
		pitch: 1.05,
		warnAt10Seconds: true,
		announceReady: true,
		language: 'en'
	});

	isSupported = $state<boolean>(false);
	availableVoices = $state<SpeechSynthesisVoice[]>([]);
	selectedVoice = $state<SpeechSynthesisVoice | null>(null);

	private queue: SpeechSynthesisUtterance[] = [];
	private isSpeaking = false;

	constructor() {
		if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
			this.isSupported = true;
			this.initVoices();
		}
	}

	private initVoices(): void {
		if (typeof window === 'undefined' || !window.speechSynthesis) return;

		const loadVoices = () => {
			const voices = window.speechSynthesis.getVoices();
			this.availableVoices = voices;
			this.updateSelectedVoice();
		};

		loadVoices();
		if (window.speechSynthesis.onvoiceschanged !== undefined) {
			window.speechSynthesis.onvoiceschanged = loadVoices;
		}
	}

	updateSelectedVoice(): void {
		const voices = this.availableVoices;
		if (voices.length === 0) return;

		if (this.settings.language === 'en') {
			// Priority: English natural high-clarity voice
			const enVoice =
				voices.find(
					(v) =>
						v.lang.toLowerCase().startsWith('en') &&
						(v.name.toLowerCase().includes('natural') ||
							v.name.toLowerCase().includes('online') ||
							v.name.toLowerCase().includes('david') ||
							v.name.toLowerCase().includes('zira') ||
							v.name.toLowerCase().includes('siri') ||
							v.name.toLowerCase().includes('google'))
				) || voices.find((v) => v.lang.toLowerCase().startsWith('en'));

			this.selectedVoice = enVoice || voices[0] || null;
		} else {
			// Priority: Indonesian native voice (id-ID)
			const idVoice = voices.find(
				(v) =>
					v.lang.toLowerCase().startsWith('id') ||
					v.name.toLowerCase().includes('indonesia') ||
					v.name.toLowerCase().includes('andika') ||
					v.name.toLowerCase().includes('gadis')
			);

			const fallbackVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
			this.selectedVoice = idVoice || fallbackVoice || voices[0] || null;
		}

		debugLogger.info('AUDIO', 'Voice Announcer suara diperbarui', {
			langConfig: this.settings.language,
			selected: this.selectedVoice?.name || 'Default OS Voice',
			voiceLang: this.selectedVoice?.lang || 'unknown'
		});
	}

	setLanguage(lang: 'en' | 'id'): void {
		this.settings.language = lang;
		this.updateSelectedVoice();
	}

	/**
	 * Speaks a tactical military callout with queue safety.
	 */
	speak(text: string): void {
		if (!this.settings.enabled || !this.isSupported || typeof window === 'undefined') {
			return;
		}

		try {
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.volume = this.settings.volume;
			utterance.rate = this.settings.rate;
			utterance.pitch = this.settings.pitch;

			if (this.selectedVoice) {
				utterance.voice = this.selectedVoice;
			}

			utterance.onend = () => {
				this.isSpeaking = false;
				this.processQueue();
			};

			utterance.onerror = (e) => {
				debugLogger.warn('AUDIO', `SpeechSynthesis error: ${e.error}`);
				this.isSpeaking = false;
				this.processQueue();
			};

			this.queue.push(utterance);
			this.processQueue();
		} catch (err) {
			debugLogger.warn('AUDIO', 'Gagal memicu SpeechSynthesisUtterance', err);
		}
	}

	private processQueue(): void {
		if (this.isSpeaking || this.queue.length === 0 || typeof window === 'undefined') {
			return;
		}

		const nextUtterance = this.queue.shift();
		if (nextUtterance) {
			this.isSpeaking = true;
			window.speechSynthesis.speak(nextUtterance);
		}
	}

	/**
	 * Tactical Ganking Window Alert (10s remaining): "[Hero] [Spell] 10 seconds" (EN) / "[Hero] [Spell] sepuluh" (ID)
	 */
	announce10s(heroName: string, spellName: string): void {
		if (!this.settings.warnAt10Seconds) return;
		const suffix = this.settings.language === 'en' ? '10 seconds' : 'sepuluh';
		const callout = `${heroName} ${spellName} ${suffix}`;
		debugLogger.info(
			'AUDIO',
			`Tactical 10s Voice Callout (${this.settings.language}): "${callout}"`
		);
		this.speak(callout);
	}

	/**
	 * Tactical Spell Ready Alert (0s remaining): "[Hero] [Spell] ready"
	 */
	announceReady(heroName: string, spellName: string): void {
		if (!this.settings.announceReady) return;
		const callout = `${heroName} ${spellName} ready`;
		debugLogger.info('AUDIO', `Tactical Ready Voice Callout: "${callout}"`);
		this.speak(callout);
	}

	/**
	 * Clears pending queue and halts active speech immediately.
	 */
	stopAll(): void {
		this.queue = [];
		this.isSpeaking = false;
		if (typeof window !== 'undefined' && window.speechSynthesis) {
			window.speechSynthesis.cancel();
		}
	}
}

export const voiceAnnouncer = new VoiceAnnouncer();
