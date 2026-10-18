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
    if (!date) return "Geen vervaldatum";

    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) return "Ongeldige datum";

    const [, year, month, day] = match;

    return `${day}/${month}/${year}`;
}