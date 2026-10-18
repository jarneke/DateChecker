"use client";

import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";
import type { CheckType } from "../types";
import styles from "../page.module.css";

type CheckHeaderProps = {
  title: string;
  type: CheckType;
  categoryName?: string;
  remainingCount: number;
  completedCount: number;
  initialCount: number;
  progressPercent: number;
  saving: boolean;
  onChangeCategory: () => void;
};

export default function CheckHeader({
  title,
  type,
  categoryName,
  remainingCount,
  completedCount,
  initialCount,
  progressPercent,
  saving,
  onChangeCategory,
}: CheckHeaderProps) {
  return (
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
          <h1 className={styles.pageTitle}>{title}</h1>

          <p className={styles.pageSubtitle}>
            {categoryName ? `${categoryName} · ` : ""}
            {remainingCount} te controleren
          </p>
        </div>

        {type === "stock" && (
          <button
            type="button"
            className={styles.categoryButton}
            onClick={onChangeCategory}
            disabled={saving}
          >
            <Layers3 size={17} />
            <span>Categorie</span>
          </button>
        )}
      </div>

      {initialCount > 0 && (
        <div className={styles.progressSection}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Voortgang controle"
            aria-valuemin={0}
            aria-valuemax={initialCount}
            aria-valuenow={completedCount}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className={styles.progressLabels}>
            <span>Voortgang</span>
            <span>
              <strong>{completedCount}</strong> van {initialCount} afgewerkt
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
