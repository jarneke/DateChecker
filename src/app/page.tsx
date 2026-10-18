"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  LayoutGrid,
  Moon,
  Package,
  Settings2,
  Tag,
  TriangleAlert,
} from "lucide-react";
import CheckTile from "@/components/home/CheckTile";
import styles from "./page.module.css";

type SettingsResponse = {
  monthCheckDaysBeforeEnd: number;
};

type Counts = {
  sticker: number | null;
  overdue: number | null;
  monthly: number | null;
};

function getBrusselsDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return new Date(
    Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day"))),
  );
}

function formatToday(date: Date) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function daysUntilMonthEnd(date: Date) {
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  );

  return Math.round((lastDay.getTime() - date.getTime()) / 86_400_000);
}

export default function HomePage() {
  const [counts, setCounts] = useState<Counts>({
    sticker: null,
    overdue: null,
    monthly: null,
  });

  const [monthCheckDaysBeforeEnd, setMonthCheckDaysBeforeEnd] = useState<
    number | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(getBrusselsDate());

    let cancelled = false;

    async function loadCounts() {
      try {
        const [stickerRes, overdueRes, monthlyRes, settingsRes] =
          await Promise.all([
            fetch("/api/items/due/count", { cache: "no-store" }),
            fetch("/api/items/overdue/count", { cache: "no-store" }),
            fetch("/api/items/monthly/count", { cache: "no-store" }),
            fetch("/api/settings", { cache: "no-store" }),
          ]);

        if (
          !stickerRes.ok ||
          !overdueRes.ok ||
          !monthlyRes.ok ||
          !settingsRes.ok
        ) {
          throw new Error("Gegevens konden niet geladen worden.");
        }

        const [stickerData, overdueData, monthlyData, settingsData] =
          await Promise.all([
            stickerRes.json(),
            overdueRes.json(),
            monthlyRes.json(),
            settingsRes.json() as Promise<SettingsResponse>,
          ]);

        if (cancelled) return;

        setCounts({
          sticker: stickerData.count ?? 0,
          overdue: overdueData.count ?? 0,
          monthly: monthlyData.count ?? 0,
        });

        setMonthCheckDaysBeforeEnd(settingsData.monthCheckDaysBeforeEnd);

        setLoadError(false);
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyCheckActive =
    today !== null &&
    monthCheckDaysBeforeEnd !== null &&
    daysUntilMonthEnd(today) <= monthCheckDaysBeforeEnd;

  const knownTotal =
    counts.sticker !== null &&
    counts.overdue !== null &&
    counts.monthly !== null
      ? counts.sticker + counts.overdue + counts.monthly
      : null;

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );

  const greeting =
    hour < 12 ? "Goedemorgen" : hour < 18 ? "Goedemiddag" : "Goedenavond";

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
            <span>{today ? formatToday(today) : "Vandaag"}</span>
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
              De aantallen konden niet geladen worden. Je kunt de controles nog
              steeds openen.
            </p>
          )}

          <div className={styles.grid}>
            <CheckTile
              title="Ochtendcontrole"
              description="Controleer de vervaldatums en sticker producten."
              icon={Tag}
              tone="morning"
              href="/check?type=sticker"
              count={counts.sticker}
            />

            <CheckTile
              title="Over datum"
              description="Bekijk producten waarvan de controle gemist is."
              icon={TriangleAlert}
              tone="overdue"
              href="/check?type=overdue"
              count={counts.overdue}
            />

            <CheckTile
              title="Avondcontrole"
              description="Haal gestickerde producten uit de winkel."
              icon={Moon}
              tone="evening"
              href="/check?type=evening"
            />

            <CheckTile
              title="Maandelijkse controle"
              description="Controleer producten die deze maand vervallen."
              icon={CalendarDays}
              tone="monthly"
              href="/check?type=monthly"
              count={counts.monthly}
              disabled={!monthlyCheckActive}
              notice={
                !monthlyCheckActive
                  ? monthCheckDaysBeforeEnd === null
                    ? "Controlevenster laden..."
                    : `Laatste ${monthCheckDaysBeforeEnd} dagen`
                  : undefined
              }
            />

            <CheckTile
              title="Stockcheck"
              description="Controleer nieuwe voorraad per categorie."
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
