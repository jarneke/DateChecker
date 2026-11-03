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
  isPickupQuestion: boolean;
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
  isPickupQuestion,
  showDateInput,
  nextExpiryDate,
  todayString,
  saving,
  onDateChange,
}: CheckQuestionProps) {
  const isDaily = type === "sticker";
  const isStickerRound = isDaily || type === "monthly";
  const isForwardPickup = type === "monthly-pickup";
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
      // Het veld blijft beschikbaar wanneer automatisch openen geblokkeerd wordt.
    }
  }, [showDateInput, saving]);

  if (showDateInput) {
    return (
      <section className={styles.questionSection}>
        {isDaily && <span className={styles.stepBadge}>Stap 2 van 2</span>}

        <div className={styles.questionHeading}>
          <CalendarDays size={20} aria-hidden="true" />
          <h3>Wat is de eerstvolgende vervaldatum?</h3>
        </div>

        <p className={styles.questionDescription}>
          {isDaily
            ? "Vul de vroegste vervaldatum in van de exemplaren die na vandaag vervallen. De exemplaren die vandaag vervallen tellen hier niet mee."
            : isForwardPickup
              ? "Vul de vroegste vervaldatum van de overblijvende voorraad in. Exemplaren die vandaag of eerder vervallen moeten uit de winkel."
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

  if (isPickupQuestion) {
    return (
      <section className={styles.questionSection}>
        {isForwardPickup && (
          <span className={styles.stepBadge}>Stap 1 van 2</span>
        )}

        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Haal de gestickerde exemplaren op</h3>
        </div>

        <p className={styles.questionDescription}>
          Verwijder de resterende gestickerde exemplaren met vervaldatum{" "}
          <strong className={styles.highlightDate}>
            {formatDate(expiryDate)}
          </strong>
          .
        </p>

        <p className={styles.questionPrompt}>
          Klaar? Bevestig ook als deze exemplaren al verkocht zijn.
          {type === "evening" &&
            " De volgende voorraad­datum is al in de ochtendcontrole geregistreerd."}
        </p>
      </section>
    );
  }

  if (isStickerRound && dailyStep === "sticker") {
    return (
      <section className={styles.questionSection}>
        {isDaily && <span className={styles.stepBadge}>Stap 1 van 2</span>}

        <div className={styles.questionHeading}>
          <Tag size={20} aria-hidden="true" />
          <h3>Sticker de exemplaren met deze datum</h3>
        </div>

        <p className={styles.questionDescription}>
          Zoek de exemplaren met vervaldatum{" "}
          <strong className={styles.highlightDate}>
            {formatDate(expiryDate)}
          </strong>
          . Geef de aanwezige exemplaren een sticker.
        </p>

        <p className={styles.questionPrompt}>
          Kies Gestickerd als je minstens één exemplaar gestickerd hebt. Zijn er
          geen exemplaren met deze datum? Kies Niet aanwezig.
        </p>
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
          Kijk naar de exemplaren met een vervaldatum na vandaag. Kies Wel
          voorraad om de vroegste datum in te vullen. Kies Geen voorraad als er
          alleen nog exemplaren voor vandaag zijn of als het product helemaal op
          is.
        </p>

        <p className={styles.questionPrompt}>
          Gestickerde exemplaren voor vandaag blijven apart onthouden voor
          Dagelijks ophalen.
        </p>
      </section>
    );
  }

  if (isForwardPickup) {
    return (
      <section className={styles.questionSection}>
        <span className={styles.stepBadge}>Stap 2 van 2</span>

        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Is er nog verkoopbare voorraad?</h3>
        </div>

        <p className={styles.questionDescription}>
          Kijk naar de voorraad die na vandaag vervalt. Kies Wel voorraad om de
          vroegste datum in te vullen, of Geen voorraad als alles weg is.
        </p>
      </section>
    );
  }

  if (isStickerRound) {
    return (
      <section className={styles.questionSection}>
        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Zijn er exemplaren met een andere datum?</h3>
        </div>

        <p className={styles.questionDescription}>
          Er zijn geen exemplaren met vervaldatum{" "}
          <strong className={styles.highlightDate}>
            {formatDate(expiryDate)}
          </strong>
          . Kies Wel voorraad om de juiste vroegste datum in te vullen, of Geen
          voorraad als het product niet meer aanwezig is.
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
          ? "Controleer of dit product opnieuw in het rayon staat. Kies Wel voorraad om de vroegste vervaldatum in te vullen."
          : "Verwijder de verlopen exemplaren. Kies Wel voorraad om de vroegste datum van de resterende verkoopbare voorraad in te vullen, of Geen voorraad als alles weg is."}
      </p>
    </section>
  );
}
