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
    stickered: boolean;
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
        emptyDescription:
            "Alle producten voor dagelijks stickeren zijn gecontroleerd en de datums van de overige voorraad zijn bijgewerkt.",
        instructions:
            "Sticker de exemplaren die vandaag vervallen. Registreer daarna de vroegste datum van de voorraad die na vandaag vervalt.",
        icon: "tag",
    },
    monthly: {
        title: "Vooruit stickeren",
        endpoint: "/api/checks?type=monthly",
        emptyDescription:
            "Alle producten binnen de ingestelde periode zijn gecontroleerd.",
        instructions:
            "Controleer de voorraad met de getoonde vervaldatum en beoordeel of een 50%-sticker nodig is.",
        icon: "calendar-days",
    },
    evening: {
        title: "Dagelijks ophalen",
        endpoint: "/api/checks?type=evening",
        emptyDescription:
            "Alle resterende dagelijks gestickerde exemplaren zijn opgehaald of al verkocht.",
        instructions:
            "Verwijder de resterende exemplaren met een 30%-sticker en bevestig dat ze weg zijn.",
        icon: "moon",
    },
    "monthly-pickup": {
        title: "Vooruit ophalen",
        endpoint: "/api/checks?type=monthly-pickup",
        emptyDescription:
            "Alle producten die vandaag vervallen zijn opgehaald en de overige voorraad is bijgewerkt.",
        instructions:
            "Haal eerst alle exemplaren met de getoonde vervaldatum op, ook zonder sticker. Controleer daarna in een tweede ronde de overige voorraad.",
        icon: "package-check",
    },
    overdue: {
        title: "Over datum",
        endpoint: "/api/checks?type=overdue",
        emptyDescription:
            "Alle verlopen producten zijn gecontroleerd en de overige voorraad is bijgewerkt.",
        instructions:
            "Verwijder verlopen exemplaren en registreer de vroegste datum van de resterende verkoopbare voorraad.",
        icon: "clipboard-check",
    },
    stock: {
        title: "Stockcheck",
        endpoint: "/api/checks?type=stock",
        emptyDescription:
            "Alle producten zonder geregistreerde voorraad in deze categorie zijn gecontroleerd.",
        instructions:
            "Controleer of het product opnieuw in voorraad is en registreer de vroegste vervaldatum.",
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