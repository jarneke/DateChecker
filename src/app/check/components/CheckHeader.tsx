"use client";

import { Layers3 } from "lucide-react";

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
  progressLabel?: string;
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
  progressLabel = "Voortgang",
  saving,
  onChangeCategory,
}: CheckHeaderProps) {
  return (
    <section className={styles.header} aria-label={`${title}: voortgang`}>
      <div className={styles.headerTop}>
        <div className={styles.headerInfo}>
          <div className={styles.progressLabels}>
            <span>
              {categoryName ? `${categoryName} · ` : ""}
              {remainingCount} te controleren
            </span>

            {initialCount > 0 && (
              <span>
                <strong>{completedCount}</strong> van {initialCount} afgewerkt
              </span>
            )}
          </div>
        </div>

        {type === "stock" && (
          <button
            type="button"
            className={styles.categoryButton}
            onClick={onChangeCategory}
            disabled={saving}
          >
            <Layers3 size={17} aria-hidden="true" />
            <span>Categorie</span>
          </button>
        )}
      </div>

      {initialCount > 0 && (
        <div className={styles.progressSection}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={0}
            aria-valuemax={initialCount}
            aria-valuenow={completedCount}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
