"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Layers3,
  LoaderCircle,
  PackageSearch,
  RotateCcw,
} from "lucide-react";

import type { SharedCategory } from "../hooks/useCheckWorkflow";
import DeliverySuggestions from "./DeliverySuggestions";

import styles from "../page.module.css";
import buttons from "./CategorySelector.module.css";

type CategorySelectorProps = {
  categories: SharedCategory[];
  loading: boolean;
  error: string | null;
};

type CategoryStyle = CSSProperties & {
  "--category-color": string;
};

function getCategoryStyle(color?: string | null): CategoryStyle {
  return {
    "--category-color":
      color && /^#[0-9a-f]{6}$/i.test(color) ? color : "var(--dc-accent)",
    textDecoration: "none",
  };
}

export default function CategorySelector({
  categories,
  loading,
  error,
}: CategorySelectorProps) {
  const searchParams = useSearchParams();
  const total = categories.reduce(
    (sum, category) => sum + category.remaining_count,
    0,
  );

  function getCategoryHref(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("categoryId", id);
    return `/check?${params.toString()}`;
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <DeliverySuggestions />

        <section className={styles.categoryCard}>
          <div className={styles.categoryIcon}>
            <PackageSearch size={30} aria-hidden="true" />
          </div>

          <span className={styles.categoryEyebrow}>Stockcontrole</span>

          <h2 className={styles.categoryTitle}>Wat wil je controleren?</h2>

          <p className={styles.categoryDescription}>
            Kies een categorie. De aantallen worden gedeeld met alle toestellen.
          </p>

          {loading && (
            <p className={buttons.loading} role="status">
              <LoaderCircle
                size={17}
                className={styles.stateSpinner}
                aria-hidden="true"
              />
              Categorieën en aantallen laden…
            </p>
          )}

          {!loading && !error && (
            <div
              className={buttons.grid}
              role="group"
              aria-label="Kies een categorie voor de stockcheck"
            >
              <Link
                href={getCategoryHref("all")}
                prefetch={false}
                scroll={false}
                className={`${buttons.category} ${buttons.all}`}
                style={getCategoryStyle()}
                aria-label={`Alle categorieën: ${total} producten te controleren`}
              >
                <span className={buttons.icon}>
                  <Layers3 size={21} aria-hidden="true" />
                </span>

                <span className={buttons.details}>
                  <span className={buttons.name}>Alle categorieën</span>
                  <span className={buttons.hint}>Alles in één ronde</span>
                </span>

                <span className={buttons.count}>{total}</span>

                <ArrowUpRight
                  size={18}
                  className={buttons.arrow}
                  aria-hidden="true"
                />
              </Link>

              {categories.map((category) => {
                const count = category.remaining_count;

                return (
                  <Link
                    key={category.id}
                    href={getCategoryHref(category.id)}
                    prefetch={false}
                    scroll={false}
                    className={buttons.category}
                    style={getCategoryStyle(category.color)}
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
                        : `${count} ${
                            count === 1 ? "product" : "producten"
                          } te controleren`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {error && (
            <div className={buttons.error} role="alert">
              <p>{error}</p>

              <button
                type="button"
                className={buttons.retry}
                onClick={() => window.location.reload()}
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
