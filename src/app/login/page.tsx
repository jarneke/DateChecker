"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pin.length !== 6 || loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        setPin("");
        setError(
          response.status === 401
            ? "Onjuiste pincode. Probeer opnieuw."
            : "Inloggen mislukt. Probeer opnieuw.",
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Er kon geen verbinding gemaakt worden. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <ShieldCheck size={29} strokeWidth={2.1} />
          </div>

          <span className={styles.brandName}>
            Date<span>Check</span>
          </span>
        </div>

        <section className={styles.card}>
          <div className={styles.lockIcon}>
            <LockKeyhole size={28} />
          </div>

          <h1>Welkom terug</h1>

          <p className={styles.description}>
            Voer je 6-cijferige pincode in om verder te gaan.
          </p>

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className={styles.form}
          >
            <label htmlFor="pin" className={styles.inputLabel}>
              Pincode
            </label>

            <div className={styles.inputWrapper}>
              <input
                id="pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={6}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                autoFocus
                disabled={loading}
                className={styles.pinInput}
                placeholder="••••••"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
              />

              <button
                type="button"
                className={styles.visibilityButton}
                onClick={() => setShowPin((value) => !value)}
                aria-label={showPin ? "Pincode verbergen" : "Pincode tonen"}
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <p id="login-error" className={styles.error} role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={pin.length !== 6 || loading}
            >
              {loading ? (
                <>
                  <LoaderCircle size={20} className={styles.spinner} />
                  Inloggen...
                </>
              ) : (
                <>
                  Ontgrendelen
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </section>

        <p className={styles.footer}>
          <LockKeyhole size={14} />
          Beveiligde toegang
        </p>
      </div>
    </main>
  );
}
