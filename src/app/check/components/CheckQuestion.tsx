"use client";

import { useEffect, useRef } from "react";
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

  const dateInputRef = useRef<HTMLInputElement>(null);
  const datePickerOpened = useRef(false);

  useEffect(() => {
    if (!showDateInput) {
      datePickerOpened.current = false;
      return;
    }

    if (saving || datePickerOpened.current) return;

    const input = dateInputRef.current;
    if (!input) return;

    datePickerOpened.current = true;
    input.focus();

    try {
      input.showPicker?.();
    } catch {
      // Als de browser automatisch openen blokkeert, blijft het veld gefocust.
    }
  }, [showDateInput, saving]);

  if (isEvening) {
    return (
      <section className={styles.questionSection}>
        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Verwijder de gestickerde producten</h3>
        </div>

        <p className={styles.questionDescription}>
          Verwijder de resterende exemplaren die vandaag een sticker kregen.
        </p>
      </section>
    );
  }

  if (isDaily && dailyStep === "sticker") {
    return (
      <section className={styles.questionSection}>
        <span className={styles.stepBadge}>Stap 1 van 2</span>

        <div className={styles.questionHeading}>
          <Tag size={20} aria-hidden="true" />
          <h3>Zijn er producten om te stickeren?</h3>
        </div>

        <p className={styles.questionDescription}>
          Zoek de exemplaren met vervaldatum{" "}
          <strong className={styles.highlightDate}>
            {formatDate(expiryDate)}
          </strong>
          . Geef de aanwezige exemplaren een sticker.
        </p>

        <p className={styles.questionPrompt}>
          Heb je minstens één exemplaar gestickerd?
        </p>
      </section>
    );
  }

  if (showDateInput) {
    return (
      <section className={styles.questionSection}>
        <div className={styles.questionHeading}>
          <CalendarDays size={20} aria-hidden="true" />
          <h3>Wat is de eerstvolgende vervaldatum?</h3>
        </div>

        <p className={styles.questionDescription}>
          {isDaily
            ? "Vul de vroegste vervaldatum in van de exemplaren die later vervallen dan vandaag."
            : "Vul de vroegste vervaldatum van de aanwezige verkoopbare voorraad in."}
        </p>

        <div className={styles.dateField}>
          <label htmlFor="next-expiry-date">Eerstvolgende vervaldatum</label>

          <input
            ref={dateInputRef}
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

  if (isDaily) {
    return (
      <section className={styles.questionSection}>
        <span className={styles.stepBadge}>Stap 2 van 2</span>

        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Zijn er ook exemplaren die later vervallen?</h3>
        </div>

        <p className={styles.questionDescription}>
          Kijk of er nog exemplaren zijn met een vervaldatum na vandaag. De
          exemplaren die vandaag vervallen tellen hier niet mee.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.questionSection}>
      <div className={styles.questionHeading}>
        <PackageCheck size={20} aria-hidden="true" />

        <h3>
          {isStock
            ? "Is dit product opnieuw in stock?"
            : "Is er nog verkoopbare voorraad aanwezig?"}
        </h3>
      </div>

      <p className={styles.questionDescription}>
        {isStock
          ? "Controleer of dit product opnieuw in het rayon staat. Kies ja om de vroegste vervaldatum in te vullen."
          : "Controleer de aanwezige exemplaren. Kies ja als er nog verkoopbare voorraad is en vul de vroegste vervaldatum in. Kies nee als er geen verkoopbare voorraad meer is."}
      </p>
    </section>
  );
}
