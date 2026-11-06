import { unlockAudioContext, getAudioContext } from '../audio/earcons.js';

export interface AudioDiagnosticState {
	isSpeechSupported: boolean;
	hasAudioInputHardware: boolean;
	permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
	isAudioStreaming: boolean;
	audioLevel: number; // 0 - 100 volume meter
	errorMessage: string | null;
	isModalOpen: boolean;
}

class AudioChecker {
	state = $state<AudioDiagnosticState>({
		isSpeechSupported: false,
		hasAudioInputHardware: false,
		permissionStatus: 'unknown',
		isAudioStreaming: false,
		audioLevel: 0,
		errorMessage: null,
		isModalOpen: false
	});

	private stream: MediaStream | null = null;
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private animFrameId: number | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.checkSpeechSupport();
			this.checkHardware();
		}
	}

	/**
	 * Checks if Web Speech API is supported natively in the current browser.
	 */
	checkSpeechSupport(): boolean {
		if (typeof window === 'undefined') return false;
		// @ts-expect-error webkit prefix fallback
		const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
		const supported = Boolean(SpeechClass);
		this.state.isSpeechSupported = supported;
		return supported;
	}

	/**
	 * Enumerates audio devices to verify physical microphone presence.
	 */
	async checkHardware(): Promise<boolean> {
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
			this.state.hasAudioInputHardware = false;
			return false;
		}

		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const hasMic = devices.some((device) => device.kind === 'audioinput');
			this.state.hasAudioInputHardware = hasMic;
			return hasMic;
		} catch {
			this.state.hasAudioInputHardware = false;
			return false;
		}
	}

	/**
	 * Requests microphone permission and starts live volume level analysis.
	 */
	async requestAndStartAudioAnalysis(): Promise<boolean> {
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			this.state.errorMessage = 'Browser ini tidak mendukung navigator.mediaDevices.getUserMedia';
			this.state.permissionStatus = 'denied';
			return false;
		}

		try {
			await unlockAudioContext();
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			});

			this.stream = stream;
			this.state.permissionStatus = 'granted';
			this.state.isAudioStreaming = true;
			this.state.errorMessage = null;

			this.setupAudioMeter(stream);
			await this.checkHardware();
			return true;
		} catch (err: unknown) {
			const error = err as { name?: string; message?: string };
			if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
				this.state.permissionStatus = 'denied';
				this.state.errorMessage =
					'Akses mikrofon ditolak oleh browser. Izinkan akses mikrofon di pengaturan browser.';
			} else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
				this.state.hasAudioInputHardware = false;
				this.state.errorMessage =
					'Tidak ada perangkat mikrofon yang terhubung pada laptop/komputer ini.';
			} else {
				this.state.errorMessage = `Gagal mengakses mikrofon: ${error.message || error.name}`;
			}
			this.state.isAudioStreaming = false;
			return false;
		}
	}

	/**
	 * Connects AnalyserNode to calculate real-time volume level (0 - 100).
	 */
	private setupAudioMeter(stream: MediaStream): void {
		try {
			const ctx = getAudioContext() || new AudioContext();
			this.audioContext = ctx;

			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = 256;
			analyser.smoothingTimeConstant = 0.5;
			source.connect(analyser);
			this.analyser = analyser;

			const bufferLength = analyser.frequencyBinCount;
			const dataArray = new Uint8Array(bufferLength);

			const updateLevel = () => {
				if (!this.analyser || !this.state.isAudioStreaming) return;

				this.analyser.getByteFrequencyData(dataArray);
				let sum = 0;
				for (let i = 0; i < bufferLength; i++) {
					sum += dataArray[i];
				}
				const average = sum / bufferLength;
				// Normalize to 0 - 100
				this.state.audioLevel = Math.min(100, Math.round((average / 128) * 100));

				this.animFrameId = requestAnimationFrame(updateLevel);
			};

			updateLevel();
		} catch (e) {
			console.error('Audio meter setup failed', e);
		}
	}

	/**
	 * Stops live audio stream analysis.
	 */
	stopAudioAnalysis(): void {
		if (this.animFrameId) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}
		this.state.isAudioStreaming = false;
		this.state.audioLevel = 0;
	}

	openModal(): void {
		this.state.isModalOpen = true;
		this.requestAndStartAudioAnalysis().catch(() => {});
	}

	closeModal(): void {
		this.state.isModalOpen = false;
		this.stopAudioAnalysis();
	}
}

export const audioChecker = new AudioChecker();
