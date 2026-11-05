"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, LoaderCircle, RotateCcw } from "lucide-react";

import styles from "./page.module.css";

type Category = {
  id: string;
  name: string;
};

type DeliveryOffer = {
  deliveryId: string;
  deliveryDate: string;
  name: string;
  reminder: boolean;
  completed: boolean;
  remainingCount: number;
  categories: Category[];
};

function offerKey(offer: DeliveryOffer) {
  return `${offer.deliveryId}:${offer.deliveryDate}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function DeliverySelectionPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<DeliveryOffer[]>([]);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [restartCompleted, setRestartCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const startingRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    async function refresh() {
      if (busy || controller.signal.aborted || startingRef.current) return;

      busy = true;
      const requestId = ++requestIdRef.current;

      try {
        const response = await fetch("/api/delivery-selection", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "De leveringen konden niet geladen worden.",
          );
        }

        if (!Array.isArray(data.offers)) {
          throw new Error("Ongeldige leveringsgegevens ontvangen.");
        }

        if (
          !controller.signal.aborted &&
          requestId === requestIdRef.current &&
          !startingRef.current
        ) {
          setOffers(data.offers);
          setError("");
        }
      } catch (caughtError) {
        if (
          !controller.signal.aborted &&
          requestId === requestIdRef.current &&
          !startingRef.current
        ) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "De leveringen konden niet geladen worden.",
          );
        }
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    void refresh();

    const interval = window.setInterval(refreshWhenVisible, 5000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      controller.abort();
      requestIdRef.current += 1;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [reloadToken]);

  const availableOffers = offers.filter(
    (offer) => offer.completed === restartCompleted,
  );

  const chosenOffers = availableOffers.filter((offer) =>
    selectedOffers.includes(offerKey(offer)),
  );

  const categories = [
    ...new Map(
      chosenOffers.flatMap((offer) =>
        offer.categories.map((category) => [category.id, category] as const),
      ),
    ).values(),
  ];

  const chosenCategoryIds = categories
    .filter((category) => selectedCategories.includes(category.id))
    .map((category) => category.id);

  const missingCategory = chosenOffers.some(
    (offer) =>
      !offer.categories.some((category) =>
        chosenCategoryIds.includes(category.id),
      ),
  );

  const canStart =
    !loading &&
    !starting &&
    !error &&
    chosenOffers.length > 0 &&
    chosenCategoryIds.length > 0 &&
    !missingCategory;

  function changeMode(value: boolean) {
    if (starting) return;
    setRestartCompleted(value);
    setSelectedOffers([]);
    setSelectedCategories([]);
  }

  function toggleOffer(offer: DeliveryOffer) {
    if (starting) return;

    const key = offerKey(offer);
    const selected = selectedOffers.includes(key);

    const nextKeys = selected
      ? selectedOffers.filter((value) => value !== key)
      : [...selectedOffers, key];

    setSelectedOffers(nextKeys);

    const nextAvailableIds = new Set(
      availableOffers
        .filter((entry) => nextKeys.includes(offerKey(entry)))
        .flatMap((entry) => entry.categories.map((category) => category.id)),
    );

    setSelectedCategories((current) => {
      const retained = current.filter((id) => nextAvailableIds.has(id));
      return selected
        ? retained
        : [
            ...new Set([
              ...retained,
              ...offer.categories.map((category) => category.id),
            ]),
          ];
    });
  }

  function toggleCategory(id: string) {
    if (starting) return;

    setSelectedCategories((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function startCheck() {
    if (!canStart || startingRef.current) return;

    startingRef.current = true;
    requestIdRef.current += 1;
    setStarting(true);
    setError("");

    try {
      const response = await fetch("/api/delivery-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          offers: chosenOffers.map((offer) => ({
            deliveryId: offer.deliveryId,
            deliveryDate: offer.deliveryDate,
          })),
          categoryIds: chosenCategoryIds,
          restartCompleted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "De controle kon niet gestart worden.");
      }

      if (
        !Array.isArray(data.snapshot?.runIds) ||
        !Array.isArray(data.snapshot?.categoryIds)
      ) {
        throw new Error("Ongeldige controlegegevens ontvangen.");
      }

      const params = new URLSearchParams({
        runIds: data.snapshot.runIds.join(","),
        categoryIds: data.snapshot.categoryIds.join(","),
      });

      router.push(`/check/delivery?${params.toString()}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De controle kon niet gestart worden.",
      );
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p>Kies welke leveringen en categorieën je nu wilt controleren.</p>
        </div>

        <div className={styles.tabs} aria-label="Soort leveringscheck">
          <button
            type="button"
            aria-pressed={!restartCompleted}
            onClick={() => changeMode(false)}
            disabled={starting}
          >
            Openstaande leveringen
          </button>
          <button
            type="button"
            aria-pressed={restartCompleted}
            onClick={() => changeMode(true)}
            disabled={starting}
          >
            Opnieuw controleren
          </button>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setReloadToken((value) => value + 1)}
              disabled={starting}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Opnieuw laden
            </button>
          </div>
        )}

        {loading ? (
          <p className={styles.status} role="status">
            <LoaderCircle
              size={18}
              className={styles.spinner}
              aria-hidden="true"
            />
            Leveringen laden…
          </p>
        ) : (
          <>
            <section className={styles.card} aria-labelledby="deliveries-title">
              <div className={styles.heading}>
                <span>1</span>
                <h2 id="deliveries-title">Kies je leveringen</h2>
              </div>

              {availableOffers.length === 0 ? (
                <p className={styles.hint}>
                  {restartCompleted
                    ? "Er zijn geen afgeronde leveringschecks om opnieuw te starten."
                    : "Er zijn geen openstaande leveringschecks."}
                </p>
              ) : (
                <div className={styles.options}>
                  {availableOffers.map((offer) => (
                    <label key={offerKey(offer)} className={styles.option}>
                      <input
                        type="checkbox"
                        checked={selectedOffers.includes(offerKey(offer))}
                        onChange={() => toggleOffer(offer)}
                        disabled={starting}
                      />

                      <span className={styles.details}>
                        <strong>{offer.name}</strong>
                        <span>
                          {formatDate(offer.deliveryDate)}
                          {offer.reminder && (
                            <span className={styles.reminder}>
                              <Bell size={12} aria-hidden="true" />
                              Herinnering
                            </span>
                          )}
                        </span>
                        <small>
                          {offer.categories
                            .map((category) => category.name)
                            .join(" · ")}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {restartCompleted && availableOffers.length > 0 && (
                <p className={styles.hint}>
                  Opnieuw starten opent een nieuwe ronde voor de gekozen
                  leveringen. Eerdere antwoorden blijven in de historie staan.
                </p>
              )}
            </section>

            {chosenOffers.length > 0 && (
              <section
                className={styles.card}
                aria-labelledby="categories-title"
              >
                <div className={styles.heading}>
                  <span>2</span>
                  <h2 id="categories-title">Kies je categorieën</h2>
                </div>

                <p className={styles.hint}>
                  Alleen deze categorieën komen in je ronde. Overlappende
                  producten krijg je één keer.
                </p>

                <div className={styles.tools}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCategories(
                        categories.map((category) => category.id),
                      )
                    }
                    disabled={starting}
                  >
                    Alles selecteren
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    disabled={starting}
                  >
                    Selectie wissen
                  </button>
                </div>

                <div className={styles.categories}>
                  {categories.map((category) => (
                    <label key={category.id} className={styles.option}>
                      <input
                        type="checkbox"
                        checked={chosenCategoryIds.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        disabled={starting}
                      />
                      <strong>{category.name}</strong>
                    </label>
                  ))}
                </div>

                {missingCategory && (
                  <p className={styles.hint}>
                    Kies voor iedere aangevinkte levering minstens één
                    categorie, of vink die levering uit.
                  </p>
                )}

                <p className={styles.hint}>
                  Niet-gekozen categorieën met resterende producten blijven
                  openstaan. Alleen producten zonder opgeslagen datum worden
                  gevraagd.
                </p>
              </section>
            )}

            <button
              type="button"
              className={styles.start}
              disabled={!canStart}
              onClick={() => void startCheck()}
            >
              {starting ? (
                <LoaderCircle
                  size={18}
                  className={styles.spinner}
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight size={18} aria-hidden="true" />
              )}
              {starting
                ? "Controle openen…"
                : `Controle starten${chosenCategoryIds.length > 0 ? ` · ${chosenCategoryIds.length} categorieën` : ""}`}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
