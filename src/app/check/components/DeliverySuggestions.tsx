"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Truck } from "lucide-react";

import styles from "./DeliverySuggestions.module.css";

type DeliveryOffer = {
  completed: boolean;
};

export default function DeliverySuggestions() {
  const [offers, setOffers] = useState<DeliveryOffer[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    async function refresh() {
      if (busy || controller.signal.aborted) return;
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

        if (!Array.isArray(data.offers)) {
          throw new Error("Ongeldige leveringsgegevens ontvangen.");
        }

        if (!controller.signal.aborted) {
          setOffers(data.offers);
          setError(false);
        }
      } catch (caughtError) {
        if (!controller.signal.aborted) {
          console.error(caughtError);
          setError(true);
        }
      } finally {
        busy = false;
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
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  if (!error && (offers === null || offers.length === 0)) return null;

  const pendingCount = offers?.filter((offer) => !offer.completed).length ?? 0;

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <Truck size={21} aria-hidden="true" />

        <div>
          <h2>Leveringscheck</h2>
          <p>
            {error
              ? "De leveringsstatus kon niet geladen worden."
              : pendingCount > 0
                ? "Kies de leveringen en categorieën die je nu wilt nakijken."
                : "De leveringschecks zijn afgerond. Je kunt een nieuwe ronde starten."}
          </p>
        </div>
      </div>

      <Link
        href="/check/delivery/select"
        className={styles.button}
        style={{ textDecoration: "none" }}
        prefetch={false}
      >
        {pendingCount > 0 ? (
          <Bell size={17} aria-hidden="true" />
        ) : (
          <ArrowRight size={17} aria-hidden="true" />
        )}

        {pendingCount > 0
          ? "Leveringscheck starten"
          : "Leveringschecks bekijken"}
      </Link>
    </section>
  );
}
