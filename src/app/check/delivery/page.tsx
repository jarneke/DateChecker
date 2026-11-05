"use client";

import {
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCheck } from "lucide-react";

import CheckHeader from "../components/CheckHeader";
import ProductCard from "../components/ProductCard";
import CheckQuestion from "../components/CheckQuestion";
import CheckActions from "../components/CheckActions";
import CheckStates from "../components/CheckStates";

import type { Item } from "../types";
import { formatDate } from "../utils";
import styles from "../page.module.css";

type DeliveryItem = Item & {
  version: number;
};

type DeliverySnapshot = {
  runIds: string[];
  name: string;
  today: string;
  deliveries: {
    name: string;
    deliveryDate: string;
    completed: boolean;
  }[];
  categoryIds: string[];
  categoryNames: string[];
  version: string;
  completedAt: string | null;
  selectionCompleted: boolean;
  canRestart: boolean;
  completedCount: number;
  initialCount: number;
  items: DeliveryItem[];
  previous: {
    id: string;
    itemId: string;
  } | null;
};

type DateDraft = {
  itemId: string;
  version: number;
  value: string;
};

type DeliveryAction = "answer" | "previous" | "finish";

function DeliveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const runIds = searchParams.get("runIds") ?? searchParams.get("runId") ?? "";
  const categoryIds = searchParams.get("categoryIds");

  const contextParams = new URLSearchParams();

  if (runIds) contextParams.set("runIds", runIds);
  if (categoryIds !== null) contextParams.set("categoryIds", categoryIds);

  const context = runIds ? contextParams.toString() : "";

  const [snapshot, setSnapshot] = useState<DeliverySnapshot | null>(null);
  const [draft, setDraft] = useState<DateDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const snapshotRef = useRef<DeliverySnapshot | null>(null);
  const draftRef = useRef<DateDraft | null>(null);
  const activeItemRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const savingRef = useRef(false);
  const requestIdRef = useRef(0);
  const contextRef = useRef(context);

  const setLocalDraft = useCallback((value: DateDraft | null) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  const applySnapshot = useCallback(
    (data: DeliverySnapshot) => {
      const preferred = data.items.find(
        (item) => item.id === activeItemRef.current,
      );

      const orderedItems = preferred
        ? [preferred, ...data.items.filter((item) => item.id !== preferred.id)]
        : data.items;

      const next = { ...data, items: orderedItems };
      const current = orderedItems[0];
      const localDraft = draftRef.current;

      activeItemRef.current = current?.id ?? null;
      snapshotRef.current = next;
      setSnapshot(next);

      if (
        localDraft &&
        (!current ||
          localDraft.itemId !== current.id ||
          localDraft.version !== current.version)
      ) {
        setLocalDraft(null);
      }
    },
    [setLocalDraft],
  );

  const loadSnapshot = useCallback(
    async (force = false): Promise<boolean> => {
      if (!context || (!force && savingRef.current)) return false;

      const requestId = ++requestIdRef.current;
      const requestContext = context;

      try {
        const response = await fetch(`/api/delivery-selection?${context}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "De leveringscheck kon niet geladen worden.",
          );
        }

        if (
          !data.snapshot ||
          !Array.isArray(data.snapshot.items) ||
          !Array.isArray(data.snapshot.categoryIds)
        ) {
          throw new Error("Ongeldige controlegegevens ontvangen.");
        }

        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current ||
          requestContext !== contextRef.current
        ) {
          return false;
        }

        applySnapshot(data.snapshot);
        setError("");
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
              : "De leveringscheck kon niet geladen worden.",
          );
          setLoading(false);
        }

        return false;
      }
    },
    [context, applySnapshot],
  );

  useLayoutEffect(() => {
    contextRef.current = context;
    mountedRef.current = true;
    savingRef.current = false;
    snapshotRef.current = null;
    activeItemRef.current = null;

    const frame = window.requestAnimationFrame(() => {
      setSnapshot(null);
      setLocalDraft(null);
      setSaving(false);
      setError("");
      setLoading(Boolean(context));

      if (context) void loadSnapshot();
    });

    const refresh = () => {
      if (document.visibilityState === "visible") void loadSnapshot();
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
  }, [context, loadSnapshot, setLocalDraft]);

  async function performAction(
    action: DeliveryAction,
    expiryDate: string | null = null,
  ) {
    const currentSnapshot = snapshotRef.current;
    const currentItem = currentSnapshot?.items[0];

    if (!currentSnapshot || savingRef.current) return;
    if (action === "answer" && !currentItem) return;
    if (action === "previous" && !currentSnapshot.previous) return;

    const requestContext = context;

    savingRef.current = true;
    requestIdRef.current += 1;
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/delivery-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          runIds: currentSnapshot.runIds,
          categoryIds: currentSnapshot.categoryIds,
          version: currentSnapshot.version,
          itemId: currentItem?.id,
          itemVersion: currentItem?.version,
          expiryDate,
          historyId: currentSnapshot.previous?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "De stap kon niet opgeslagen worden.");
      }

      if (
        !data.snapshot ||
        !Array.isArray(data.snapshot.items) ||
        !Array.isArray(data.snapshot.categoryIds)
      ) {
        throw new Error("Ongeldige controlegegevens ontvangen.");
      }

      if (!mountedRef.current || requestContext !== contextRef.current) {
        return;
      }

      activeItemRef.current =
        action === "previous"
          ? (currentSnapshot.previous?.itemId ?? null)
          : null;

      setLocalDraft(null);
      applySnapshot(data.snapshot);

      if (
        action === "finish" &&
        data.snapshot.completedAt === null &&
        data.snapshot.selectionCompleted
      ) {
        router.push("/check/delivery/select");
      }
    } catch (caughtError) {
      if (mountedRef.current && requestContext === contextRef.current) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "De stap kon niet opgeslagen worden.";

        await loadSnapshot(true);

        if (mountedRef.current && requestContext === contextRef.current) {
          setError(message);
        }
      }
    } finally {
      if (requestContext === contextRef.current) {
        savingRef.current = false;
        if (mountedRef.current) setSaving(false);
      }
    }
  }

  if (!context) return <CheckStates state="invalid" />;
  if (loading) return <CheckStates state="loading" />;

  if (!snapshot) {
    return (
      <CheckStates
        state="error"
        error={error || "De leveringscheck kon niet geladen worden."}
      />
    );
  }

  const currentItem = snapshot.items[0] ?? null;
  const completed = snapshot.completedAt !== null;
  const interactionBlocked = saving || Boolean(error);

  const deliveryDescription = snapshot.deliveries
    .map(
      (delivery) => `${delivery.name} (${formatDate(delivery.deliveryDate)})`,
    )
    .join(", ");

  const errorNotice = error ? (
    <div className={styles.checkError} role="alert">
      {error}
      <button
        type="button"
        className={styles.stateSecondaryButton}
        onClick={() => void loadSnapshot(true)}
        disabled={saving}
      >
        Opnieuw laden
      </button>
    </div>
  ) : null;

  if (completed || !currentItem) {
    return (
      <main className={styles.page}>
        <div className={styles.stateContainer}>
          <div className={styles.completedIcon}>
            <CheckCheck size={37} aria-hidden="true" />
          </div>

          <h1 className={styles.stateTitle}>
            {completed
              ? "Leveringscheck afgerond"
              : "Gekozen categorieën gecontroleerd"}
          </h1>

          <p className={styles.stateDescription}>{deliveryDescription}</p>

          <p className={styles.stateDescription}>
            {snapshot.categoryNames.join(" · ")}
          </p>

          <p className={styles.stateDescription}>
            {completed
              ? "Deze leveringen zijn afgewerkt. Voor deze leveringsdatums volgt geen herinnering meer."
              : "Er zijn geen resterende producten binnen jouw selectie. Rond de selectie af. Categorieën met nog openstaande producten blijven beschikbaar in de leveringscheck."}
          </p>

          {errorNotice}

          <div className={styles.stateActions}>
            {!completed && (
              <button
                type="button"
                className={styles.statePrimaryButton}
                onClick={() => void performAction("finish")}
                disabled={interactionBlocked}
              >
                {saving ? "Opslaan…" : "Selectie afronden"}
              </button>
            )}

            {snapshot.previous && (
              <button
                type="button"
                className={styles.stateSecondaryButton}
                onClick={() => void performAction("previous")}
                disabled={interactionBlocked}
              >
                Vorig antwoord herstellen
              </button>
            )}

            <Link
              href="/check/delivery/select"
              className={styles.stateSecondaryButton}
            >
              {completed
                ? "Leveringschecks bekijken"
                : "Andere categorieën kiezen"}
            </Link>

            <Link
              href="/check?type=stock"
              className={styles.stateSecondaryButton}
            >
              Terug naar Stockcheck
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const showDateInput =
    draft !== null &&
    draft.itemId === currentItem.id &&
    draft.version === currentItem.version;

  const nextExpiryDate = showDateInput && draft ? draft.value : "";
  const canGoBack = showDateInput || snapshot.previous !== null;

  const progressPercent =
    snapshot.initialCount > 0
      ? Math.min(100, (snapshot.completedCount / snapshot.initialCount) * 100)
      : 0;

  function openDate() {
    if (interactionBlocked || !currentItem) return;

    setLocalDraft({
      itemId: currentItem.id,
      version: currentItem.version,
      value: "",
    });
  }

  function changeDate(value: string) {
    if (interactionBlocked || !currentItem) return;

    setLocalDraft({
      itemId: currentItem.id,
      version: currentItem.version,
      value,
    });
  }

  function saveDate() {
    const currentSnapshot = snapshotRef.current;

    if (
      !currentSnapshot ||
      !nextExpiryDate ||
      nextExpiryDate < currentSnapshot.today
    ) {
      return;
    }

    void performAction("answer", nextExpiryDate);
  }

  function noStock() {
    void performAction("answer", null);
  }

  function goBack() {
    if (showDateInput) {
      setLocalDraft(null);
    } else {
      void performAction("previous");
    }
  }

  const returnParams = new URLSearchParams({
    runIds: snapshot.runIds.join(","),
    categoryIds: snapshot.categoryIds.join(","),
  });

  const deliveryCount = snapshot.deliveries.length;
  const categoryCount = snapshot.categoryNames.length;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <CheckHeader
          title={snapshot.name}
          type="stock"
          categoryName={
            `${deliveryCount} ${deliveryCount === 1 ? "levering" : "leveringen"} · ` +
            `${categoryCount} ${categoryCount === 1 ? "categorie" : "categorieën"}`
          }
          remainingCount={snapshot.items.length}
          completedCount={snapshot.completedCount}
          initialCount={snapshot.initialCount}
          progressPercent={progressPercent}
          saving={saving}
          onChangeCategory={() => router.push("/check/delivery/select")}
        />

        <div className={styles.checkBody}>
          <ProductCard
            key={currentItem.id}
            item={currentItem}
            type="stock"
            missedCheck={false}
            editReturnUrl={`/check/delivery?${returnParams.toString()}`}
            swipeOffset={0}
          >
            {errorNotice}

            <CheckQuestion
              type="stock"
              dailyStep="new-stock"
              expiryDate={currentItem.expiry_date}
              stickered={currentItem.stickered}
              isPickupQuestion={false}
              showDateInput={showDateInput}
              nextExpiryDate={nextExpiryDate}
              todayString={snapshot.today}
              saving={interactionBlocked}
              onDateChange={changeDate}
            />
          </ProductCard>
        </div>

        <CheckActions
          type="stock"
          isEvening={false}
          isStickerQuestion={false}
          showDateInput={showDateInput}
          nextExpiryDate={nextExpiryDate}
          todayString={snapshot.today}
          saving={interactionBlocked}
          canGoBack={canGoBack}
          onYes={openDate}
          onNo={noStock}
          onSaveDate={saveDate}
          onEveningNext={noStock}
          onBack={goBack}
        />
      </div>
    </main>
  );
}

export default function DeliveryCheckPage() {
  return (
    <Suspense fallback={<CheckStates state="loading" />}>
      <DeliveryContent />
    </Suspense>
  );
}
