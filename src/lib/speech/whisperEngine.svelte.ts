/**
 * Whisper-Tiny ONNX Speech Recognition Engine (Transformers.js)
 * High-portability offline speech recognition fallback for browsers without native Web Speech API (Firefox, Linux, etc.)
 * Models are downloaded on-demand from Hugging Face Hub and cached locally in browser IndexedDB.
 */

import { debugLogger } from '../utils/debugLogger.svelte.js';
import { inspectHardware } from '../benchmark/deviceBenchmark.svelte.js';

export type WhisperEngineStatus =
	'IDLE' | 'DOWNLOADING' | 'READY' | 'RECORDING' | 'TRANSCRIBING' | 'ERROR';

export interface WhisperProgressEvent {
	status: string;
	file?: string;
	progress?: number;
	loaded?: number;
	total?: number;
}

// Minimal type signature for the Transformers pipeline output
interface WhisperPipelineOutput {
	text: string;
}

type WhisperPipelineFunction = (
	input: Float32Array,
	options?: {
		language?: string;
		task?: string;
		chunk_length_s?: number;
		stride_length_s?: number;
	}
) => Promise<WhisperPipelineOutput | WhisperPipelineOutput[]>;

class WhisperEngine {
	status = $state<WhisperEngineStatus>('IDLE');
	downloadProgress = $state<number>(0);
	downloadMessage = $state<string>('');
	isLoaded = $state<boolean>(false);
	isCachedLocally = $state<boolean>(false);
	lastInferenceTimeMs = $state<number>(0);
	lastError = $state<string | null>(null);

