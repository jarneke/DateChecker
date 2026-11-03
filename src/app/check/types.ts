export type CheckType =
    | "sticker"
    | "monthly"
    | "evening"
    | "monthly-pickup"
    | "overdue"
    | "stock";

export type DailyStep = "sticker" | "new-stock";

export type Item = {
    id: string;
    name: string;
    photo_url: string | null;
    expiry_date: string | null;
    sticker_30_percent: boolean;
    category_id: string;
    category_name: string;
    paused?: boolean;
    stickered_for_date?: string | null;
};

export type Category = {
    id: string;
    name: string;
};

export type CheckConfig = {
    title: string;
    endpoint: string;
    emptyDescription: string;
    instructions: string;
    icon: string;
};

export const CHECK_CONFIG: Record<CheckType, CheckConfig> = {
    sticker: {
        title: "Dagelijks stickeren",
        endpoint: "/api/checks?type=sticker",
        emptyDescription: "Alle producten voor dagelijks stickeren zijn gecontroleerd en de volgende voorraaddatums zijn bijgewerkt.",
        instructions: "Sticker de exemplaren voor vandaag en registreer de eerstvolgende vervaldatum van de overige voorraad.",
        icon: "tag",
    },
    monthly: {
        title: "Vooruit stickeren",
        endpoint: "/api/checks?type=monthly",
        emptyDescription: "Alle producten binnen de ingestelde periode zijn gecontroleerd.",
        instructions: "Sticker de exemplaren met de getoonde vervaldatum.",
        icon: "calendar-days",
    },
    evening: {
        title: "Dagelijks ophalen",
        endpoint: "/api/checks?type=evening",
        emptyDescription: "Alle dagelijks gestickerde producten zijn opgehaald.",
        instructions: "Haal de resterende gestickerde exemplaren op en bevestig dat ze weg zijn.",
        icon: "moon",
    },
    "monthly-pickup": {
        title: "Vooruit gestickerde producten ophalen",
        endpoint: "/api/checks?type=monthly-pickup",
        emptyDescription: "Alle vooruit gestickerde producten die aan de beurt zijn, zijn opgehaald en bijgewerkt.",
        instructions: "Haal de gestickerde exemplaren op en controleer de resterende voorraad.",
        icon: "package-check",
    },
    overdue: {
        title: "Over datum",
        endpoint: "/api/checks?type=overdue",
        emptyDescription: "Alle verlopen producten zijn gecontroleerd.",
        instructions: "Verwijder verlopen exemplaren en controleer de resterende voorraad.",
        icon: "clipboard-check",
    },
    stock: {
        title: "Stockcheck",
        endpoint: "/api/checks?type=stock",
        emptyDescription: "Alle producten in deze categorie zijn bekeken.",
        instructions: "Controleer of dit product opnieuw in voorraad is.",
        icon: "package",
    },
};

export function isCheckType(value: string | null): value is CheckType {
    return (
        value === "sticker" ||
        value === "monthly" ||
        value === "evening" ||
        value === "monthly-pickup" ||
        value === "overdue" ||
        value === "stock"
    );
}