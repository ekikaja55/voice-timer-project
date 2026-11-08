import { unlockAudioContext, getAudioContext } from '../audio/earcons.js';
import { debugLogger } from '../utils/debugLogger.svelte.js';
import { goto } from '$app/navigation';

export interface AudioDiagnosticState {
	isSpeechSupported: boolean;
	isFirefox: boolean;
	hasAudioInputHardware: boolean;
	permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown';
	isAudioStreaming: boolean;
	audioLevel: number; // 0 - 100 volume meter
	errorMessage: string | null;
	isModalOpen: boolean;
	micTestStatus: 'IDLE' | 'RECORDING' | 'PLAYING';
	micTestCountdown: number;
}

class AudioChecker {
	state = $state<AudioDiagnosticState>({
		isSpeechSupported: false,
		isFirefox: false,
		hasAudioInputHardware: false,
		permissionStatus: 'unknown',
		isAudioStreaming: false,
		audioLevel: 0,
		errorMessage: null,
		isModalOpen: false,
		micTestStatus: 'IDLE',
		micTestCountdown: 0
	});

	private stream: MediaStream | null = null;
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private animFrameId: number | null = null;
	private testRecorder: MediaRecorder | null = null;
	private testAudioChunks: Blob[] = [];
	private testAudioElement: HTMLAudioElement | null = null;
	private testIntervalId: ReturnType<typeof setInterval> | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.checkSpeechSupport();
			this.checkHardware();
			this.queryPermission();
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
		const isFirefox = typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent);
		this.state.isSpeechSupported = supported;
		this.state.isFirefox = isFirefox;

		if (isFirefox) {
			debugLogger.warn(
				'SPEECH',
				'Browser Firefox terdeteksi. Web Speech API di Firefox adalah eksperimen internal tanpa backend speech-to-text bahasa Indonesia (hanya menghasilkan vokal/dash seperti "--e-", "u-u"). Disarankan menggunakan browser Chromium (Chrome/Edge).'
			);
		}

		debugLogger.info(
			'AUDIO',
			`SpeechRecognition check: ${supported ? 'Tersedia' : 'Tidak didukung'} (Firefox: ${isFirefox})`
		);
		return supported;
	}

	/**
	 * Enumerates audio devices to verify physical microphone presence.
	 */
	async checkHardware(): Promise<boolean> {
		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
			this.state.hasAudioInputHardware = false;
			debugLogger.warn('AUDIO', 'navigator.mediaDevices.enumerateDevices tidak didukung');
			return false;
		}

		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const audioInputs = devices.filter((device) => device.kind === 'audioinput');
			const hasMic = audioInputs.length > 0;
			this.state.hasAudioInputHardware = hasMic;

			debugLogger.info(
				'AUDIO',
				`Deteksi hardware mikrofon: ${hasMic ? 'Ditemukan' : 'Tidak ditemukan'} (${audioInputs.length} perangkat)`,
				{
					devices: audioInputs.map((d) => ({
						label: d.label || 'Default Mic',
						deviceId: d.deviceId
					}))
				}
			);

			return hasMic;
		} catch (err) {
			this.state.hasAudioInputHardware = false;
			debugLogger.warn('AUDIO', 'Gagal enumerateDevices', err);
			return false;
		}
	}

	/**
	 * Queries browser permissions API if available.
	 */
	async queryPermission(): Promise<void> {
		if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

		try {
			const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
			this.state.permissionStatus = status.state as 'prompt' | 'granted' | 'denied';
			debugLogger.info('AUDIO', `Status izin mikrofon: ${status.state}`);

			status.onchange = () => {
				this.state.permissionStatus = status.state as 'prompt' | 'granted' | 'denied';
				debugLogger.info('AUDIO', `Perubahan status izin mikrofon: ${status.state}`);
			};
		} catch {
			// Permission query for microphone is not supported in all browsers (e.g. Safari / Firefox)
			this.state.permissionStatus = 'unknown';
		}
	}

	/**
	 * Requests microphone permission and starts live volume level analysis.
	 */
	async requestAndStartAudioAnalysis(): Promise<boolean> {
		debugLogger.info('AUDIO', 'requestAndStartAudioAnalysis dipanggil');

		if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
			this.state.errorMessage = 'Browser ini tidak mendukung navigator.mediaDevices.getUserMedia';
			this.state.permissionStatus = 'denied';
			debugLogger.error('AUDIO', 'navigator.mediaDevices.getUserMedia tidak tersedia');
			return false;
		}

		try {
			await unlockAudioContext();
			debugLogger.debug('AUDIO', 'Meminta akses getUserMedia audio stream');
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

			debugLogger.info('AUDIO', 'Akses getUserMedia diberikan, menyiapkan AnalyserNode');
			this.setupAudioMeter(stream);
			await this.checkHardware();
			return true;
		} catch (err: unknown) {
			const error = err as { name?: string; message?: string };
			debugLogger.error('AUDIO', `Gagal akses getUserMedia: ${error.name || err}`, error);

			if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
				this.state.permissionStatus = 'denied';
				this.state.errorMessage =
					'Akses mikrofon ditolak oleh browser. Izinkan akses mikrofon di pengaturan browser.';
			} else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
				this.state.hasAudioInputHardware = false;
				this.state.errorMessage = 'Tidak ada perangkat mikrofon yang terhubung pada perangkat ini.';
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
			debugLogger.debug('AUDIO', 'Audio volume analyser loop berjalan');
		} catch (e) {
			debugLogger.error('AUDIO', 'Gagal setup Audio Meter', e);
		}
	}

	/**
	 * Discord-style 3-second Record & Playback Mic Test.
	 * 100% immune to acoustic feedback screeching.
	 */
	async startMicTest(): Promise<void> {
		if (this.state.micTestStatus !== 'IDLE') {
			this.stopMicTest();
			return;
		}

		debugLogger.info('AUDIO', 'Memulai uji coba mikrofon Discord-style (3 detik)');

		if (!this.stream || !this.state.isAudioStreaming) {
			const ready = await this.requestAndStartAudioAnalysis();
			if (!ready || !this.stream) {
				debugLogger.warn('AUDIO', 'Gagal memulai uji mic: stream tidak tersedia');
				return;
			}
		}

		try {
			this.testAudioChunks = [];
			const mimeType =
				typeof MediaRecorder !== 'undefined' &&
				MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
					? 'audio/webm;codecs=opus'
					: '';

			this.testRecorder = mimeType
				? new MediaRecorder(this.stream, { mimeType })
				: new MediaRecorder(this.stream);

			this.testRecorder.ondataavailable = (e) => {
				if (e.data && e.data.size > 0) {
					this.testAudioChunks.push(e.data);
				}
			};

			this.testRecorder.onstop = () => {
				debugLogger.info('AUDIO', 'Perekaman uji mic 3s selesai, memulai playback audio...');
				this.state.micTestStatus = 'PLAYING';
				this.state.micTestCountdown = 0;

				try {
					const blob = new Blob(this.testAudioChunks, {
						type: this.testRecorder?.mimeType || 'audio/webm'
					});
					const audioUrl = URL.createObjectURL(blob);
					const audio = new Audio(audioUrl);
					this.testAudioElement = audio;

					audio.onended = () => {
						debugLogger.info('AUDIO', 'Playback uji mic selesai');
						this.state.micTestStatus = 'IDLE';
						URL.revokeObjectURL(audioUrl);
					};

					audio.onerror = (err) => {
						debugLogger.warn('AUDIO', 'Audio playback error saat uji mic', err);
						this.state.micTestStatus = 'IDLE';
					};

					audio.play().catch((err) => {
						debugLogger.warn('AUDIO', 'Gagal memutar audio uji mic', err);
						this.state.micTestStatus = 'IDLE';
					});

					// Fallback safety timeout in case onended doesn't fire
					setTimeout(() => {
						if (this.state.micTestStatus === 'PLAYING') {
							this.state.micTestStatus = 'IDLE';
						}
					}, 3800);
				} catch (err) {
					debugLogger.error('AUDIO', 'Gagal memproses hasil rekaman uji mic', err);
					this.state.micTestStatus = 'IDLE';
				}
			};

			this.state.micTestStatus = 'RECORDING';
			this.state.micTestCountdown = 3;
			this.testRecorder.start();

			if (this.testIntervalId) clearInterval(this.testIntervalId);
			this.testIntervalId = setInterval(() => {
				if (this.state.micTestCountdown > 1) {
					this.state.micTestCountdown--;
				} else {
					if (this.testIntervalId) clearInterval(this.testIntervalId);
					this.testIntervalId = null;
					if (this.testRecorder && this.testRecorder.state === 'recording') {
						this.testRecorder.stop();
					}
				}
			}, 1000);
		} catch (err) {
			debugLogger.error('AUDIO', 'Gagal memulai MediaRecorder untuk uji mic', err);
			this.state.micTestStatus = 'IDLE';
		}
	}

	stopMicTest(): void {
		if (this.testIntervalId) {
			clearInterval(this.testIntervalId);
			this.testIntervalId = null;
		}
		if (this.testRecorder && this.testRecorder.state === 'recording') {
			try {
				this.testRecorder.stop();
			} catch {
				// ignore
			}
		}
		if (this.testAudioElement) {
			try {
				this.testAudioElement.pause();
				this.testAudioElement.currentTime = 0;
			} catch {
				// ignore
			}
			this.testAudioElement = null;
		}
		this.state.micTestStatus = 'IDLE';
		this.state.micTestCountdown = 0;
	}

	/**
	 * Stops live audio stream analysis.
	 */
	stopAudioAnalysis(): void {
		this.stopMicTest();
		if (this.animFrameId) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
			debugLogger.debug('AUDIO', 'MediaStream tracks dihentikan');
		}
		this.state.isAudioStreaming = false;
		this.state.audioLevel = 0;
	}

	openModal(): void {
		debugLogger.info('AUDIO', 'Navigasi ke halaman /settings');
		this.state.isModalOpen = true;
		if (typeof window !== 'undefined') {
			goto('/settings').catch(() => {});
		}
	}

	closeModal(): void {
		debugLogger.info('AUDIO', 'Menutup Audio Diagnostic');
		this.state.isModalOpen = false;
		this.stopAudioAnalysis();
	}
}

export const audioChecker = new AudioChecker();
