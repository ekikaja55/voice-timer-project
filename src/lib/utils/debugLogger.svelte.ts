export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
	id: number;
	timestamp: string; // HH:mm:ss.SSS
	epoch: number;
	level: LogLevel;
	tag: string;
	message: string;
	data?: unknown;
}

export interface SystemSnapshot {
	userAgent: string;
	isMobile: boolean;
	isTouchSupported: boolean;
	maxTouchPoints: number;
	isSecureContext: boolean;
	protocol: string;
	host: string;
	hasSpeechRecognition: boolean;
	speechRecognitionVendor: string;
	hasMediaDevices: boolean;
	hasAudioContext: boolean;
	screenDimensions: string;
}

const MAX_LOG_ENTRIES = 300;

class DebugLogger {
	entries = $state<LogEntry[]>([]);
	isOpen = $state<boolean>(false);
	filterTag = $state<string>('ALL');
	filterLevel = $state<LogLevel | 'ALL'>('ALL');

	private nextId = 1;
	private systemSnapshot: SystemSnapshot | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.captureSystemSnapshot();
			this.attachGlobalAccess();
		}
	}

	/**
	 * Formats current wall-clock time into HH:mm:ss.SSS
	 */
	private formatTime(date: Date): string {
		const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
		return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
	}

	/**
	 * Internal append method with FIFO ring buffer to prevent memory leaks on mobile.
	 */
	private append(level: LogLevel, tag: string, message: string, data?: unknown): LogEntry {
		const now = new Date();
		const entry: LogEntry = {
			id: this.nextId++,
			timestamp: this.formatTime(now),
			epoch: now.getTime(),
			level,
			tag: tag.toUpperCase(),
			message,
			data
		};

		if (this.entries.length >= MAX_LOG_ENTRIES) {
			this.entries.shift();
		}
		this.entries.push(entry);

		// Mirror to browser devtools console with color tags
		this.printToConsole(entry);

		// Mirror to dev server terminal relay
		this.sendToTerminal(entry);

		return entry;
	}

	private sendToTerminal(entry: LogEntry): void {
		if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
			let payloadData = entry.data;
			if (payloadData instanceof Error) {
				payloadData = {
					name: payloadData.name,
					message: payloadData.message,
					stack: payloadData.stack
				};
			}

			fetch('/__client_log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					level: entry.level,
					tag: entry.tag,
					message: entry.message,
					data: payloadData
				})
			}).catch(() => {});
		}
	}

	private printToConsole(entry: LogEntry): void {
		if (typeof console === 'undefined') return;
		const prefix = `[${entry.timestamp}] [${entry.tag}]`;
		const style =
			entry.level === 'ERROR'
				? 'color: #f87171; font-weight: bold;'
				: entry.level === 'WARN'
					? 'color: #fbbf24; font-weight: bold;'
					: entry.level === 'INFO'
						? 'color: #34d399; font-weight: bold;'
						: 'color: #818cf8;';

		const method =
			entry.level === 'ERROR'
				? console.error
				: entry.level === 'WARN'
					? console.warn
					: entry.level === 'INFO'
						? console.info
						: console.log;

		if (entry.data !== undefined) {
			method(`%c${prefix} ${entry.message}`, style, entry.data);
		} else {
			method(`%c${prefix} ${entry.message}`, style);
		}
	}

	debug(tag: string, message: string, data?: unknown): void {
		this.append('DEBUG', tag, message, data);
	}

	info(tag: string, message: string, data?: unknown): void {
		this.append('INFO', tag, message, data);
	}

	warn(tag: string, message: string, data?: unknown): void {
		this.append('WARN', tag, message, data);
	}

	error(tag: string, message: string, data?: unknown): void {
		this.append('ERROR', tag, message, data);
	}

	/**
	 * Specialized logger for mobile Touch/Pointer events to diagnose gesture cancellation.
	 */
	logTouch(
		tag: string,
		action: string,
		event: TouchEvent | PointerEvent | MouseEvent | Event,
		extra?: Record<string, unknown>
	): void {
		const info: Record<string, unknown> = {
			eventType: event.type,
			targetTag: (event.target as HTMLElement)?.tagName || 'unknown',
			targetClass: (event.target as HTMLElement)?.className || '',
			...extra
		};

		if ('touches' in event) {
			const touchEvt = event as TouchEvent;
			info.touchesCount = touchEvt.touches.length;
			info.targetTouchesCount = touchEvt.targetTouches.length;
			if (touchEvt.touches.length > 0) {
				info.clientX = Math.round(touchEvt.touches[0].clientX);
				info.clientY = Math.round(touchEvt.touches[0].clientY);
			}
		} else if ('clientX' in event) {
			const mouseEvt = event as MouseEvent;
			info.clientX = Math.round(mouseEvt.clientX);
			info.clientY = Math.round(mouseEvt.clientY);
		}

		if ('pointerType' in event) {
			const pointerEvt = event as PointerEvent;
			info.pointerType = pointerEvt.pointerType; // 'touch', 'mouse', 'pen'
			info.pointerId = pointerEvt.pointerId;
		}

		this.debug(tag, `${action} (${event.type})`, info);
	}

	clear(): void {
		this.entries = [];
		this.info('LOGGER', 'Log entries cleared by user');
	}

	getLogs(): LogEntry[] {
		return this.entries;
	}

	getSystemSnapshot(): SystemSnapshot {
		if (!this.systemSnapshot) {
			this.captureSystemSnapshot();
		}
		return (
			this.systemSnapshot || {
				userAgent: 'Node/Test Environment',
				isMobile: false,
				isTouchSupported: false,
				maxTouchPoints: 0,
				isSecureContext: true,
				protocol: 'test:',
				host: 'localhost',
				hasSpeechRecognition: false,
				speechRecognitionVendor: 'None (Test)',
				hasMediaDevices: false,
				hasAudioContext: false,
				screenDimensions: '1920x1080'
			}
		);
	}

	openPanel(): void {
		this.isOpen = true;
	}

	closePanel(): void {
		this.isOpen = false;
	}

	togglePanel(): void {
		this.isOpen = !this.isOpen;
	}

	/**
	 * Exports all stored logs as readable formatted plain text.
	 */
	exportAsText(): string {
		const snap = this.getSystemSnapshot();
		const header = [
			'=== MLBB VOICE TIMER - DEBUG LOG DUMP ===',
			`Generated at: ${new Date().toISOString()}`,
			`Device: ${snap.isMobile ? 'Mobile' : 'Desktop'} | Touch: ${snap.isTouchSupported} (${snap.maxTouchPoints} pts)`,
			`Secure Context: ${snap.isSecureContext} | Protocol: ${snap.protocol} | Host: ${snap.host}`,
			`SpeechRecognition: ${snap.hasSpeechRecognition} (${snap.speechRecognitionVendor})`,
			`MediaDevices getUserMedia: ${snap.hasMediaDevices} | AudioContext: ${snap.hasAudioContext}`,
			`User-Agent: ${snap.userAgent}`,
			'=========================================',
			''
		].join('\n');

		const body = this.entries
			.map((e) => {
				const dataStr = e.data !== undefined ? ` | DATA: ${JSON.stringify(e.data)}` : '';
				return `[${e.timestamp}] [${e.level}] [${e.tag}] ${e.message}${dataStr}`;
			})
			.join('\n');

		return `${header}\n${body}`;
	}

	/**
	 * Copies formatted logs to clipboard.
	 */
	async copyToClipboard(): Promise<boolean> {
		if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
			this.warn('LOGGER', 'Clipboard API unavailable in this browser context');
			return false;
		}
		try {
			await navigator.clipboard.writeText(this.exportAsText());
			this.info('LOGGER', 'All debug logs successfully copied to clipboard');
			return true;
		} catch (err) {
			this.error('LOGGER', 'Failed to copy logs to clipboard', err);
			return false;
		}
	}

	/**
	 * Inspects device, touch, network security, and browser speech/audio APIs.
	 */
	private captureSystemSnapshot(): void {
		if (typeof window === 'undefined') {
			this.systemSnapshot = {
				userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Test Environment',
				isMobile: false,
				isTouchSupported: false,
				maxTouchPoints: 0,
				isSecureContext: true,
				protocol: 'test:',
				host: 'localhost',
				hasSpeechRecognition: false,
				speechRecognitionVendor: 'None (Test)',
				hasMediaDevices: false,
				hasAudioContext: false,
				screenDimensions: '1920x1080'
			};
			return;
		}

		const ua = navigator.userAgent || '';
		const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
		const isTouchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const maxTouchPoints = navigator.maxTouchPoints || 0;
		const isSecureContext = Boolean(window.isSecureContext);
		const protocol = window.location.protocol;
		const host = window.location.host;

		// @ts-expect-error webkit prefix fallback
		const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
		const hasSpeechRecognition = Boolean(SpeechClass);
		const speechRecognitionVendor =
			'SpeechRecognition' in window
				? 'Standard SpeechRecognition'
				: 'webkitSpeechRecognition' in window
					? 'webkitSpeechRecognition (Blink/WebKit)'
					: 'None (Unsupported)';

		const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
		// @ts-expect-error webkit prefix fallback
		const hasAudioContext = Boolean(window.AudioContext || window.webkitAudioContext);
		const screenDimensions = `${window.innerWidth}x${window.innerHeight} (dpr: ${window.devicePixelRatio || 1})`;

		this.systemSnapshot = {
			userAgent: ua,
			isMobile,
			isTouchSupported,
			maxTouchPoints,
			isSecureContext,
			protocol,
			host,
			hasSpeechRecognition,
			speechRecognitionVendor,
			hasMediaDevices,
			hasAudioContext,
			screenDimensions
		};

		this.info('SYS', 'System diagnostics initialized', this.systemSnapshot);

		// Critical check for Mobile HTTP vs HTTPS
		if (!isSecureContext && protocol !== 'https:' && host.split(':')[0] !== 'localhost') {
			this.warn(
				'SYS',
				'Aplikasi tidak berjalan di Secure Context (HTTPS/localhost). Pada perangkat mobile, mikrofon & SpeechRecognition DIBLOKIR browser jika diakses via HTTP IP LAN (misal: http://192.168.x.x:5173). Gunakan HTTPS atau port forwarding localhost via ADB.'
			);
		}
	}

	private attachGlobalAccess(): void {
		try {
			// @ts-expect-error global hook for mobile remote inspect
			window.__DEBUG_LOGGER__ = this;
			// @ts-expect-error global hook
			window.__MLBB_LOGS__ = () => this.entries;
		} catch {
			// Ignored
		}
	}
}

export const debugLogger = new DebugLogger();
export const logger = debugLogger;
