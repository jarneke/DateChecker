"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Layers3,
  LoaderCircle,
  PackageSearch,
} from "lucide-react";

import type { Category } from "../types";
import styles from "../page.module.css";

type CategorySelectorProps = {
  categories: Category[];
  categoryId: string;
  loading: boolean;
  error: string | null;
  onChange: (categoryId: string) => void;
};

export default function CategorySelector({
  categories,
  categoryId,
  loading,
  error,
  onChange,
}: CategorySelectorProps) {
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
              <ArrowLeft size={21} />
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
            <PackageSearch size={30} />
          </div>

          <span className={styles.categoryEyebrow}>Stockcontrole</span>

          <h2 className={styles.categoryTitle}>
            Welke categorie wil je controleren?
          </h2>

          <p className={styles.categoryDescription}>
            Selecteer de categorie waarvan je de nieuwe levering wilt
            controleren.
          </p>

          <div className={styles.categoryField}>
            <label htmlFor="check-category">Categorie</label>

            <div className={styles.categorySelectWrapper}>
              <Layers3 size={19} className={styles.categorySelectIcon} />

              <select
                id="check-category"
                className={styles.categorySelect}
                value={categoryId}
                onChange={(event) => onChange(event.target.value)}
                disabled={loading}
              >
                <option value="">Selecteer een categorie</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <ChevronDown size={19} className={styles.categoryChevron} />
            </div>
          </div>

          {loading && (
            <p className={styles.categoryLoading}>
              <LoaderCircle size={17} className={styles.stateSpinner} />
              Categorieën laden...
            </p>
          )}

          {error && (
            <p className={styles.categoryError} role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
