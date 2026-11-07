export const CONTROL_OPTIONS = [
    { value: "all", label: "Alle soorten" },
    { value: "30", label: "30% · Dagelijks" },
    { value: "month", label: "50% · Vooruit" },
] as const;

export const STICKER_OPTIONS = [
    { value: "all", label: "Alles" },
    { value: "yes", label: "Gestickerd" },
    { value: "no", label: "Niet gestickerd" },
] as const;

export const STOCK_OPTIONS = [
    { value: "all", label: "Met of zonder datum" },
    { value: "dated", label: "Met geregistreerde datum" },
    { value: "undated", label: "Zonder geregistreerde datum" },
] as const;

export const STATUS_OPTIONS = [
    { value: "all", label: "Actief en gepauzeerd" },
    { value: "active", label: "Alleen actief" },
    { value: "paused", label: "Alleen gepauzeerd" },
] as const;

export const PHOTO_OPTIONS = [
    { value: "all", label: "Met of zonder foto" },
    { value: "yes", label: "Met foto" },
    { value: "no", label: "Zonder foto" },
] as const;

export const DATE_OPTIONS = [
    { value: "all", label: "Alles" },
    { value: "overdue", label: "Over datum" },
    { value: "today", label: "Vandaag" },
    { value: "next7", label: "Binnen 7 dagen" },
    { value: "custom", label: "Exacte datum of periode" },
] as const;

export const SORT_OPTIONS = [
    { value: "name_asc", label: "A → Z", group: "Naam" },
    { value: "name_desc", label: "Z → A", group: "Naam" },
    { value: "expiry_asc", label: "Eerst vervallend", group: "Vervaldatum" },
    { value: "expiry_desc", label: "Laatst vervallend", group: "Vervaldatum" },
    { value: "category_order", label: "Winkelvolgorde", group: "Categorie" },
    { value: "category_asc", label: "A → Z", group: "Categorie" },
    { value: "category_desc", label: "Z → A", group: "Categorie" },
    { value: "updated_desc", label: "Laatst gewijzigd", group: "Registratie" },
    { value: "created_desc", label: "Nieuwste producten", group: "Registratie" },
    { value: "created_asc", label: "Oudste producten", group: "Registratie" },
    { value: "stickered_first", label: "Gestickerd eerst", group: "Stickerstatus" },
    {
        value: "unstickered_first",
        label: "Niet gestickerd eerst",
        group: "Stickerstatus",
    },
] as const;

export type ControlFilter = (typeof CONTROL_OPTIONS)[number]["value"];
export type DateFilterMode = "exact" | "range";
export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export type StockPreferences = {
    search: string;
    categoryFilter: string;
    controlFilter: ControlFilter;
    stickerFilter: (typeof STICKER_OPTIONS)[number]["value"];
    stockFilter: (typeof STOCK_OPTIONS)[number]["value"];
    statusFilter: (typeof STATUS_OPTIONS)[number]["value"];
    photoFilter: (typeof PHOTO_OPTIONS)[number]["value"];
    datePreset: (typeof DATE_OPTIONS)[number]["value"];
    sort: SortOption;
    dateFilterMode: DateFilterMode;
    exactDate: string;
    fromDate: string;
    toDate: string;
    page: number;
};

export const DEFAULT_STOCK_PREFERENCES: StockPreferences = {
    search: "",
    categoryFilter: "",
    controlFilter: "all",
    stickerFilter: "all",
    stockFilter: "all",
    statusFilter: "all",
    photoFilter: "all",
    datePreset: "all",
    sort: "name_asc",
    dateFilterMode: "exact",
    exactDate: "",
    fromDate: "",
    toDate: "",
    page: 1,
};

function readChoice<T extends string>(
    value: unknown,
    options: readonly { value: T }[],
    fallback: T,
): T {
    return options.find((option) => option.value === value)?.value ?? fallback;
}

function readDate(value: unknown): string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return "";
    }

    const date = new Date(value + "T00:00:00Z");

    return Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
        ? value
        : "";
}

export function parseStockPreferences(value: unknown): StockPreferences {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ...DEFAULT_STOCK_PREFERENCES };
    }

    const saved = value as Record<string, unknown>;
    const dateFilterMode = saved.dateFilterMode === "range" ? "range" : "exact";
    const exactDate = readDate(saved.exactDate);
    const fromDate = readDate(saved.fromDate);
    const toDate = readDate(saved.toDate);
    const hasSavedDate =
        dateFilterMode === "exact"
            ? Boolean(exactDate)
            : Boolean(fromDate || toDate);

    return {
        search: typeof saved.search === "string" ? saved.search : "",
        categoryFilter:
            typeof saved.categoryFilter === "string" ? saved.categoryFilter : "",
        controlFilter: readChoice(saved.controlFilter, CONTROL_OPTIONS, "all"),
        stickerFilter: readChoice(saved.stickerFilter, STICKER_OPTIONS, "all"),
        stockFilter: readChoice(saved.stockFilter, STOCK_OPTIONS, "all"),
        statusFilter: readChoice(saved.statusFilter, STATUS_OPTIONS, "all"),
        photoFilter: readChoice(saved.photoFilter, PHOTO_OPTIONS, "all"),
        datePreset: readChoice(
            saved.datePreset,
            DATE_OPTIONS,
            hasSavedDate ? "custom" : "all",
        ),
        sort: readChoice(saved.sort, SORT_OPTIONS, "name_asc"),
        dateFilterMode,
        exactDate,
        fromDate,
        toDate,
        page:
            typeof saved.page === "number" &&
                Number.isSafeInteger(saved.page) &&
                saved.page > 0 &&
                saved.page <= 2147483647
                ? saved.page
                : 1,
    };
}

export function getStockDateError(
    preferences: StockPreferences,
): string | null {
    if (
        preferences.datePreset === "custom" &&
        preferences.dateFilterMode === "range" &&
        preferences.fromDate &&
        preferences.toDate &&
        preferences.fromDate > preferences.toDate
    ) {
        return "De begindatum moet voor of op de einddatum liggen.";
    }

    return null;
}

export function getStockQuery(preferences: StockPreferences): string {
    const params = new URLSearchParams({
        page: String(preferences.page),
        sort: preferences.sort,
        control: preferences.controlFilter,
        stickered: preferences.stickerFilter,
        stock: preferences.stockFilter,
        status: preferences.statusFilter,
        photo: preferences.photoFilter,
        datePreset: preferences.datePreset,
    });

    if (preferences.search.trim()) {
        params.set("search", preferences.search.trim());
    }

    if (preferences.categoryFilter) {
        params.set("category", preferences.categoryFilter);
    }

    if (preferences.datePreset === "custom") {
        if (preferences.dateFilterMode === "exact") {
            if (preferences.exactDate) {
                params.set("exactDate", preferences.exactDate);
            }
        } else {
            if (preferences.fromDate) {
                params.set("fromDate", preferences.fromDate);
            }

            if (preferences.toDate) {
                params.set("toDate", preferences.toDate);
            }
        }
    }

    return params.toString();
}