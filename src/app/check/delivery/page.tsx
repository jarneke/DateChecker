"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
  id: string;
  name: string;
  today: string;
  deliveryDate: string;
  categoryNames: string[];
  version: number;
  completedAt: string | null;
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

type DeliveryAction = "answer" | "previous" | "finish" | "restart";

function DeliveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");

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
  const contextRef = useRef(runId);

  contextRef.current = runId;

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
      if (!runId || (!force && savingRef.current)) return false;

      const requestId = ++requestIdRef.current;
      const requestContext = runId;

      try {
        const response = await fetch(
          `/api/delivery-checks?runId=${encodeURIComponent(runId)}`,
          { cache: "no-store" },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "De leveringscheck kon niet geladen worden.",
          );
        }

        if (!data.snapshot || !Array.isArray(data.snapshot.items)) {
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
    [runId, applySnapshot],
  );

  useEffect(() => {
    mountedRef.current = true;
    savingRef.current = false;
    snapshotRef.current = null;
    activeItemRef.current = null;
    setSnapshot(null);
    setLocalDraft(null);
    setSaving(false);
    setError("");
    setLoading(Boolean(runId));

    if (runId) {
      void loadSnapshot();
    }

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
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [runId, loadSnapshot, setLocalDraft]);

  async function performAction(
    action: DeliveryAction,
    expiryDate: string | null = null,
  ) {
    const currentSnapshot = snapshotRef.current;
    const currentItem = currentSnapshot?.items[0];

    if (!currentSnapshot || savingRef.current) return;
    if (action === "answer" && !currentItem) return;
    if (action === "previous" && !currentSnapshot.previous) return;

    const requestContext = runId;

    savingRef.current = true;
    requestIdRef.current += 1;
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/delivery-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          runId: currentSnapshot.id,
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

      if (!mountedRef.current || requestContext !== contextRef.current) {
        return;
      }

      activeItemRef.current =
        action === "previous"
          ? (currentSnapshot.previous?.itemId ?? null)
          : null;

      setLocalDraft(null);
      applySnapshot(data.snapshot);
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

        if (mountedRef.current) {
          setSaving(false);
        }
      }
    }
  }

  if (!runId) {
    return <CheckStates state="invalid" />;
  }

  if (loading) {
    return <CheckStates state="loading" />;
  }

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
              : "Geen producten meer te controleren"}
          </h1>

          <p className={styles.stateDescription}>
            {snapshot.name} · levering van {formatDate(snapshot.deliveryDate)}
          </p>

          <p className={styles.stateDescription}>
            {completed
              ? "Deze levering is afgevinkt. Er verschijnt morgen geen herinnering meer voor deze leveringsdatum."
              : "Er zijn geen resterende producten zonder geregistreerde voorraad. Bevestig dit om de levering af te vinken."}
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
                {saving ? "Opslaan…" : "Leveringscheck afronden"}
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

            {completed && snapshot.canRestart && (
              <button
                type="button"
                className={styles.stateSecondaryButton}
                onClick={() => void performAction("restart")}
                disabled={interactionBlocked}
              >
                Opnieuw controleren
              </button>
            )}

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
    if (!nextExpiryDate || nextExpiryDate < snapshot!.today) return;
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

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <CheckHeader
          title={snapshot.name}
          type="stock"
          categoryName={`Levering ${formatDate(snapshot.deliveryDate)}`}
          remainingCount={snapshot.items.length}
          completedCount={snapshot.completedCount}
          initialCount={snapshot.initialCount}
          progressPercent={progressPercent}
          saving={saving}
          onChangeCategory={() => router.push("/check?type=stock")}
        />

        <div className={styles.checkBody}>
          <ProductCard
            key={currentItem.id}
            item={currentItem}
            type="stock"
            missedCheck={false}
            editReturnUrl={`/check/delivery?runId=${encodeURIComponent(runId)}`}
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
