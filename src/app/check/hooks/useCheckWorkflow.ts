
"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type TouchEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
    CHECK_CONFIG,
    isCheckType,
    type Category,
    type DailyStep,
    type Item,
} from "../types";

import {
    clearDailyStep,
    getDailyStepKey,
    getProgressKey,
    getToday,
    readDailyStep,
    readProgress,
    saveDailyStep,
    saveProgress,
} from "../utils";

export function useCheckWorkflow() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const typeParam = searchParams.get("type");
    const type = isCheckType(typeParam) ? typeParam : null;
    const categoryParam = searchParams.get("categoryId") ?? "";
    const refreshToken = searchParams.get("refresh");

    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryId, setCategoryId] = useState(categoryParam);

    const [loading, setLoading] = useState(true);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);

    const [error, setError] = useState<string | null>(null);
    const [completedIds, setCompletedIds] = useState<string[]>([]);
    const [initialCount, setInitialCount] = useState(0);

    const [dailyStep, setDailyStep] = useState<DailyStep>("sticker");
    const [showDateInput, setShowDateInput] = useState(false);
    const [nextExpiryDate, setNextExpiryDate] = useState("");

    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    const todayString = getToday();

    const progressKey = type
        ? getProgressKey(type, categoryId)
        : "";

    const dailyStepKey = getDailyStepKey();

    const currentItem = items[0] ?? null;
    const config = type ? CHECK_CONFIG[type] : null;

    const completedCount = Math.max(0, initialCount - items.length);
    const progressPercent =
        initialCount > 0
            ? Math.min(100, (completedCount / initialCount) * 100)
            : 0;

    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === categoryId),
        [categories, categoryId],
    );

    const changeCategory = useCallback(
        (id: string) => {
            setCategoryId(id);
            setError(null);

            const params = new URLSearchParams(searchParams.toString());

            if (id) {
                params.set("categoryId", id);
            } else {
                params.delete("categoryId");
            }

            router.replace(`/check?${params.toString()}`, {
                scroll: false,
            });
        },
        [router, searchParams],
    );

    useEffect(() => {
        if (type !== "stock") return;
        setCategoryId(categoryParam);
    }, [type, categoryParam]);

    useEffect(() => {
        if (type !== "stock") return;

        let cancelled = false;

        async function loadCategories() {
            setCategoriesLoading(true);

            try {
                const response = await fetch("/api/categories", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Categorieën konden niet geladen worden.");
                }

                const data: unknown = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Ongeldige categorieën ontvangen.");
                }

                if (!cancelled) {
                    setCategories(data as Category[]);
                }
            } catch (err) {
                console.error(err);

                if (!cancelled) {
                    setError("Categorieën konden niet geladen worden.");
                }
            } finally {
                if (!cancelled) {
                    setCategoriesLoading(false);
                }
            }
        }

        void loadCategories();

        return () => {
            cancelled = true;
        };
    }, [type]);

    useEffect(() => {
        if (!type || (type === "stock" && !categoryId)) {
            setItems([]);
            setInitialCount(0);
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function loadItems() {
            if (!type) return;

            setLoading(true);
            setError(null);

            try {
                const endpoint =
                    type === "stock"
                        ? `/api/items/out-of-stock?categoryId=${encodeURIComponent(
                            categoryId,
                        )}`
                        : CHECK_CONFIG[type].endpoint;

                const response = await fetch(endpoint, {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Producten konden niet geladen worden.");
                }

                const data: unknown = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Ongeldige productgegevens.");
                }

                const loadedItems = data as Item[];
                const completed = readProgress(progressKey);

                if (cancelled) return;

                const remaining = loadedItems.filter(
                    (item) => !completed.includes(item.id),
                );

                setCompletedIds(completed);
                setInitialCount(
                    loadedItems.length +
                    completed.filter(
                        (id) => !loadedItems.some((item) => item.id === id),
                    ).length,
                );
                setItems(remaining);

                setDailyStep(
                    type === "sticker" && remaining[0]
                        ? readDailyStep(dailyStepKey, remaining[0].id)
                        : "sticker",
                );

                setShowDateInput(false);
                setNextExpiryDate("");
                setSwipeOffset(0);
            } catch (err) {
                console.error(err);

                if (!cancelled) {
                    setError("Producten konden niet geladen worden.");
                    setItems([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadItems();

        return () => {
            cancelled = true;
        };
    }, [type, categoryId, refreshToken, progressKey, dailyStepKey]);

    const resetCurrentItem = useCallback(
        (nextItem?: Item | null) => {
            setDailyStep(
                type === "sticker" && nextItem
                    ? readDailyStep(dailyStepKey, nextItem.id)
                    : "sticker",
            );

            setShowDateInput(false);
            setNextExpiryDate("");
            setError(null);
            setSwipeOffset(0);
        },
        [type, dailyStepKey],
    );

    const handleNextItem = useCallback(() => {
        if (!currentItem) return;

        const updated = [...new Set([...completedIds, currentItem.id])];

        saveProgress(progressKey, updated);

        if (type === "sticker") {
            clearDailyStep(dailyStepKey);
        }

        setCompletedIds(updated);

        const remaining = items.filter(
            (item) => item.id !== currentItem.id,
        );

        setItems(remaining);
        resetCurrentItem(remaining[0]);
    }, [
        currentItem,
        completedIds,
        progressKey,
        type,
        dailyStepKey,
        items,
        resetCurrentItem,
    ]);

    async function updateExpiryDate(date: string | null) {
        if (!currentItem || savingRef.current) return;

        savingRef.current = true;
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`/api/items/${currentItem.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    expiry_date: date,
                }),
            });

            if (!response.ok) {
                throw new Error("Product kon niet bijgewerkt worden.");
            }

            handleNextItem();
        } catch (err) {
            console.error(err);
            setError("De vervaldatum kon niet opgeslagen worden.");
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    async function handleChecked() {
        if (!nextExpiryDate || nextExpiryDate < todayString) return;
        await updateExpiryDate(nextExpiryDate);
    }

    async function handleNoNewStock() {
        if (!currentItem || savingRef.current) return;

        if (type === "stock") {
            handleNextItem();
            return;
        }

        await updateExpiryDate(null);
    }

    async function handleDailySticker(shouldSticker: boolean) {
        if (!currentItem || savingRef.current) return;

        if (!shouldSticker) {
            saveDailyStep(dailyStepKey, currentItem.id);
            setDailyStep("new-stock");
            setError(null);
            return;
        }

        savingRef.current = true;
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/items/${currentItem.id}/sticker`,
                { method: "POST" },
            );

            if (!response.ok) {
                throw new Error("Stickerstatus kon niet opgeslagen worden.");
            }

            saveDailyStep(dailyStepKey, currentItem.id);
            setDailyStep("new-stock");
        } catch (err) {
            console.error(err);
            setError("Stickerstatus kon niet opgeslagen worden.");
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    async function handleEveningNext() {
        if (!currentItem || savingRef.current) return;

        savingRef.current = true;
        setSaving(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/items/${currentItem.id}/evening`,
                { method: "POST" },
            );

            if (!response.ok) {
                throw new Error("Avondcontrole kon niet opgeslagen worden.");
            }

            handleNextItem();
        } catch (err) {
            console.error(err);
            setError("Het product kon niet verwerkt worden.");
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    const isDaily = type === "sticker";
    const isEvening = type === "evening";
    const isStock = type === "stock";

    const missedCheck =
        currentItem?.expiry_date != null &&
        currentItem.expiry_date.slice(0, 10) < todayString;

    const isStickerQuestion = isDaily && dailyStep === "sticker";

    const isDateQuestion =
        !isEvening && !isStickerQuestion && showDateInput;

    const canSwipe =
        Boolean(currentItem) &&
        !saving &&
        !isDateQuestion &&
        !isEvening &&
        !loading &&
        !error;

    function handleYes() {
        if (savingRef.current) return;

        if (isStickerQuestion) {
            void handleDailySticker(true);
        } else if (!isEvening && !showDateInput) {
            setShowDateInput(true);
        }
    }

    function handleNo() {
        if (savingRef.current) return;

        if (isStickerQuestion) {
            void handleDailySticker(false);
        } else if (!isEvening && !showDateInput) {
            void handleNoNewStock();
        }
    }

    function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
        if (!canSwipe || event.touches.length !== 1) {
            touchStart.current = null;
            return;
        }

        const target = event.target as HTMLElement;

        if (
            target.closest(
                "button, a, input, textarea, select, [role='button']",
            )
        ) {
            touchStart.current = null;
            return;
        }

        touchStart.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
        };
    }

    function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
        if (!touchStart.current || !canSwipe || event.touches.length !== 1) {
            return;
        }

        const dx =
            event.touches[0].clientX - touchStart.current.x;

        const dy =
            event.touches[0].clientY - touchStart.current.y;

        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
            setSwipeOffset(Math.max(-110, Math.min(110, dx)));
        } else {
            setSwipeOffset(0);
        }
    }

    function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
        if (!touchStart.current || !canSwipe) {
            touchStart.current = null;
            setSwipeOffset(0);
            return;
        }

        const dx =
            event.changedTouches[0].clientX - touchStart.current.x;

        const dy =
            event.changedTouches[0].clientY - touchStart.current.y;

        touchStart.current = null;
        setSwipeOffset(0);

        if (
            Math.abs(dx) < 90 ||
            Math.abs(dx) < Math.abs(dy) * 1.5
        ) {
            return;
        }

        if (dx > 0) {
            handleYes();
        } else {
            handleNo();
        }
    }

    function handleTouchCancel() {
        touchStart.current = null;
        setSwipeOffset(0);
    }

    return {
        type,
        config,
        items,
        categories,
        categoryId,
        selectedCategory,
        currentItem,
        loading,
        categoriesLoading,
        saving,
        error,
        initialCount,
        completedCount,
        progressPercent,
        dailyStep,
        showDateInput,
        nextExpiryDate,
        todayString,
        swipeOffset,
        missedCheck,
        isDaily,
        isEvening,
        isStock,
        isStickerQuestion,
        canSwipe,
        changeCategory,
        resetCurrentItem,
        setNextExpiryDate,
        setShowDateInput,
        handleChecked,
        handleEveningNext,
        handleYes,
        handleNo,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
    };
}