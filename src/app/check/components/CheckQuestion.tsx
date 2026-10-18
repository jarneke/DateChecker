"use client";

import { CalendarDays, PackageCheck, Tag } from "lucide-react";

import type { CheckType, DailyStep } from "../types";

import { formatDate } from "../utils";
import styles from "../page.module.css";

type CheckQuestionProps = {
  type: CheckType;
  dailyStep: DailyStep;
  expiryDate: string | null;
  showDateInput: boolean;
  nextExpiryDate: string;
  todayString: string;
  saving: boolean;
  onDateChange: (date: string) => void;
};

export default function CheckQuestion({
  type,
  dailyStep,
  expiryDate,
  showDateInput,
  nextExpiryDate,
  todayString,
  saving,
  onDateChange,
}: CheckQuestionProps) {
  const isDaily = type === "sticker";
  const isEvening = type === "evening";
  const isStock = type === "stock";

  if (isEvening) {
    return (
      <section className={styles.questionSection}>
        <div className={styles.questionHeading}>
          <PackageCheck size={20} />
          <h3>Controleer het product</h3>
        </div>

        <p className={styles.questionDescription}>
          Haal de gestickerde producten die hiervoor in aanmerking komen uit de
          winkel.
        </p>
      </section>
    );
  }

  if (isDaily && dailyStep === "sticker") {
    return (
      <section className={styles.questionSection}>
        <span className={styles.stepBadge}>Stap 1 van 2</span>

        <div className={styles.questionHeading}>
          <Tag size={20} />
          <h3>Controleer en sticker</h3>
        </div>

        <p className={styles.questionDescription}>
          Zoek dit product in het rayon. Controleer de producten met vervaldatum{" "}
          <strong className={styles.highlightDate}>
            {formatDate(expiryDate)}
          </strong>{" "}
          en geef deze een sticker.
        </p>

        <p className={styles.questionPrompt}>
          Heb je een sticker moeten plakken?
        </p>
      </section>
    );
  }

  if (showDateInput) {
    return (
      <section className={styles.questionSection}>
        <div className={styles.questionHeading}>
          <CalendarDays size={20} />
          <h3>Nieuwe vervaldatum</h3>
        </div>

        <p className={styles.questionDescription}>
          Vul de eerstvolgende vervaldatum van de nieuwe stock in.
        </p>

        <div className={styles.dateField}>
          <label htmlFor="next-expiry-date">Eerstvolgende vervaldatum</label>

          <input
            id="next-expiry-date"
            type="date"
            min={todayString}
            value={nextExpiryDate}
            onChange={(event) => onDateChange(event.target.value)}
            disabled={saving}
            className={styles.dateInput}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.questionSection}>
      {isDaily && <span className={styles.stepBadge}>Stap 2 van 2</span>}

      <div className={styles.questionHeading}>
        <PackageCheck size={20} />

        <h3>
          {isStock
            ? "Is dit product opnieuw in stock?"
            : isDaily
              ? "Nieuwe stock"
              : "Controleer de stock"}
        </h3>
      </div>

      <p className={styles.questionDescription}>
        {isStock
          ? "Controleer of dit product opnieuw geleverd is."
          : "Is er nieuwe stock aanwezig met een latere vervaldatum?"}
      </p>
    </section>
  );
}
