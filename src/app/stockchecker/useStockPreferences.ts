"use client";

import { useCallback, useEffect, useState } from "react";
import {
    DEFAULT_STOCK_PREFERENCES,
    parseStockPreferences,
    type StockPreferences,
} from "@/lib/stock-preferences";

const STORAGE_KEY = "datecheck:stock-preferences:v1";

export function useStockPreferences() {
    const [preferences, setPreferences] = useState<StockPreferences>({
        ...DEFAULT_STOCK_PREFERENCES,
    });
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                setPreferences(parseStockPreferences(raw ? JSON.parse(raw) : null));
            } catch {
                setPreferences({ ...DEFAULT_STOCK_PREFERENCES });
            }

            setReady(true);
        });

        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        if (!ready) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch {
            // Filters blijven werken wanneer browseropslag niet beschikbaar is.
        }
    }, [preferences, ready]);

    const updatePreferences = useCallback(
        (changes: Partial<StockPreferences>) => {
            setPreferences((current) => ({ ...current, ...changes, page: 1 }));
        },
        [],
    );

    const setPage = useCallback((page: number) => {
        setPreferences((current) => ({ ...current, page }));
    }, []);

    const clearFilters = useCallback(() => {
        setPreferences({ ...DEFAULT_STOCK_PREFERENCES });
    }, []);

    return {
        preferences,
        ready,
        updatePreferences,
        setPage,
        clearFilters,
    };
}