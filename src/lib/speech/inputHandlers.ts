import { speechManager } from './speechManager.svelte.js';
import { timerStore } from '../stores/timerStore.svelte.js';

let isSpaceHeld = false;
let footPedalKey = 'Space'; // Default pedal key (can be mapped)

/**
 * Checks if the target element is an interactive text input to prevent hijacking typing.
 */
export function isInputElement(target: EventTarget | null): boolean {
	if (!target || typeof target !== 'object') return false;
	const el = target as { tagName?: string; isContentEditable?: boolean };
	if (!el.tagName) return false;
	const tag = el.tagName.toLowerCase();
	return tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean(el.isContentEditable);
}

/**
 * Checks whether an event matches Spacebar or Foot Pedal key.
 */
export function isSpaceOrPedal(event: KeyboardEvent): boolean {
	return (
		event.code === 'Space' ||
		event.key === ' ' ||
		event.key === 'Spacebar' ||
		event.keyCode === 32 ||
		event.code === footPedalKey
	);
}

/**
 * Handles global keydown events.
 */
export function handleGlobalKeyDown(event: KeyboardEvent): void {
	if (isInputElement(event.target)) return;

	// 1. Instant Undo: Escape or Backspace
	if (event.code === 'Escape' || event.code === 'Backspace' || event.key === 'Escape') {
		event.preventDefault();
		timerStore.undoLastTimer();
		return;
	}

	// 2. Hold-to-Talk: Spacebar or USB Foot Pedal
	if (isSpaceOrPedal(event)) {
		event.preventDefault();

		// Blur active button element so pressing Space doesn't re-trigger button clicks
		if (
			typeof document !== 'undefined' &&
			document.activeElement &&
			document.activeElement instanceof HTMLElement &&
			document.activeElement.tagName.toLowerCase() === 'button'
		) {
			document.activeElement.blur();
		}

		if (!event.repeat && !isSpaceHeld) {
			isSpaceHeld = true;
			speechManager.startListening();
		}
	}
}

/**
 * Handles global keyup events.
 */
export function handleGlobalKeyUp(event: KeyboardEvent): void {
	if (isInputElement(event.target)) return;

	if (isSpaceOrPedal(event) && isSpaceHeld) {
		event.preventDefault();
		isSpaceHeld = false;
		speechManager.stopListening();
	}
}

/**
 * Handles window blur to release spacebar if focus lost while held.
 */
export function handleWindowBlur(): void {
	if (isSpaceHeld) {
		isSpaceHeld = false;
		speechManager.stopListening();
	}
}

/**
 * Sets custom USB Foot Pedal key code.
 */
export function setFootPedalKey(key: string): void {
	footPedalKey = key;
}

/**
 * Attaches listeners to the window and returns a cleanup teardown function.
 */
export function attachInputListeners(): () => void {
	if (typeof window === 'undefined') return () => {};

	window.addEventListener('keydown', handleGlobalKeyDown);
	window.addEventListener('keyup', handleGlobalKeyUp);
	window.addEventListener('blur', handleWindowBlur);

	return () => {
		window.removeEventListener('keydown', handleGlobalKeyDown);
		window.removeEventListener('keyup', handleGlobalKeyUp);
		window.removeEventListener('blur', handleWindowBlur);
	};
}
