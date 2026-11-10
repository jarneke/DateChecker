"use client";

import {
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
    CHECK_CONFIG,
    isCheckType,
    type Category,
    type CheckType,
    type Item,
} from "../types";
import { getToday } from "../utils";
import { useCheckSwipe } from "./useCheckSwipe";

type CheckStage =
    | "sticker"
    | "new-stock"
    | "date"
    | "evening"
    | "completed";

type SharedItem = Item & {
    stage: CheckStage;
    target_expiry_date: string | null;
    draft_expiry_date: string | null;
    version: number;
};

export type SharedCategory = Category & {
    color?: string | null;
    remaining_count: number;
};

export type CheckSnapshot = {
    date: string;
    morningCompleted: boolean;
    eveningCompleted: boolean;
    morningRemaining: number;
    eveningRemaining: number;
    remainingCounts: Record<CheckType, number>;
    blocked: string | null;
    items: SharedItem[];
    initialCount: number;
    completedCount: number;
    categories: SharedCategory[];
};

type CheckAction =
    | "sticker-yes"
    | "sticker-no"
    | "open-date"
    | "draft-date"
    | "back"
    | "save-date"
    | "no-stock"
    | "evening-done";

type UpdatedTask = {
    stage: CheckStage;
    target_expiry_date: string | null;
    draft_expiry_date: string | null;
    version: number;
};

type CompletionEntry = {
    historyId: string;
    item: SharedItem;
    version: number;
};

type ActionResult = {
    task: UpdatedTask;
    item: Item;
    historyId: string | null;
};

type LocalDateDraft = {
    date: string;
    itemId: string;
    value: string;
};

