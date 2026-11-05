"use client";

import { useEffect, useState, type FormEvent } from "react";
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

const STORAGE_KEY = "datecheck-login-attempts";
const MAX_ATTEMPTS = 10;
const COOLDOWN_MS = 60_000;

type LoginAttempts = {
  failed: number;
  retryAt: number;
};

const EMPTY_ATTEMPTS: LoginAttempts = { failed: 0, retryAt: 0 };

function readAttempts(fallback = EMPTY_ATTEMPTS): LoginAttempts {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_ATTEMPTS;

    const saved = JSON.parse(raw) as Partial<LoginAttempts> | null;
    const failed = saved?.failed;
    const retryAt = saved?.retryAt;

    if (
      typeof failed !== "number" ||
      !Number.isInteger(failed) ||
      failed < 1 ||
      failed > MAX_ATTEMPTS ||
      typeof retryAt !== "number" ||
      !Number.isSafeInteger(retryAt)
    ) {
      return EMPTY_ATTEMPTS;
    }

    if (failed === MAX_ATTEMPTS && retryAt <= Date.now()) {
      return EMPTY_ATTEMPTS;
    }

    return { failed, retryAt: failed === MAX_ATTEMPTS ? retryAt : 0 };
  } catch {
    return fallback;
  }
}

function writeAttempts(attempts: LoginAttempts) {
  try {
    if (attempts.failed === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
    }
  } catch {
    // De teller werkt in dit tabblad verder als browseropslag niet beschikbaar is.
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [attempts, setAttempts] = useState(EMPTY_ATTEMPTS);

  const waiting = attempts.retryAt > 0;
  const remaining = MAX_ATTEMPTS - attempts.failed;

  useEffect(() => {
    function syncAttempts() {
      setAttempts(readAttempts());
    }

    const timer = window.setTimeout(syncAttempts, 0);

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        syncAttempts();
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!attempts.retryAt) return;

    const timer = window.setTimeout(
      () => {
        setAttempts(readAttempts(EMPTY_ATTEMPTS));
      },
      Math.max(0, attempts.retryAt - Date.now()),
    );

    return () => window.clearTimeout(timer);
  }, [attempts.retryAt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pin.length !== 6 || loading) return;

    const fallback =
      attempts.retryAt && attempts.retryAt <= Date.now()
        ? EMPTY_ATTEMPTS
        : attempts;
    const current = readAttempts(fallback);

    setAttempts(current);
    if (current.retryAt > 0) return;

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

      if (response.status === 401) {
        const latest = readAttempts(current);
        const failed = Math.min(latest.failed + 1, MAX_ATTEMPTS);
        const nextAttempts = {
          failed,
          retryAt:
            latest.retryAt ||
            (failed === MAX_ATTEMPTS ? Date.now() + COOLDOWN_MS : 0),
        };

        writeAttempts(nextAttempts);
        setAttempts(nextAttempts);
        setPin("");
        setError(
          failed < MAX_ATTEMPTS ? "Onjuiste pincode. Probeer opnieuw." : "",
        );
        return;
      }

      if (!response.ok) {
        setPin("");
        setError("Inloggen mislukt. Probeer opnieuw.");
        return;
      }

      writeAttempts(EMPTY_ATTEMPTS);
      setAttempts(EMPTY_ATTEMPTS);
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
                aria-describedby={error ? "login-error" : "login-attempts"}
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

            <p
              id="login-attempts"
              className={waiting ? styles.error : styles.description}
              role="status"
            >
              {waiting
                ? "Geen pogingen meer. Je kunt binnen een minuut opnieuw proberen."
                : `Nog ${remaining} ${remaining === 1 ? "poging" : "pogingen"}.`}
            </p>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={pin.length !== 6 || loading || waiting}
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
