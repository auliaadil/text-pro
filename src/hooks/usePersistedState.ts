import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * A drop-in replacement for useState that persists the value to localStorage.
 * Falls back to standard in-memory state if localStorage is unavailable or if Session Save is disabled for 'content' fields.
 */
export function usePersistedState<T>(key: string, defaultValue: T, isContent: boolean = false): [T, Dispatch<SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const isSaveEnabled = localStorage.getItem('tp:global:sessionSave') === 'true';
            if (isContent && !isSaveEnabled) {
                return defaultValue;
            }

            const stored = localStorage.getItem(key);
            if (stored !== null) {
                return JSON.parse(stored);
            }
        } catch {
            // ignore parse errors
        }
        return defaultValue;
    });

    useEffect(() => {
        try {
            const isSaveEnabled = localStorage.getItem('tp:global:sessionSave') === 'true';
            if (isContent && !isSaveEnabled) {
                // If saving is disabled and this is content, remove it from storage but keep it in React state
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(state));
            }
        } catch {
            // ignore quota errors
        }
    }, [key, state, isContent]);

    // Listen for custom trigger to clear states if saving gets globally turned off
    useEffect(() => {
        if (!isContent) return;

        const handleClearContent = () => {
            const isSaveEnabled = localStorage.getItem('tp:global:sessionSave') === 'true';
            if (!isSaveEnabled) {
                localStorage.removeItem(key);
                // We do NOT reset the react state, so the user's active session isn't wiped out mid-typing.
                // It just stops syncing to storage.
            }
        };

        window.addEventListener('tp-session-save-changed', handleClearContent);
        return () => window.removeEventListener('tp-session-save-changed', handleClearContent);
    }, [key, isContent]);

    return [state, setState];
}
