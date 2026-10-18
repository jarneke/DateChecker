
export type CheckType =
    | "sticker"
    | "overdue"
    | "monthly"
    | "evening"
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
        title: "Dagelijkse ochtendcontrole",
        endpoint: "/api/items/due",
        emptyDescription: "Alle producten zijn gecontroleerd.",
        instructions: "Zoek het product in het rayon.",
        icon: "tag",
    },

    overdue: {
        title: "Over datum",
        endpoint: "/api/items/overdue",
        emptyDescription: "Alle verlopen producten zijn gecontroleerd.",
        instructions:
            "De geplande controle is gemist. Controleer de aanwezige voorraad en vervaldatums.",
        icon: "clipboard-check",
    },

    monthly: {
        title: "Maandelijkse controle",
        endpoint: "/api/items/monthly",
        emptyDescription: "Alle maandelijkse producten zijn gecontroleerd.",
        instructions:
            "Controleer de vervaldatum van de aanwezige producten.",
        icon: "calendar-days",
    },

    evening: {
        title: "Dagelijkse avondcontrole",
        endpoint: "/api/items/evening",
        emptyDescription: "Alle gestickerde producten zijn gecontroleerd.",
        instructions:
            "Haal de gestickerde producten die hiervoor in aanmerking komen uit de winkel.",
        icon: "moon",
    },

    stock: {
        title: "Stockcheck",
        endpoint: "/api/items/out-of-stock",
        emptyDescription:
            "Alle producten in deze categorie zijn bekeken.",
        instructions:
            "Controleer of dit product opnieuw in voorraad is.",
        icon: "package",
    },
};

export function isCheckType(
    value: string | null,
): value is CheckType {
    return (
        value === "sticker" ||
        value === "overdue" ||
        value === "monthly" ||
        value === "evening" ||
        value === "stock"
    );
}
