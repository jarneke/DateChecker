
import type { CheckType, DailyStep } from "./types";

export function getToday(): string {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Brussels",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const get = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? "";

    return `${get("year")}-${get("month")}-${get("day")}`;
}


export function formatDate(date: string | null): string {
    if (!date) {
        return "Geen vervaldatum";
    }

    // Haal de kalenderdatum rechtstreeks uit de databasewaarde.
    // Geen new Date() gebruiken: dat kan tijdzoneverschuivingen geven.
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
        return "Ongeldige datum";
    }

    const [, year, month, day] = match;

    return `${day}/${month}/${year}`;
}

export function getProgressKey(
    type: CheckType,
    categoryId = "",
): string {
    const today = getToday();

    return `datecheck:progress:${today}:${type}:${type === "stock" ? categoryId : "all"
        }`;
}

export function getDailyStepKey(): string {
    return `datecheck:daily-step:${getToday()}`;
}

export function readProgress(key: string): string[] {
    try {
        const value: unknown = JSON.parse(
            localStorage.getItem(key) ?? "[]",
        );

        return Array.isArray(value)
            ? value.filter(
                (id): id is string => typeof id === "string",
            )
            : [];
    } catch {
        return [];
    }
}

export function saveProgress(
    key: string,
    completedIds: string[],
): void {
    try {
        localStorage.setItem(
            key,
            JSON.stringify([...new Set(completedIds)]),
        );
    } catch (error) {
        console.error(
            "Voortgang kon niet opgeslagen worden:",
            error,
        );
    }
}

export function readDailyStep(
    key: string,
    itemId: string,
): DailyStep {
    try {
        const saved = localStorage.getItem(key);

        return saved === itemId ? "new-stock" : "sticker";
    } catch {
        return "sticker";
    }
}

export function saveDailyStep(
    key: string,
    itemId: string,
): void {
    try {
        localStorage.setItem(key, itemId);
    } catch (error) {
        console.error(
            "Dagelijkse stap kon niet opgeslagen worden:",
            error,
        );
    }
}

export function clearDailyStep(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(
            "Dagelijkse stap kon niet verwijderd worden:",
            error,
        );
    }
}
