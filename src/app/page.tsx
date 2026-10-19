"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  Moon,
  Package,
  Settings2,
  Tag,
  TriangleAlert,
} from "lucide-react";

import CheckTile from "@/components/home/CheckTile";
import type { CheckSnapshot } from "./check/hooks/useCheckWorkflow";

import styles from "./page.module.css";

type SettingsResponse = {
  monthCheckDaysBeforeEnd: number;
};

type HomeData = {
  state: CheckSnapshot;
  overdueCount: number;
  monthlyCount: number;
  monthCheckDaysBeforeEnd: number;
};

function formatToday(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function daysUntilMonthEnd(value: string) {
  const today = new Date(`${value}T00:00:00Z`);

  const lastDay = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
  );

  return Math.round((lastDay.getTime() - today.getTime()) / 86400000);
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
          fetch("/api/checks?type=overdue", options),
          fetch("/api/checks?type=monthly", options),
          fetch("/api/settings", options),
        ]);

        const [state, overdue, monthly, settings] = await Promise.all([
          readResponse<CheckSnapshot>(responses[0]),
          readResponse<CheckSnapshot>(responses[1]),
          readResponse<CheckSnapshot>(responses[2]),
          readResponse<SettingsResponse>(responses[3]),
        ]);

        if (controller.signal.aborted) return;

        setData({
          state,
          overdueCount: overdue.items.length,
          monthlyCount: monthly.items.length,
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

  const state = data?.state;
  const statusAvailable = data !== null && !loadError;

  const morningRemaining = state?.morningRemaining ?? 0;
  const eveningRemaining = state?.eveningRemaining ?? 0;
  const overdueRemaining = data?.overdueCount ?? 0;
  const monthlyRemaining = data?.monthlyCount ?? 0;

  const monthlyCheckActive =
    data !== null &&
    daysUntilMonthEnd(data.state.date) <= data.monthCheckDaysBeforeEnd;

  const statusNotice = loadError
    ? "Status niet beschikbaar"
    : "Status laden...";

  const morningNotice = !statusAvailable
    ? statusNotice
    : morningRemaining === 0
      ? "Geen openstaande controles"
      : undefined;

  const overdueNotice = !statusAvailable
    ? statusNotice
    : overdueRemaining === 0
      ? "Geen openstaande controles"
      : undefined;

  const eveningNotice = !statusAvailable
    ? statusNotice
    : morningRemaining > 0
      ? "Eerst de ochtendcontrole afronden"
      : eveningRemaining === 0
        ? "Geen openstaande controles"
        : undefined;

  const monthlyNotice = !statusAvailable
    ? statusNotice
    : !monthlyCheckActive
      ? data?.monthCheckDaysBeforeEnd === 0
        ? "Op de laatste dag van de maand"
        : `Vanaf ${data?.monthCheckDaysBeforeEnd} dagen vóór maandeinde`
      : monthlyRemaining === 0
        ? "Geen openstaande controles"
        : undefined;

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

        <section className={styles.hero}>
          <div className={styles.heroGlow} />

          <div className={styles.dateLabel}>
            <CalendarDays size={14} />
            <span>{state ? formatToday(state.date) : "Vandaag"}</span>
          </div>

          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>{greeting}</span>

            <h1>
              Klaar voor
              <br />
              <span>de controle?</span>
            </h1>

            <p>
              Houd de winkel overzichtelijk en controleer wat vandaag aandacht
              nodig heeft.
            </p>
          </div>

          <div className={styles.heroDecoration}>
            <div className={styles.heroRing} />
            <ClipboardCheck size={96} strokeWidth={0.8} />
          </div>
        </section>

        <section className={styles.section}>
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
              title="Ochtendcontrole"
              description="Controleer de vervaldatums en sticker producten."
              icon={Tag}
              tone="morning"
              href="/check?type=sticker"
              count={state?.morningRemaining}
              disabled={!statusAvailable || morningRemaining === 0}
              notice={morningNotice}
            />

            <CheckTile
              title="Over datum"
              description="Controleer producten met een verstreken vervaldatum."
              icon={TriangleAlert}
              tone="overdue"
              href="/check?type=overdue"
              count={data?.overdueCount}
              disabled={!statusAvailable || overdueRemaining === 0}
              notice={overdueNotice}
            />

            <CheckTile
              title="Avondcontrole"
              description="Haal de resterende gestickerde producten uit de winkel."
              icon={Moon}
              tone="evening"
              href="/check?type=evening"
              count={state?.eveningRemaining}
              disabled={
                !statusAvailable ||
                morningRemaining > 0 ||
                eveningRemaining === 0
              }
              notice={eveningNotice}
            />

            <CheckTile
              title="Maandelijkse controle"
              description="Controleer producten die deze maand vervallen."
              icon={CalendarDays}
              tone="monthly"
              href="/check?type=monthly"
              count={data?.monthlyCount}
              disabled={
                !statusAvailable ||
                !monthlyCheckActive ||
                monthlyRemaining === 0
              }
              notice={monthlyNotice}
            />

            <CheckTile
              title="Stockcheck"
              description="Controleer of producten opnieuw in stock zijn."
              icon={Package}
              tone="stock"
              href="/check?type=stock"
              wide
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
