"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Truck } from "lucide-react";

import { formatDate } from "../utils";
import styles from "./DeliverySuggestions.module.css";

type DeliveryOffer = {
  deliveryId: string;
  deliveryDate: string;
  name: string;
  runId: string | null;
  reminder: boolean;
  completed: boolean;
  categoryNames: string[];
  remainingCount: number;
};

export default function DeliverySuggestions() {
  const router = useRouter();

  const [offers, setOffers] = useState<DeliveryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const startingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    async function refresh() {
      if (busy || startingRef.current || controller.signal.aborted) {
        return;
      }

      busy = true;

      try {
        const response = await fetch("/api/delivery-checks", {
          cache: "no-store",
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Leveringschecks konden niet geladen worden.",
          );
        }

        if (!controller.signal.aborted) {
          setOffers(data.offers);
          setError("");
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Leveringschecks konden niet geladen worden.",
          );
        }
      } finally {
        busy = false;

        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    void refresh();

    const interval = window.setInterval(refreshWhenVisible, 5000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [reloadToken]);

  const pendingOffers = offers.filter((offer) => !offer.completed);
  const completedOffers = offers.filter((offer) => offer.completed);
  const allCompleted = offers.length > 0 && pendingOffers.length === 0;

  const displayedOffers = allCompleted ? completedOffers : pendingOffers;

  const categoryNames = [
    ...new Set(displayedOffers.flatMap((offer) => offer.categoryNames)),
  ].sort((a, b) => a.localeCompare(b, "nl-BE"));

  async function startDeliveryCheck() {
    if (startingRef.current || displayedOffers.length === 0) return;

    startingRef.current = true;
    setStarting(true);
    setError("");

    try {
      const response = await fetch("/api/delivery-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          restartCompleted: allCompleted,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "De leveringscheck kon niet geopend worden.",
        );
      }

      router.push(
        `/check/delivery?runIds=${encodeURIComponent(
          data.snapshot.runIds.join(","),
        )}`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De leveringscheck kon niet geopend worden.",
      );
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  if (!loading && !error && offers.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <Truck size={21} aria-hidden="true" />

        <div>
          <h2>Leveringscheck</h2>
          <p>
            {loading
              ? "Leveringen laden…"
              : allCompleted
                ? "Alle leveringschecks voor vandaag zijn afgerond."
                : `${pendingOffers.length} ${
                    pendingOffers.length === 1 ? "levering" : "leveringen"
                  } · ${categoryNames.length} ${
                    categoryNames.length === 1 ? "categorie" : "categorieën"
                  } · één gezamenlijke ronde`}
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>

          <button
            type="button"
            className={styles.retry}
            onClick={() => setReloadToken((value) => value + 1)}
            disabled={starting}
          >
            Opnieuw laden
          </button>
        </div>
      )}

      {!loading && displayedOffers.length > 0 && (
        <>
          <div
            className={styles.deliveries}
            aria-label="Leveringen in deze controle"
          >
            {displayedOffers.map((offer) => (
              <span
                key={`${offer.deliveryId}:${offer.deliveryDate}`}
                className={`${styles.delivery} ${
                  offer.reminder ? styles.reminder : ""
                }`}
                title={`Levering van ${formatDate(offer.deliveryDate)}`}
              >
                {offer.name}
                <span className={styles.day}>
                  {offer.reminder ? "gisteren" : "vandaag"}
                </span>
              </span>
            ))}
          </div>

          <p className={styles.categories}>{categoryNames.join(" · ")}</p>

          {!allCompleted && completedOffers.length > 0 && (
            <p className={styles.hint}>
              {completedOffers.length} andere{" "}
              {completedOffers.length === 1 ? "levering is" : "leveringen zijn"}{" "}
              al afgewerkt.
            </p>
          )}

          <button
            type="button"
            className={styles.button}
            onClick={() => void startDeliveryCheck()}
            disabled={starting || Boolean(error)}
          >
            {starting ? (
              <LoaderCircle
                size={17}
                className={styles.spinner}
                aria-hidden="true"
              />
            ) : (
              <ArrowRight size={17} aria-hidden="true" />
            )}

            {starting
              ? "Controle openen…"
              : allCompleted
                ? "Opnieuw controleren"
                : "Deze controle starten"}
          </button>
        </>
      )}
    </section>
  );
}
