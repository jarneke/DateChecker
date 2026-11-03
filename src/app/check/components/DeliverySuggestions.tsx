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
  const [startingKey, setStartingKey] = useState<string | null>(null);
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

  async function startDelivery(offer: DeliveryOffer) {
    if (startingRef.current) return;

    const key = `${offer.deliveryId}:${offer.deliveryDate}`;

    startingRef.current = true;
    setStartingKey(key);
    setError("");

    try {
      const response = await fetch("/api/delivery-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          deliveryId: offer.deliveryId,
          deliveryDate: offer.deliveryDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "De leveringscheck kon niet geopend worden.",
        );
      }

      router.push(
        `/check/delivery?runId=${encodeURIComponent(data.snapshot.id)}`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "De leveringscheck kon niet geopend worden.",
      );
    } finally {
      startingRef.current = false;
      setStartingKey(null);
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
          <h2>Leveringschecks</h2>
          <p>De leveringen van vandaag en openstaande checks van gisteren.</p>
        </div>
      </div>

      {loading && (
        <p className={styles.hint} role="status">
          Leveringen laden…
        </p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>

          <button
            type="button"
            className={styles.button}
            onClick={() => setReloadToken((value) => value + 1)}
            disabled={startingKey !== null}
          >
            Opnieuw laden
          </button>
        </div>
      )}

      <div className={styles.list}>
        {offers.map((offer) => {
          const key = `${offer.deliveryId}:${offer.deliveryDate}`;
          const starting = startingKey === key;

          return (
            <article
              key={key}
              className={`${styles.offer} ${
                offer.reminder ? styles.reminder : ""
              }`}
            >
              <span className={styles.label}>
                {offer.completed
                  ? "Afgerond"
                  : offer.reminder
                    ? "Herinnering · gisteren"
                    : "Levering vandaag"}
              </span>

              <h3>{offer.name}</h3>

              <p className={styles.date}>
                Levering van {formatDate(offer.deliveryDate)}
              </p>

              <p className={styles.hint}>{offer.categoryNames.join(", ")}</p>

              {!offer.completed && (
                <p className={styles.count}>
                  {offer.remainingCount} producten zonder geregistreerde
                  voorraad te controleren
                </p>
              )}

              <button
                type="button"
                className={styles.button}
                onClick={() => void startDelivery(offer)}
                disabled={startingKey !== null || Boolean(error)}
              >
                {starting ? (
                  <LoaderCircle
                    size={16}
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={16} aria-hidden="true" />
                )}

                {starting
                  ? "Openen…"
                  : offer.completed
                    ? "Bekijken"
                    : offer.runId
                      ? "Verder controleren"
                      : "Controle starten"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
