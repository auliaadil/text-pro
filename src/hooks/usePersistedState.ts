import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * A drop-in replacement for useState that persists the value to localStorage.
 * Falls back to standard in-memory state if localStorage is unavailable.
 */
export function usePersistedState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
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
            localStorage.setItem(key, JSON.stringify(state));
        } catch {
            // ignore quota errors
        }
    }, [key, state]);

    return [state, setState];
}
