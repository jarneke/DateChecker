"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Moon,
  Package,
  PackageCheck,
  Settings2,
  Tag,
  TriangleAlert,
} from "lucide-react";

import CheckTile from "@/components/home/CheckTile";
import HomeHeroGlass from "./HomeHeroGlass";
import type { CheckSnapshot } from "./check/hooks/useCheckWorkflow";
import type { CheckType } from "./check/types";
import styles from "./page.module.css";
import heroStyles from "./HomeHero.module.css";

type SettingsResponse = {
  monthCheckDaysBeforeEnd: number;
};

type HomeData = {
  state: CheckSnapshot;
  monthCheckDaysBeforeEnd: number;
};

type DeliveryResponse = {
  offers: {
    completed: boolean;
  }[];
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
  const [data, setData] = useState<HomeData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [greeting, setGreeting] = useState("Welkom");
  const [todayLabel, setTodayLabel] = useState("Vandaag");
  const [hasPendingDelivery, setHasPendingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    function updateClock() {
      const now = new Date();

      const hour = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Brussels",
          hour: "numeric",
          hourCycle: "h23",
        }).format(now),
      );

      setGreeting(
        hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond",
      );

      setTodayLabel(
        new Intl.DateTimeFormat("nl-BE", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Brussels",
        }).format(now),
      );
    }

    async function refresh() {
      updateClock();

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

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;

    async function refreshDeliveries() {
      if (busy || controller.signal.aborted) return;
      busy = true;

      try {
        const response = await fetch("/api/delivery-checks", {
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await readResponse<DeliveryResponse>(response);

        if (!Array.isArray(result.offers)) {
          throw new Error("Ongeldige leveringsgegevens ontvangen.");
        }

        if (!controller.signal.aborted) {
          setHasPendingDelivery(
            result.offers.some((offer) => !offer.completed),
          );
          setDeliveryError(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          setDeliveryError(true);
        }
      } finally {
        busy = false;
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshDeliveries();
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
        <HomeHeroGlass>
          <p id="today-overview-title" className={heroStyles.greeting}>
            {greeting}
          </p>

          <div className={heroStyles.date}>
            {state && !loadError ? formatToday(state.date) : todayLabel}
          </div>

          <nav
            className={heroStyles.actions}
            aria-label="Leveringscheck en handleiding"
          >
            {(hasPendingDelivery || deliveryError) && (
              <Link
                href="/check/delivery/select"
                className={heroStyles.delivery}
                prefetch={false}
              >
                <Bell size={16} aria-hidden="true" />
                <span>
                  {deliveryError
                    ? "Leveringen bekijken"
                    : "Leveringscheck starten"}
                </span>
              </Link>
            )}

            <Link href="/handleiding" className={heroStyles.guide}>
              <BookOpen size={16} aria-hidden="true" />
              <span>Hoe werkt DateCheck?</span>
            </Link>
          </nav>

          {deliveryError && (
            <p className={heroStyles.error} role="alert">
              De leveringsstatus kon niet geladen worden. We proberen
              automatisch opnieuw.
            </p>
          )}
        </HomeHeroGlass>

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
              title="Vooruit ophalen"
              description="Haal op de vervaldag alle resterende exemplaren op, ook zonder sticker."
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
