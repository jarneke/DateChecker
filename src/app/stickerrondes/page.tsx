"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  LockKeyhole,
  Moon,
  PackageCheck,
  Tag,
} from "lucide-react";

import CheckTileGlass from "@/components/home/CheckTileGlass";
import glass from "@/components/home/DateCheckGlass.module.css";
import styles from "./page.module.css";

const ROUNDS = [
  { type: "sticker", title: "Dagelijks stickeren", icon: Tag },
  { type: "monthly", title: "Vooruit stickeren", icon: CalendarDays },
  { type: "evening", title: "Dagelijks ophalen", icon: Moon },
  { type: "monthly-pickup", title: "Vooruit ophalen", icon: PackageCheck },
] as const;

type RoundType = (typeof ROUNDS)[number]["type"];
type Counts = Partial<Record<RoundType, number>>;

const brusselsHour = new Intl.DateTimeFormat("nl-BE", {
  timeZone: "Europe/Brussels",
  hour: "2-digit",
  hourCycle: "h23",
});

export default function StickerRoundsPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState(false);
  const [eveningOpen, setEveningOpen] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;

    async function loadCounts() {
      if (loading || controller.signal.aborted) return;
      loading = true;

      try {
        const response = await fetch("/api/checks", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Controles laden mislukt.");

        const data: { remainingCounts?: Counts } = await response.json();

        if (!data.remainingCounts) {
          throw new Error("De aantallen ontbreken.");
        }

        if (!controller.signal.aborted) {
          setCounts(data.remainingCounts);
          setError(false);
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        loading = false;
      }
    }

    function updateClock() {
      setEveningOpen(Number(brusselsHour.format(new Date())) >= 17);
    }

    function refresh() {
      updateClock();
      void loadCounts();
    }

    const initial = window.setTimeout(refresh, 0);
    const clock = window.setInterval(updateClock, 1000);
    const refreshTimer = window.setInterval(loadCounts, 30_000);
    window.addEventListener("focus", refresh);

    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(clock);
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refresh);
    };
  }, [retry]);

  const availableRounds = ROUNDS.flatMap((round) => {
    const count = counts?.[round.type];

    return typeof count === "number" && count > 0 ? [{ ...round, count }] : [];
  });

  return (
    <main className={`${styles.page} ${glass.page}`}>
      <header className={styles.header}>
        <p className={styles.brand}>DateCheck</p>
        <h1>Stickerrondes</h1>
        <p>Welke ronde wil je doen?</p>
      </header>

      {error ? (
        <div className={styles.status} role="alert">
          <p>De rondes konden niet geladen worden.</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              setCounts(null);
              setError(false);
              setRetry((value) => value + 1);
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      ) : counts === null ? (
        <p className={styles.status} role="status">
          Rondes laden…
        </p>
      ) : availableRounds.length === 0 ? (
        <div className={styles.status} role="status">
          <CheckCircle2 size={24} aria-hidden="true" />
          <p>Alle stickerrondes zijn klaar.</p>
        </div>
      ) : (
        <ul className={styles.list} aria-label="Stickerrondes met werk">
          {availableRounds.map(({ type, title, icon: Icon, count }) => {
            const evening = type === "evening" || type === "monthly-pickup";
            const locked = evening && !eveningOpen;

            const content = (
              <>
                <CheckTileGlass className={glass.marker} />
                <span className={styles.icon}>
                  {locked ? (
                    <LockKeyhole size={23} aria-hidden="true" />
                  ) : (
                    <Icon size={23} aria-hidden="true" />
                  )}
                </span>
                <span className={styles.label}>
                  <strong>{title}</strong>
                  <span>
                    {count} {count === 1 ? "product" : "producten"}
                  </span>
                  {locked && <span>Beschikbaar vanaf 17:00</span>}
                </span>
              </>
            );

            return (
              <li key={type}>
                {locked ? (
                  <div
                    className={`${styles.row} ${styles.locked} ${glass.surface} ${glass.round}`}
                  >
                    {content}
                  </div>
                ) : (
                  <Link
                    className={`${styles.row} ${glass.surface} ${glass.round}`}
                    data-round={type}
                    href={`/check?type=${type}`}
                  >
                    {content}
                    <ChevronRight size={22} aria-hidden="true" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