export function useCheckWorkflow() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const typeParam = searchParams.get("type");
    const type = isCheckType(typeParam) ? typeParam : null;
    const categoryId = searchParams.get("categoryId") ?? "";
    const refreshToken = searchParams.get("refresh");

    const [snapshot, setSnapshot] = useState<CheckSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextExpiryDate, setDateDraft] = useState("");
    const [history, setHistory] = useState<CompletionEntry[]>([]);

    const snapshotRef = useRef<CheckSnapshot | null>(null);
    const historyRef = useRef<CompletionEntry[]>([]);
    const activeItemIdRef = useRef<string | null>(null);
    const returnItemsRef = useRef<string[]>([]);
    const loadedDayRef = useRef<string | null>(null);
    const localDateDraftRef = useRef<LocalDateDraft | null>(null);
    const savingRef = useRef(false);
    const requestIdRef = useRef(0);
    const mountedRef = useRef(false);
    const contextRef = useRef("");

    const context = `${type ?? ""}:${categoryId}:${refreshToken ?? ""}`;

    const updateHistory = useCallback((entries: CompletionEntry[]) => {
        historyRef.current = entries;
        setHistory(entries);
    }, []);

    const applySnapshot = useCallback(
        (data: CheckSnapshot) => {
            if (loadedDayRef.current !== data.date) {
                loadedDayRef.current = data.date;
                activeItemIdRef.current = null;
                returnItemsRef.current = [];
                localDateDraftRef.current = null;
                updateHistory([]);
            }

            const preferred = data.items.find(
                (item) => item.id === activeItemIdRef.current,
            );

            const orderedItems = preferred
                ? [
                    preferred,
                    ...data.items.filter((item) => item.id !== preferred.id),
                ]
                : data.items;

            const nextSnapshot = {
                ...data,
                items: orderedItems,
            };

            const nextItem = orderedItems[0];
            const localDraft = localDateDraftRef.current;

            const preserveLocalDraft =
                localDraft !== null &&
                localDraft.date === data.date &&
                localDraft.itemId === nextItem?.id &&
                nextItem?.stage === "date";

            activeItemIdRef.current = nextItem?.id ?? null;
            snapshotRef.current = nextSnapshot;
            setSnapshot(nextSnapshot);

            if (preserveLocalDraft && localDraft) {
                setDateDraft(localDraft.value);
            } else {
                localDateDraftRef.current = null;
                setDateDraft(nextItem?.draft_expiry_date ?? "");
            }
        },
        [updateHistory],
    );

    const loadSnapshot = useCallback(
        async (force = false): Promise<boolean> => {
            if (!type || (!force && savingRef.current)) return false;

            const requestId = ++requestIdRef.current;
            const requestContext = context;

            try {
                const params = new URLSearchParams({ type });

                if (type === "stock") {
                    params.set("categoryId", categoryId || "all");
                }

                const response = await fetch(`/api/checks?${params.toString()}`, {
                    cache: "no-store",
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data?.error || "De controle kon niet geladen worden.",
                    );
                }

                if (
                    !mountedRef.current ||
                    requestId !== requestIdRef.current ||
                    requestContext !== contextRef.current
                ) {
                    return false;
                }

                if (
                    !Array.isArray(data.items) ||
                    !Array.isArray(data.categories)
                ) {
                    throw new Error("Ongeldige controlegegevens ontvangen.");
                }

                applySnapshot(data as CheckSnapshot);
                setLoading(false);
                return true;
            } catch (caughtError) {
                if (
                    mountedRef.current &&
                    requestId === requestIdRef.current &&
                    requestContext === contextRef.current
                ) {
                    setError(
                        caughtError instanceof Error
                            ? caughtError.message
                            : "De controle kon niet geladen worden.",
                    );
                    setLoading(false);
                }

                return false;
            }
        },
        [type, categoryId, context, applySnapshot],
    );

    useLayoutEffect(() => {
        contextRef.current = context;
        mountedRef.current = true;
        snapshotRef.current = null;
        loadedDayRef.current = null;
        activeItemIdRef.current = null;
        returnItemsRef.current = [];
        localDateDraftRef.current = null;
        savingRef.current = false;

        const frame = window.requestAnimationFrame(() => {
            updateHistory([]);
            setSnapshot(null);
            setDateDraft("");
            setSaving(false);
            setError(null);
            setLoading(Boolean(type));

            if (type) void loadSnapshot();
        });

        const refresh = () => {
            if (document.visibilityState === "visible") {
                void loadSnapshot();
            }
        };

        const interval = window.setInterval(refresh, 5000);

        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);

        return () => {
            mountedRef.current = false;
            requestIdRef.current += 1;
            window.cancelAnimationFrame(frame);
            window.clearInterval(interval);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [context, type, loadSnapshot, updateHistory]);

    function selectReturnItem(remainingItems: SharedItem[]) {
        while (returnItemsRef.current.length > 0) {
            const candidate = returnItemsRef.current.pop();

            if (remainingItems.some((item) => item.id === candidate)) {
                activeItemIdRef.current = candidate ?? null;
                return;
            }
        }

        activeItemIdRef.current = null;
    }

    async function performAction(
        action: CheckAction,
        expiryDate: string | null = null,
    ) {
        const currentSnapshot = snapshotRef.current;
        const task = currentSnapshot?.items[0];

        if (
            !type ||
            !currentSnapshot ||
            !task ||
            currentSnapshot.blocked ||
            savingRef.current
        ) {
            return;
        }

        const actionContext = context;

        savingRef.current = true;
        requestIdRef.current += 1;
        setSaving(true);
        setError(null);

        try {
            const response = await fetch("/api/checks/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: currentSnapshot.date,
                    type,
                    itemId: task.id,
                    version: task.version,
                    action,
                    expiryDate,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.error || "De stap kon niet opgeslagen worden.",
                );
            }

            if (
                !mountedRef.current ||
                actionContext !== contextRef.current
            ) {
                return;
            }

            const result = data as ActionResult;
            const completed = result.task.stage === "completed";

            const updatedItem: SharedItem = {
                ...task,
                ...result.item,
                ...result.task,
            };

            const remainingItems = completed
                ? currentSnapshot.items.filter((item) => item.id !== task.id)
                : currentSnapshot.items.map((item) =>
                    item.id === task.id ? updatedItem : item,
                );

            if (completed) {
                if (result.historyId) {
                    updateHistory([
                        ...historyRef.current,
                        {
                            historyId: result.historyId,
                            item: task,
                            version: result.task.version,
                        },
                    ]);
                }

                selectReturnItem(remainingItems);
            } else {
                activeItemIdRef.current = task.id;
            }

            applySnapshot({
                ...currentSnapshot,
                items: remainingItems,
                completedCount:
                    currentSnapshot.completedCount + Number(completed),
            });

            await loadSnapshot(true);
        } catch (caughtError) {
            if (
                mountedRef.current &&
                actionContext === contextRef.current
            ) {
                const message =
                    caughtError instanceof Error
                        ? caughtError.message
                        : "De stap kon niet opgeslagen worden.";

                await loadSnapshot(true);

                if (
                    mountedRef.current &&
                    actionContext === contextRef.current
                ) {
                    setError(message);
                }
            }
        } finally {
            savingRef.current = false;

            if (mountedRef.current) {
                setSaving(false);
            }
        }
    }

    async function reopenPreviousItem() {
        const currentSnapshot = snapshotRef.current;
        const entry = historyRef.current[historyRef.current.length - 1];

        if (
            !type ||
            !currentSnapshot ||
            !entry ||
            savingRef.current
        ) {
            return;
        }

        const actionContext = context;
        const currentItemId = currentSnapshot.items[0]?.id;

        savingRef.current = true;
        requestIdRef.current += 1;
        setSaving(true);
        setError(null);

        try {
            const response = await fetch("/api/checks/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: currentSnapshot.date,
                    type,
                    itemId: entry.item.id,
                    version: entry.version,
                    action: "previous",
                    historyId: entry.historyId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (
                    response.status === 409 &&
                    mountedRef.current &&
                    actionContext === contextRef.current
                ) {
                    updateHistory([]);
                }

                throw new Error(
                    data?.error || "Het vorige product kon niet geopend worden.",
                );
            }

            if (
                !mountedRef.current ||
                actionContext !== contextRef.current
            ) {
                return;
            }

            const result = data as ActionResult;
            const restoredItem: SharedItem = {
                ...entry.item,
                ...result.item,
                ...result.task,
            };

            if (currentItemId && currentItemId !== restoredItem.id) {
                returnItemsRef.current.push(currentItemId);
            }

            updateHistory(historyRef.current.slice(0, -1));
            activeItemIdRef.current = restoredItem.id;

            applySnapshot({
                ...currentSnapshot,
                blocked: null,
                items: [
                    restoredItem,
                    ...currentSnapshot.items.filter(
                        (item) => item.id !== restoredItem.id,
                    ),
                ],
                completedCount: Math.max(
                    0,
                    currentSnapshot.completedCount - 1,
                ),
            });

            await loadSnapshot(true);
        } catch (caughtError) {
            if (
                mountedRef.current &&
                actionContext === contextRef.current
            ) {
                const message =
                    caughtError instanceof Error
                        ? caughtError.message
                        : "Het vorige product kon niet geopend worden.";

                await loadSnapshot(true);

                if (
                    mountedRef.current &&
                    actionContext === contextRef.current
                ) {
                    setError(message);
                }
            }
        } finally {
            savingRef.current = false;

            if (mountedRef.current) {
                setSaving(false);
            }
        }
    }

    const items = snapshot?.items ?? [];
    const categories = snapshot?.categories ?? [];
    const currentItem = items[0] ?? null;

    const isDaily = type === "sticker";
    const isStickerRound = type === "sticker" || type === "monthly";
    const isPickupRound =
        type === "evening" || type === "monthly-pickup";
    const isEvening =
        isPickupRound && currentItem?.stage === "evening";
    const isStock = type === "stock";

    const selectedCategory =
        categoryId === "all"
            ? { id: "all", name: "Alle categorieën" }
            : categories.find((category) => category.id === categoryId);

    const todayString = snapshot?.date ?? getToday();
    const tomorrow = new Date(`${todayString}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const minimumExpiryDate = isDaily || isPickupRound
        ? tomorrow.toISOString().slice(0, 10)
        : todayString;

    const initialCount = snapshot?.initialCount ?? 0;
    const completedCount = snapshot?.completedCount ?? 0;

    const progressPercent =
        initialCount > 0
            ? Math.min(100, (completedCount / initialCount) * 100)
            : 0;

    const dailyStep =
        currentItem?.stage === "sticker"
            ? ("sticker" as const)
            : ("new-stock" as const);

    const showDateInput = currentItem?.stage === "date";
    const isStickerQuestion =
        isStickerRound && currentItem?.stage === "sticker";

    const canGoBack =
        history.length > 0 ||
        (
            !snapshot?.blocked &&
            (
                showDateInput ||
                (
                    (isStickerRound || isPickupRound) &&
                    currentItem?.stage === "new-stock"
                )
            )
        );

    const missedCheck =
        currentItem?.expiry_date != null &&
        currentItem.expiry_date.slice(0, 10) < todayString;

    const canSwipe =
        Boolean(currentItem) &&
        !saving &&
        !loading &&
        !error &&
        !snapshot?.blocked &&
        !showDateInput;

    function changeCategory(id: string) {
        if (savingRef.current) return;

        const params = new URLSearchParams(searchParams.toString());

        if (id) {
            params.set("categoryId", id);
        } else {
            params.delete("categoryId");
        }

        router.replace(`/check?${params.toString()}`, {
            scroll: false,
        });
    }

    function handleYes() {
        if (isStickerQuestion) {
            void performAction("sticker-yes");
        } else if (isEvening) {
            void performAction("evening-done");
        } else if (!showDateInput) {
            void performAction("open-date");
        }
    }

    function handleNo() {
        if (isEvening) return;

        if (isStickerQuestion) {
            void performAction("sticker-no");
        } else if (!showDateInput) {
            void performAction("no-stock");
        }
    }

    function updateDateDraft(value: string) {
        const currentSnapshot = snapshotRef.current;
        const task = currentSnapshot?.items[0];

        if (
            savingRef.current ||
            !currentSnapshot ||
            currentSnapshot.blocked ||
            task?.stage !== "date"
        ) {
            return;
        }

        localDateDraftRef.current = {
            date: currentSnapshot.date,
            itemId: task.id,
            value,
        };

        setDateDraft(value);
    }

    function handleChecked() {
        if (!nextExpiryDate || nextExpiryDate < minimumExpiryDate) return;
        return performAction("save-date", nextExpiryDate);
    }

    function handleEveningNext() {
        return performAction("evening-done");
    }

    function handleBack() {
        if (savingRef.current) return;

        const current = snapshotRef.current?.items[0];

        if (
            current?.stage === "date" ||
            (
                (isStickerRound || isPickupRound) &&
                current?.stage === "new-stock"
            )
        ) {
            return performAction("back");
        }

        return reopenPreviousItem();
    }

    const {
        swipeOffset,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
    } = useCheckSwipe({
        gestureKey:
            canSwipe && currentItem
                ? JSON.stringify([
                    context,
                    todayString,
                    currentItem.id,
                    currentItem.version,
                ])
                : null,
        onSwipeRight: handleYes,
        onSwipeLeft: handleNo,
    });

    return {
        type,
        config: type ? CHECK_CONFIG[type] : null,
        items,
        categories,
        categoryId,
        selectedCategory,
        currentItem,
        loading,
        categoriesLoading: loading,
        saving,
        error,
        blocked: snapshot?.blocked ?? null,
        initialCount,
        completedCount,
        progressPercent,
        dailyStep,
        showDateInput,
        nextExpiryDate,
        todayString,
        minimumExpiryDate,
        swipeOffset,
        missedCheck,
        isDaily,
        isEvening,
        isStock,
        isStickerQuestion,
        canSwipe,
        canGoBack,
        changeCategory,
        setNextExpiryDate: updateDateDraft,
        handleChecked,
        handleEveningNext,
        handleBack,
        handleYes,
        handleNo,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
    };
}