	private pipelineInstance: WhisperPipelineFunction | null = null;
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private mediaStream: MediaStream | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.checkCachedModel().catch(() => {});
		}
	}

	/**
	 * Checks browser Cache API and localStorage to detect if whisper-tiny is already cached locally.
	 */
	async checkCachedModel(): Promise<boolean> {
		if (typeof window === 'undefined') return false;

		try {
			const hasFlag = localStorage.getItem('whisper_model_cached') === 'true';
			let hasCacheStorage = false;

			if ('caches' in window) {
				const cacheKeys = await window.caches.keys();
				for (const key of cacheKeys) {
					if (key.includes('transformers') || key.includes('huggingface')) {
						const cache = await window.caches.open(key);
						const requests = await cache.keys();
						const hasModel = requests.some(
							(req) => req.url.includes('whisper-tiny') && req.url.includes('.onnx')
						);
						if (hasModel) {
							hasCacheStorage = true;
							break;
						}
					}
				}
			}

			if (hasFlag && hasCacheStorage) {
				this.isCachedLocally = true;
				debugLogger.info(
					'SPEECH',
					'Model Whisper-Tiny terdeteksi telah tersimpan lengkap di cache browser'
				);
				return true;
			} else {
				this.isCachedLocally = false;
				localStorage.removeItem('whisper_model_cached');
			}
		} catch (e) {
			debugLogger.debug('SPEECH', 'Pengecekan cache model dilewati', e);
		}

		return false;
	}

	/**
	 * Downloads and initializes the ONNX whisper-tiny model on demand.
	 */
	async loadModel(): Promise<boolean> {
		if (this.isLoaded && this.pipelineInstance) {
			return true;
		}

		// Prevent duplicate/parallel click triggers
		if (this.status === 'DOWNLOADING') {
			debugLogger.warn('SPEECH', 'Proses unduh Whisper sedang berjalan, abaikan klik ganda');
			return false;
		}

		if (typeof window === 'undefined') {
			return false;
		}

		this.status = 'DOWNLOADING';
		this.downloadProgress = 0;
		this.downloadMessage = 'Menyiapkan Whisper-Tiny ONNX pipeline...';
		this.lastError = null;

		try {
			debugLogger.info('SPEECH', 'Memulai pengunduhan on-demand Whisper-Tiny ONNX');
			const { pipeline, env } = await import('@huggingface/transformers');

			// Configure Transformers.js for web execution
			env.allowLocalModels = false;
			env.useBrowserCache = true;

			const hardware = inspectHardware();
			let device: 'webgpu' | 'wasm' = hardware.hasWebGPU ? 'webgpu' : 'wasm';

			const createPipeline = async (targetDev: 'webgpu' | 'wasm') => {
				debugLogger.info('SPEECH', `Inisialisasi Whisper pipeline (target device: ${targetDev})`);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return (await (pipeline as any)(
					'automatic-speech-recognition',
					'onnx-community/whisper-tiny',
					{
						dtype: targetDev === 'webgpu' ? 'fp32' : 'q8',
						device: targetDev,
						progress_callback: (progress: WhisperProgressEvent) => {
							if (progress.status === 'progress' && progress.total && progress.loaded) {
								const pct = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
								this.downloadProgress = pct;
								const loadedMb = (progress.loaded / (1024 * 1024)).toFixed(1);
								const totalMb = (progress.total / (1024 * 1024)).toFixed(1);
								this.downloadMessage = `Mengunduh model AI: ${pct}% (${loadedMb}MB / ${totalMb}MB)`;
							} else if (progress.status === 'done') {
								this.downloadProgress = 100;
								this.downloadMessage = 'Model selesai dimuat dan tersimpan di cache lokal!';
							} else if (progress.status === 'initiate') {
								this.downloadMessage = `Menginisialisasi ${progress.file || 'model'}...`;
							}
						}
					}
				)) as WhisperPipelineFunction;
			};

			let transcriber: WhisperPipelineFunction;
			try {
				transcriber = await createPipeline(device);
			} catch (gpuError) {
				if (device === 'webgpu') {
					debugLogger.warn(
						'SPEECH',
						'Inisialisasi WebGPU gagal, mencoba otomatis fallback ke WASM...',
						gpuError
					);
					this.downloadMessage = 'WebGPU tidak kompatibel, beralih ke WASM engine...';
					device = 'wasm';
					transcriber = await createPipeline('wasm');
				} else {
					throw gpuError;
				}
			}

			this.pipelineInstance = transcriber;
			this.isLoaded = true;
			this.isCachedLocally = true;
			try {
				localStorage.setItem('whisper_model_cached', 'true');
			} catch {
				// ignore quota / private mode storage error
			}
			this.status = 'READY';
			this.downloadProgress = 100;
			this.downloadMessage = 'Whisper AI Offline Siap Digunakan.';

			debugLogger.info('SPEECH', 'Whisper-Tiny pipeline berhasil dimuat');
			return true;
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.status = 'ERROR';
			this.lastError = errorMsg;
			this.downloadMessage = `Gagal mengunduh Whisper AI: ${errorMsg}`;
			debugLogger.error('SPEECH', 'Gagal inisialisasi Whisper pipeline', err);
			return false;
		}
	}

	/**
	 * Starts recording raw audio via MediaRecorder for Whisper transcription.
	 */
	async startRecording(stream?: MediaStream): Promise<boolean> {
		if (typeof window === 'undefined') return false;

		if (!this.isLoaded || !this.pipelineInstance) {
			this.lastError = 'Model Whisper AI belum dimuat. Unduh model terlebih dahulu.';
			return false;
		}

		try {
			if (!stream) {
				this.mediaStream = await navigator.mediaDevices.getUserMedia({
					audio: {
						channelCount: 1,
						sampleRate: 16000,
						echoCancellation: true,
						noiseSuppression: true
					}
				});
			} else {
				this.mediaStream = stream;
			}

			this.audioChunks = [];
			const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
				? 'audio/webm;codecs=opus'
				: MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
					? 'audio/ogg;codecs=opus'
					: '';

			this.mediaRecorder = mimeType
				? new MediaRecorder(this.mediaStream, { mimeType })
				: new MediaRecorder(this.mediaStream);

			this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
				if (event.data && event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			};

			this.mediaRecorder.start(100);
			this.status = 'RECORDING';
			debugLogger.info('SPEECH', 'Whisper engine mulai merekam audio');
			return true;
		} catch (err) {
			this.status = 'ERROR';
			this.lastError = `Gagal memulai perekaman audio: ${err}`;
			debugLogger.error('SPEECH', 'startRecording gagal', err);
			return false;
		}
	}

	/**
	 * Stops audio recording and runs Whisper inference.
	 * Returns transcribed text in Indonesian.
	 */
	async stopRecordingAndTranscribe(): Promise<string> {
		if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
			this.status = this.isLoaded ? 'READY' : 'IDLE';
			return '';
		}

		return new Promise<string>((resolve) => {
			if (!this.mediaRecorder) {
				resolve('');
				return;
			}

			this.mediaRecorder.onstop = async () => {
				this.status = 'TRANSCRIBING';
				debugLogger.info('SPEECH', 'Whisper perekaman selesai, memproses inferensi AI...');

				try {
					if (this.audioChunks.length === 0) {
						this.status = 'READY';
						resolve('');
						return;
					}

					const audioBlob = new Blob(this.audioChunks, {
						type: this.mediaRecorder?.mimeType || 'audio/webm'
					});

					const arrayBuffer = await audioBlob.arrayBuffer();
					const AudioCtx =
						window.AudioContext ||
						(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
					const audioContext = new AudioCtx({ sampleRate: 16000 });
					const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

					// Extract 16kHz mono Float32Array channel
					const channelData = audioBuffer.getChannelData(0);

					const startTime = performance.now();
					if (!this.pipelineInstance) {
						throw new Error('Pipeline instance tidak tersedia');
					}

					const output = await this.pipelineInstance(channelData, {
						language: 'indonesian',
						task: 'transcribe'
					});

					this.lastInferenceTimeMs = Math.round(performance.now() - startTime);

					let text = '';
					if (Array.isArray(output)) {
						text = output.map((o) => o.text).join(' ');
					} else if (output && typeof output === 'object') {
						text = output.text || '';
					}

					const cleanText = text.trim();
					debugLogger.info(
						'SPEECH',
						`Whisper inferensi selesai dalam ${this.lastInferenceTimeMs}ms: "${cleanText}"`
					);

					this.status = 'READY';
					resolve(cleanText);
				} catch (err) {
					this.status = 'ERROR';
					this.lastError = `Inferensi Whisper gagal: ${err}`;
					debugLogger.error('SPEECH', 'stopRecordingAndTranscribe gagal', err);
					this.status = 'READY';
					resolve('');
				}
			};

			this.mediaRecorder.stop();
		});
	}

	/**
	 * Aborts active recording or transcription.
	 */
	abort(): void {
		if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
			try {
				this.mediaRecorder.stop();
			} catch {
				// ignore
			}
		}
		this.audioChunks = [];
		this.status = this.isLoaded ? 'READY' : 'IDLE';
	}
}

export const whisperEngine = new WhisperEngine();
