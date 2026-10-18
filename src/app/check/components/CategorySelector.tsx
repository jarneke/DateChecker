"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Layers3,
  LoaderCircle,
  PackageSearch,
  RotateCcw,
} from "lucide-react";

import type { SharedCategory } from "../hooks/useCheckWorkflow";

import styles from "../page.module.css";
import buttons from "./CategorySelector.module.css";

type CategorySelectorProps = {
  categories: SharedCategory[];
  categoryId: string;
  loading: boolean;
  error: string | null;
  onChange: (categoryId: string) => void;
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
  const total = categories.reduce(
    (sum, category) => sum + category.remaining_count,
    0,
  );

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
            Kies een categorie. De aantallen worden gedeeld met alle toestellen.
          </p>

          {loading && (
            <p className={buttons.loading} role="status">
              <LoaderCircle
                size={17}
                className={styles.stateSpinner}
                aria-hidden="true"
              />
              Categorieën en aantallen laden...
            </p>
          )}

          {!loading && !error && (
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
              </button>

              {categories.map((category) => {
                const count = category.remaining_count;

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
