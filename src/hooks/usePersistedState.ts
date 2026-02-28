import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * A drop-in replacement for useState that persists the value.
 * Configs persist to localStorage always.
 * Content persists to localStorage if 'Save Session' is enabled.
 * If 'Save Session' is disabled, content persists only to sessionStorage (lives until tab is closed)
 * so that users don't lose data when switching tools within the same session.
 */
export function usePersistedState<T>(key: string, defaultValue: T, isContent: boolean = false): [T, Dispatch<SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const isSaveEnabled = localStorage.getItem('tp:global:sessionSave') === 'true';

            if (isContent) {
                // If global save is enabled, try loading from localStorage first
                if (isSaveEnabled) {
                    const localStored = localStorage.getItem(key);
                    if (localStored !== null) return JSON.parse(localStored);
                }
                // Then try sessionStorage (used when Save Session is off, or as a fallback)
                const sessionStored = sessionStorage.getItem(key);
                if (sessionStored !== null) return JSON.parse(sessionStored);
            } else {
                // Core configurations always load from localStorage
                const stored = localStorage.getItem(key);
                if (stored !== null) return JSON.parse(stored);
            }
        } catch {
            // ignore parse errors
        }
        return defaultValue;
    });

    useEffect(() => {
        try {
            if (isContent) {
                const isSaveEnabled = localStorage.getItem('tp:global:sessionSave') === 'true';

                // ALWAYS save content to sessionStorage to prevent loss across tool-switches in same tab
                sessionStorage.setItem(key, JSON.stringify(state));

                if (isSaveEnabled) {
                    localStorage.setItem(key, JSON.stringify(state));
                } else {
                    localStorage.removeItem(key);
                }
            } else {
                // Non-content always saves to localStorage
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
                // Remove from permanent storage
                localStorage.removeItem(key);
                // We keep it in sessionStorage so they don't lose current work if they switch tools right after disabling
            } else {
                // If they turned it ON, immediately sync current state to localStorage
                localStorage.setItem(key, JSON.stringify(state));
            }
        };

        window.addEventListener('tp-session-save-changed', handleClearContent);
        return () => window.removeEventListener('tp-session-save-changed', handleClearContent);
    }, [key, isContent, state]);

    return [state, setState];
}
