"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Layers3,
  LoaderCircle,
  RotateCcw,
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
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const restartingRef = useRef(false);

  async function restartStockCheck() {
    if (restartingRef.current) return;

    restartingRef.current = true;
    setRestarting(true);
    setRestartError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const categoryId = params.get("categoryId") || "all";

      const response = await fetch("/api/checks/restart-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "De stockcheck kon niet opnieuw gestart worden.",
        );
      }

      window.location.reload();
    } catch (caughtError) {
      setRestartError(
        caughtError instanceof Error
          ? caughtError.message
          : "De stockcheck kon niet opnieuw gestart worden.",
      );

      restartingRef.current = false;
      setRestarting(false);
    }
  }

  if (state === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.stateContainer}>
          <div className={styles.stateIcon}>
            <LoaderCircle
              size={32}
              className={styles.stateSpinner}
              aria-hidden="true"
            />
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
            <CheckCheck size={37} aria-hidden="true" />
          </div>

          <span className={styles.completedLabel}>Controle afgerond</span>

          <h1 className={styles.stateTitle}>Alles gecontroleerd!</h1>

          <p className={styles.stateDescription}>
            {description ?? "Alle producten zijn gecontroleerd."}
          </p>

          {isStock && (
            <p className={styles.stateDescription}>
              Je kunt de producten zonder stock opnieuw controleren. De herstart
              geldt ook op andere toestellen.
            </p>
          )}

          {restartError && (
            <p className={styles.checkError} role="alert">
              {restartError}
            </p>
          )}

          <div className={styles.stateActions}>
            {isStock && (
              <button
                type="button"
                className={styles.statePrimaryButton}
                onClick={() => void restartStockCheck()}
                disabled={restarting}
              >
                {restarting ? (
                  <LoaderCircle
                    size={18}
                    className={styles.stateSpinner}
                    aria-hidden="true"
                  />
                ) : (
                  <RotateCcw size={18} aria-hidden="true" />
                )}

                {restarting
                  ? "Opnieuw starten..."
                  : "Stockcheck opnieuw starten"}
              </button>
            )}

            {isStock && onChangeCategory && (
              <button
                type="button"
                className={styles.stateSecondaryButton}
                onClick={onChangeCategory}
                disabled={restarting}
              >
                <Layers3 size={18} aria-hidden="true" />
                Andere categorie controleren
              </button>
            )}

            <Link
              href="/"
              className={
                isStock
                  ? styles.stateSecondaryButton
                  : styles.statePrimaryButton
              }
            >
              <Check size={19} aria-hidden="true" />
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
          <AlertCircle size={32} aria-hidden="true" />
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
            <ArrowLeft size={18} aria-hidden="true" />
            Terug naar home
          </Link>
        </div>
      </div>
    </main>
  );
}
