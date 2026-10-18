"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Layers3,
  LoaderCircle,
} from "lucide-react";

import styles from "../page.module.css";

type CheckStatesProps = {
  state: "loading" | "error" | "invalid" | "completed";
  description?: string;
  error?: string | null;
  isStock?: boolean;
  onChangeCategory?: () => void;
};

export default function CheckStates({
  state,
  description,
  error,
  isStock = false,
  onChangeCategory,
}: CheckStatesProps) {
  if (state === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <LoaderCircle size={32} className={styles.stateSpinner} />
          </div>

          <h1 className={styles.stateTitle}>Producten laden</h1>

          <p className={styles.stateDescription}>
            Even geduld, we halen de producten op.
          </p>
        </div>
      </main>
    );
  }

  if (state === "completed") {
    return (
      <main className={styles.page}>
        <div className={styles.stateContainer}>
          <div className={styles.completedIcon}>
            <CheckCheck size={37} />
          </div>

          <span className={styles.completedLabel}>Controle afgerond</span>

          <h1 className={styles.stateTitle}>Alles gecontroleerd!</h1>

          <p className={styles.stateDescription}>
            {description ?? "Alle producten zijn gecontroleerd."}
          </p>

          <div className={styles.stateActions}>
            {isStock && onChangeCategory && (
              <button
                type="button"
                className={styles.stateSecondaryButton}
                onClick={onChangeCategory}
              >
                <Layers3 size={18} />
                Andere categorie controleren
              </button>
            )}

            <Link href="/" className={styles.statePrimaryButton}>
              <Check size={19} />
              Terug naar home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.stateContainer}>
        <div className={styles.errorStateIcon}>
          <AlertCircle size={32} />
        </div>

        <h1 className={styles.stateTitle}>
          {state === "invalid" ? "Ongeldige controle" : "Er ging iets mis"}
        </h1>

        <p className={styles.stateDescription}>
          {state === "invalid"
            ? "Deze controle bestaat niet."
            : (error ?? "De producten konden niet geladen worden.")}
        </p>

        <div className={styles.stateActions}>
          <Link href="/" className={styles.statePrimaryButton}>
            <ArrowLeft size={18} />
            Terug naar home
          </Link>
        </div>
      </div>
    </main>
  );
}
