"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  LoaderCircle,
  Moon,
  Package,
  PackageCheck,
  Settings2,
  Tag,
  TriangleAlert,
  Truck,
} from "lucide-react";

import CheckTile from "@/components/home/CheckTile";
import type { CheckSnapshot } from "./check/hooks/useCheckWorkflow";
import type { CheckType } from "./check/types";
import styles from "./page.module.css";

type SettingsResponse = {
  monthCheckDaysBeforeEnd: number;
};

type HomeData = {
  state: CheckSnapshot;
  monthCheckDaysBeforeEnd: number;
};

type DeliveryOffer = {
  deliveryId: string;
  deliveryDate: string;
  name: string;
  reminder: boolean;
  completed: boolean;
  categoryNames: string[];
};

type DeliveryResponse = {
  offers: DeliveryOffer[];
};

type DeliveryStartResponse = {
  snapshot: {
    runIds: string[];
  };
};

function formatToday(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Gegevens konden niet geladen worden.");
  }

  return data as T;
}

export default function HomePage() {
  const router = useRouter();

  const [data, setData] = useState<HomeData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [greeting, setGreeting] = useState("Welkom");

  const [deliveryOffers, setDeliveryOffers] = useState<DeliveryOffer[] | null>(
    null,
  );
  const [deliveryError, setDeliveryError] = useState("");
  const [startingDelivery, setStartingDelivery] = useState(false);

  const startingDeliveryRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    async function refresh() {
      if (busy || controller.signal.aborted) return;
      busy = true;

      try {
        const options = {
          cache: "no-store" as const,
          signal: controller.signal,
        };

        const responses = await Promise.all([
          fetch("/api/checks", options),
          fetch("/api/settings", options),
        ]);

        const [state, settings] = await Promise.all([
          readResponse<CheckSnapshot>(responses[0]),
          readResponse<SettingsResponse>(responses[1]),
        ]);

        if (controller.signal.aborted) return;

        setData({
          state,
          monthCheckDaysBeforeEnd: settings.monthCheckDaysBeforeEnd,
        });

        const hour = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Brussels",
            hour: "numeric",
            hourCycle: "h23",
          }).format(new Date()),
        );

        setGreeting(
          hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond",
        );
        setLoadError(false);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setLoadError(true);
        }
      } finally {
        busy = false;
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    async function refreshDeliveries() {
      if (busy || controller.signal.aborted || startingDeliveryRef.current) {
        return;
      }

      busy = true;

      try {
        const response = await fetch("/api/delivery-checks", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await readResponse<DeliveryResponse>(response);

        if (!controller.signal.aborted && !startingDeliveryRef.current) {
          setDeliveryOffers(result.offers);
          setDeliveryError("");
        }
      } catch (error) {
        if (!controller.signal.aborted && !startingDeliveryRef.current) {
          setDeliveryError(
            error instanceof Error
              ? error.message
              : "De leveringen konden niet geladen worden.",
          );
        }
      } finally {
        busy = false;
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshDeliveries();
      }
    };

    void refreshDeliveries();

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

  const state = data?.state;
  const statusAvailable = data !== null && !loadError;

  const pendingDeliveries =
    deliveryOffers?.filter((offer) => !offer.completed) ?? [];

  const deliveriesCompleted =
    deliveryOffers !== null &&
    deliveryOffers.length > 0 &&
    pendingDeliveries.length === 0;

  async function startDeliveryCheck() {
    if (
      startingDeliveryRef.current ||
      pendingDeliveries.length === 0 ||
      deliveryError
    ) {
      return;
    }

    startingDeliveryRef.current = true;
    setStartingDelivery(true);
    setDeliveryError("");

    try {
      const response = await fetch("/api/delivery-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          restartCompleted: false,
        }),
      });

      const result = await readResponse<DeliveryStartResponse>(response);

      router.push(
        `/check/delivery?runIds=${encodeURIComponent(
          result.snapshot.runIds.join(","),
        )}`,
      );
    } catch (error) {
      setDeliveryError(
        error instanceof Error
          ? error.message
          : "De leveringscheck kon niet gestart worden.",
      );
    } finally {
      startingDeliveryRef.current = false;
      setStartingDelivery(false);
    }
  }

  function count(type: CheckType) {
    return state?.remainingCounts?.[type] ?? 0;
  }

  function notice(type: CheckType) {
    if (!statusAvailable) {
      return loadError ? "Status niet beschikbaar" : "Status laden...";
    }

    return count(type) === 0 ? "Geen openstaande controles" : undefined;
  }

  function disabled(type: CheckType) {
    return !statusAvailable || count(type) === 0;
  }

  const aheadDescription = data
    ? data.monthCheckDaysBeforeEnd === 0
      ? "Sticker producten die vandaag vervallen."
      : `Sticker producten die tussen vandaag en ${data.monthCheckDaysBeforeEnd} dagen vooruit vervallen.`
    : "Sticker producten binnen de ingestelde periode.";

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandIcon}>
              <ClipboardCheck size={23} strokeWidth={2.2} />
            </span>
            <span>
              Date<span className={styles.brandAccent}>Check</span>
            </span>
          </Link>

          <Link
            href="/admin"
            className={styles.settingsButton}
            aria-label="Beheer openen"
          >
            <Settings2 size={21} />
          </Link>
        </header>

        <section className={styles.hero} aria-labelledby="today-overview-title">
          <div className={styles.heroTop}>
            <h1 id="today-overview-title">{greeting}</h1>

            <div className={styles.dateLabel}>
              <CalendarDays size={13} aria-hidden="true" />
              <span>{state ? formatToday(state.date) : "Vandaag"}</span>
            </div>
          </div>

          <div className={styles.heroDeliveries}>
            <div className={styles.deliveryHeading}>
              <Truck size={17} aria-hidden="true" />
              <h2>Leveringen nakijken</h2>
            </div>

            {deliveryError ? (
              <p className={styles.deliveryError} role="alert">
                {deliveryError} We proberen automatisch opnieuw.
              </p>
            ) : deliveryOffers === null ? (
              <p className={styles.heroStatus} role="status">
                Leveringen laden…
              </p>
            ) : pendingDeliveries.length > 0 ? (
              <div
                className={styles.deliveryList}
                aria-label="Openstaande leveringen"
              >
                {pendingDeliveries.map((delivery) => (
                  <span
                    key={`${delivery.deliveryId}:${delivery.deliveryDate}`}
                    className={`${styles.deliveryBadge} ${
                      delivery.reminder ? styles.deliveryReminder : ""
                    }`}
                    title={`Levering van ${formatToday(delivery.deliveryDate)}`}
                  >
                    {delivery.name}
                    <span>{delivery.reminder ? "gisteren" : "vandaag"}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.heroStatus}>
                {deliveriesCompleted
                  ? "De geplande leveringschecks zijn afgewerkt."
                  : "Geen openstaande leveringschecks."}
              </p>
            )}

            {pendingDeliveries.length > 0 && (
              <button
                type="button"
                className={styles.deliveryButton}
                onClick={() => void startDeliveryCheck()}
                disabled={startingDelivery || Boolean(deliveryError)}
              >
                {startingDelivery ? (
                  <LoaderCircle
                    size={16}
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={16} aria-hidden="true" />
                )}

                {startingDelivery
                  ? "Controle openen…"
                  : "Leveringscheck starten"}
              </button>
            )}
          </div>
        </section>

        <section id="controles" className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}>JOUW WERKOVERZICHT</span>
              <h2>Controles</h2>
            </div>
          </div>

          {loadError && (
            <p className={styles.error} role="alert">
              De gedeelde status kon niet geladen worden. De controles zijn
              tijdelijk niet beschikbaar. We proberen automatisch opnieuw.
            </p>
          )}

          <div className={styles.grid}>
            <CheckTile
              title="Dagelijks stickeren"
              description="Sticker de exemplaren voor vandaag en registreer de volgende voorraaddatum."
              icon={Tag}
              tone="morning"
              href="/check?type=sticker"
              count={state ? count("sticker") : undefined}
              disabled={disabled("sticker")}
              notice={notice("sticker")}
            />

            <CheckTile
              title="Vooruit stickeren"
              description={aheadDescription}
              icon={CalendarDays}
              tone="monthly"
              href="/check?type=monthly"
              count={state ? count("monthly") : undefined}
              disabled={disabled("monthly")}
              notice={notice("monthly")}
            />

            <CheckTile
              title="Dagelijks ophalen"
              description="Haal de resterende dagelijks gestickerde exemplaren uit de winkel."
              icon={Moon}
              tone="evening"
              href="/check?type=evening"
              count={state ? count("evening") : undefined}
              disabled={disabled("evening")}
              notice={notice("evening")}
            />

            <CheckTile
              title="Vooruit gestickerde producten ophalen"
              description="Haal vooruit gestickerde exemplaren op zodra hun vervaldag bereikt is."
              icon={PackageCheck}
              tone="evening"
              href="/check?type=monthly-pickup"
              count={state ? count("monthly-pickup") : undefined}
              disabled={disabled("monthly-pickup")}
              notice={notice("monthly-pickup")}
            />

            <CheckTile
              title="Over datum"
              description="Verwijder verlopen exemplaren en controleer de resterende voorraad."
              icon={TriangleAlert}
              tone="overdue"
              href="/check?type=overdue"
              count={state ? count("overdue") : undefined}
              disabled={disabled("overdue")}
              notice={notice("overdue")}
            />

            <CheckTile
              title="Stockcheck"
              description="Controleer of producten opnieuw in stock zijn."
              icon={Package}
              tone="stock"
              href="/check?type=stock"
              disabled={!statusAvailable}
            />
          </div>
        </section>

        <nav className={styles.quickLinks} aria-label="Snelle navigatie">
          <Link href="/stockchecker">
            <Package size={18} />
            Voorraad
          </Link>
          <Link href="/admin">
            <Settings2 size={18} />
            Beheer
          </Link>
        </nav>

        <footer className={styles.footer}>
          DateCheck <span>•</span> Voorraadbeheer
        </footer>
      </div>
    </main>
  );
}
