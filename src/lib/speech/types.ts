export type SpeechInputMode = 'HOLD_TO_TALK' | 'TOGGLE' | 'CONTINUOUS';

export type SpeechEngineType = 'NATIVE' | 'WHISPER';

export interface SpeechState {
	isListening: boolean;
	isSupported: boolean;
	lastTranscript: string;
	interimTranscript: string;
	lastError: string | null;
	mode: SpeechInputMode;
	selectedEngine: SpeechEngineType;
}
