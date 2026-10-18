"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Layers3,
  LoaderCircle,
  PackageSearch,
  RotateCcw,
} from "lucide-react";

import type { Category, Item } from "../types";
import { getProgressKey, readProgress } from "../utils";

import styles from "../page.module.css";
import buttons from "./CategorySelector.module.css";

type ColoredCategory = Category & {
  color?: string | null;
};

type CategorySelectorProps = {
  categories: ColoredCategory[];
  categoryId: string;
  loading: boolean;
  error: string | null;
  onChange: (categoryId: string) => void;
};

type StockCounts = {
  all: number;
  categories: Record<string, number>;
};

type CategoryStyle = CSSProperties & {
  "--category-color": string;
};

function getCategoryStyle(color?: string | null): CategoryStyle {
  return {
    "--category-color":
      color && /^#[0-9a-f]{6}$/i.test(color) ? color : "var(--dc-accent)",
  };
}

export default function CategorySelector({
  categories,
  categoryId,
  loading,
  error,
  onChange,
}: CategorySelectorProps) {
  const [counts, setCounts] = useState<StockCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (loading) return;

    const controller = new AbortController();

    async function loadCounts() {
      setCountsLoading(true);
      setCountsError(null);

      try {
        const response = await fetch("/api/items/out-of-stock?categoryId=all", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Aantallen konden niet geladen worden.");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Ongeldige productgegevens ontvangen.");
        }

        const items = data as Item[];
        const categoryCounts: Record<string, number> = {};

        for (const category of categories) {
          const completed = new Set(
            readProgress(getProgressKey("stock", category.id)),
          );

          categoryCounts[category.id] = items.filter(
            (item) =>
              item.category_id === category.id && !completed.has(item.id),
          ).length;
        }

        const allCompleted = new Set(
          readProgress(getProgressKey("stock", "all")),
        );

        if (!controller.signal.aborted) {
          setCounts({
            all: items.filter((item) => !allCompleted.has(item.id)).length,
            categories: categoryCounts,
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error(err);
        setCounts(null);
        setCountsError("Aantallen konden niet geladen worden.");
      } finally {
        if (!controller.signal.aborted) {
          setCountsLoading(false);
        }
      }
    }

    void loadCounts();

    return () => {
      controller.abort();
    };
  }, [categories, loading, retry]);

  const busy = loading || countsLoading;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <Link
              href="/"
              className={styles.backButton}
              aria-label="Terug naar home"
            >
              <ArrowLeft size={21} aria-hidden="true" />
            </Link>

            <div className={styles.headerInfo}>
              <h1 className={styles.pageTitle}>Stockcheck</h1>

              <p className={styles.pageSubtitle}>
                Controleer de nieuwe levering
              </p>
            </div>
          </div>
        </header>

        <section className={styles.categoryCard}>
          <div className={styles.categoryIcon}>
            <PackageSearch size={30} aria-hidden="true" />
          </div>

          <span className={styles.categoryEyebrow}>Stockcontrole</span>

          <h2 className={styles.categoryTitle}>Wat wil je controleren?</h2>

          <p className={styles.categoryDescription}>
            Kies een categorie. Het getal toont hoeveel producten je nog moet
            controleren.
          </p>

          {busy && (
            <p className={buttons.loading} role="status">
              <LoaderCircle
                size={17}
                className={styles.stateSpinner}
                aria-hidden="true"
              />
              Categorieën en aantallen laden...
            </p>
          )}

          {!busy && counts && (
            <div
              className={buttons.grid}
              role="group"
              aria-label="Kies een categorie voor de stockcheck"
            >
              <button
                type="button"
                className={`${buttons.category} ${buttons.all}`}
                onClick={() => onChange("all")}
                aria-pressed={categoryId === "all"}
                aria-label={`Alle categorieën: ${counts.all} producten te controleren`}
              >
                <span className={buttons.icon}>
                  <Layers3 size={21} aria-hidden="true" />
                </span>

                <span className={buttons.details}>
                  <span className={buttons.name}>Alle categorieën</span>
                  <span className={buttons.hint}>Alles in één ronde</span>
                </span>

                <span className={buttons.count}>{counts.all}</span>

                <ArrowUpRight
                  size={18}
                  className={buttons.arrow}
                  aria-hidden="true"
                />
              </button>

              {categories.map((category) => {
                const count = counts.categories[category.id] ?? 0;

                return (
                  <button
                    key={category.id}
                    type="button"
                    className={buttons.category}
                    style={getCategoryStyle(category.color)}
                    onClick={() => onChange(category.id)}
                    aria-pressed={categoryId === category.id}
                    aria-label={`${category.name}: ${count} producten te controleren`}
                  >
                    <span className={buttons.categoryTop}>
                      <PackageSearch size={19} aria-hidden="true" />
                      <span className={buttons.count}>{count}</span>
                    </span>

                    <span className={buttons.name}>{category.name}</span>

                    <span className={buttons.hint}>
                      {count === 0
                        ? "Niets te controleren"
                        : `${count} ${count === 1 ? "product" : "producten"} te controleren`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <p className={styles.categoryError} role="alert">
              {error}
            </p>
          )}

          {countsError && (
            <div className={buttons.error} role="alert">
              <p>{countsError}</p>

              <button
                type="button"
                className={buttons.retry}
                onClick={() => setRetry((value) => value + 1)}
                disabled={busy}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Opnieuw proberen
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
