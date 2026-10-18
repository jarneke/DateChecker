"use client";

import { useEffect, useState } from "react";

import type {
    ControlFilter,
    DateFilterMode,
    SortOption,
} from "@/components/stockchecker/StockFilters";

type StockPreferences = {
    search: string;
    categoryFilter: string;
    controlFilter: ControlFilter;
    sort: SortOption;
    dateFilterMode: DateFilterMode;
    exactDate: string;
    fromDate: string;
    toDate: string;
    page: number;
};

const STORAGE_KEY = "datecheck:stock-preferences:v1";

const DEFAULTS: StockPreferences = {
    search: "",
    categoryFilter: "",
    controlFilter: "all",
    sort: "name_asc",
    dateFilterMode: "exact",
    exactDate: "",
    fromDate: "",
    toDate: "",
    page: 1,
};

const SORT_OPTIONS: SortOption[] = [
    "name_asc",
    "name_desc",
    "expiry_asc",
    "expiry_desc",
    "category_asc",
    "category_desc",
];

function readDate(value: unknown): string {
    return typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value
        : "";
}

function readPreferences(): StockPreferences {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return { ...DEFAULTS };

        const value: unknown = JSON.parse(raw);

        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return { ...DEFAULTS };
        }

        const saved = value as Record<string, unknown>;

        return {
            search: typeof saved.search === "string" ? saved.search : "",
            categoryFilter:
                typeof saved.categoryFilter === "string"
                    ? saved.categoryFilter
                    : "",
            controlFilter:
                saved.controlFilter === "30" || saved.controlFilter === "month"
                    ? saved.controlFilter
                    : "all",
            sort: SORT_OPTIONS.includes(saved.sort as SortOption)
                ? (saved.sort as SortOption)
                : "name_asc",
            dateFilterMode: saved.dateFilterMode === "range" ? "range" : "exact",
            exactDate: readDate(saved.exactDate),
            fromDate: readDate(saved.fromDate),
            toDate: readDate(saved.toDate),
            page:
                typeof saved.page === "number" &&
                    Number.isSafeInteger(saved.page) &&
                    saved.page > 0
                    ? saved.page
                    : 1,
        };
    } catch {
        return { ...DEFAULTS };
    }
}

export function useStockPreferences() {
    const [preferences, setPreferences] = useState<StockPreferences>({
        ...DEFAULTS,
    });
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setPreferences(readPreferences());
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch {
            // De filters blijven werken als browseropslag niet beschikbaar is.
        }
    }, [preferences, ready]);

    function updateFilter<K extends keyof Omit<StockPreferences, "page">>(
        key: K,
        value: StockPreferences[K],
    ) {
        setPreferences((current) => ({
            ...current,
            [key]: value,
            page: 1,
        }));
    }

    return {
        ...preferences,
        ready,
        setSearch: (value: string) => updateFilter("search", value),
        setCategoryFilter: (value: string) =>
            updateFilter("categoryFilter", value),
        setControlFilter: (value: ControlFilter) =>
            updateFilter("controlFilter", value),
        setSort: (value: SortOption) => updateFilter("sort", value),
        setDateFilterMode: (value: DateFilterMode) =>
            updateFilter("dateFilterMode", value),
        setExactDate: (value: string) => updateFilter("exactDate", value),
        setFromDate: (value: string) => updateFilter("fromDate", value),
        setToDate: (value: string) => updateFilter("toDate", value),
        setPage: (value: number) =>
            setPreferences((current) => ({ ...current, page: value })),
        clearFilters: () => setPreferences({ ...DEFAULTS }),
    };
}