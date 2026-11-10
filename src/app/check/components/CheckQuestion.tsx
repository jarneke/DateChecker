"use client";

import { useContext, useEffect, useRef, type ReactNode } from "react";
import { CalendarDays, PackageCheck, Tag } from "lucide-react";

import type { CheckType, DailyStep } from "../types";
import { formatDate } from "../utils";
import { ProductSummaryContext } from "./ProductCard";
import styles from "../page.module.css";
import compact from "./ProductCard.module.css";

type CheckQuestionProps = {
  type: CheckType;
  dailyStep: DailyStep;
  expiryDate: string | null;
  stickered: boolean;
  isPickupQuestion: boolean;
  showDateInput: boolean;
  nextExpiryDate: string;
  todayString: string;
  saving: boolean;
  onDateChange: (date: string) => void;
};

type QuestionLayoutProps = {
  title: string;
  step?: string;
  icon: ReactNode;
  children?: ReactNode;
};

function QuestionLayout({ title, step, icon, children }: QuestionLayoutProps) {
  const productSummary = useContext(ProductSummaryContext);

  return (
    <section className={styles.questionSection}>
      <div className={compact.questionHeader}>
        <div className={styles.questionHeading}>
          {icon}
          <h3>{title}</h3>
        </div>

        {step && <span className={compact.step}>{step}</span>}
      </div>

      {productSummary}

      {children}
    </section>
  );
}

export default function CheckQuestion({
  type,
  dailyStep,
  expiryDate,
  stickered,
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
      <QuestionLayout
        title="Wat is de eerstvolgende vervaldatum?"
        step={
          isDaily
            ? "Stap 2 van 2"
            : isForwardPickup
              ? "Ronde 2 van 2 · Voorraad"
              : undefined
        }
        icon={<CalendarDays size={20} aria-hidden="true" />}
      >
        <p className={styles.questionDescription}>
          {isDaily
            ? "Kies een datum na vandaag. Tel exemplaren met een sticker voor vandaag niet mee."
            : isForwardPickup
              ? "Vul de vroegste datum na vandaag in van de overblijvende voorraad."
              : "Tel alleen verkoopbare voorraad mee."}
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
      </QuestionLayout>
    );
  }

  if (isPickupQuestion) {
    return (
      <QuestionLayout
        title="Verwijder de resterende gestickerde exemplaren"
        step={isForwardPickup ? "Ronde 1 van 2 · Ophalen" : undefined}
        icon={<PackageCheck size={20} aria-hidden="true" />}
      >
        <p className={styles.questionDescription}>
          {isForwardPickup ? (
            <>
              Haal de resterende exemplaren met een 50%-sticker en vervaldatum
              <strong className={styles.highlightDate}>
                {formatDate(expiryDate)}
              </strong>{" "}
              uit de voorraad.
            </>
          ) : (
            "Haal alle resterende exemplaren met een 30%-sticker uit de voorraad. De datum van de overige voorraad blijft behouden."
          )}
        </p>

        <p className={styles.questionPrompt}>
          Kies <strong>Opgehaald of verkocht</strong> zodra alle gestickerde
          exemplaren uit het rayon zijn.
        </p>

        {isForwardPickup && (
          <p className={styles.questionDescription}>
            Eerst alles ophalen. Daarna volgt de ronde om de overige voorraad
            bij te werken.
          </p>
        )}
      </QuestionLayout>
    );
  }

  if (isStickerRound && dailyStep === "sticker") {
    return (
      <QuestionLayout
        title={
          isDaily
            ? "Zijn er exemplaren die vandaag vervallen?"
            : "Heeft deze voorraad een 50%-sticker nodig?"
        }
        step={isDaily ? "Stap 1 van 2" : undefined}
        icon={<Tag size={20} aria-hidden="true" />}
      >
        <p className={styles.questionDescription}>
          Zoek de exemplaren met vervaldatum{" "}
          <strong className={styles.highlightDate}>
            {formatDate(expiryDate)}
          </strong>
          .
          {isDaily
            ? " Geef de aanwezige exemplaren een 30%-sticker."
            : " Weinig voorraad die snel verkoopt, hoeft misschien geen 50%-sticker."}
        </p>

        {type === "monthly" && stickered && (
          <p className={styles.questionDescription}>
            Er zijn al gestickerde exemplaren geregistreerd. Controleer of er
            nog bijkomende exemplaren gestickerd moeten worden.
          </p>
        )}

        <p className={styles.questionPrompt}>
          {isDaily
            ? "Gestickerd: stickers aangebracht. Niet aanwezig: geen exemplaren met deze datum."
            : "Gestickerd: nieuwe stickers aangebracht. Niet gestickerd: geen nieuwe stickers aangebracht."}
        </p>

        {type === "monthly" && (
          <p className={styles.questionDescription}>
            Eerdere stickers blijven geregistreerd. Pas een foute datum aan via
            het productmenu.
          </p>
        )}
      </QuestionLayout>
    );
  }

  if (isDaily) {
    return (
      <QuestionLayout
        title="Zijn er ook exemplaren die na vandaag vervallen?"
        step="Stap 2 van 2"
        icon={<PackageCheck size={20} aria-hidden="true" />}
      >
        <p className={styles.questionPrompt}>
          Gestickerde exemplaren blijven onthouden voor Dagelijks ophalen.
        </p>
      </QuestionLayout>
    );
  }

  if (isForwardPickup) {
    return (
      <QuestionLayout
        title="Is er nog voorraad die na vandaag vervalt?"
        step="Ronde 2 van 2 · Voorraad"
        icon={<PackageCheck size={20} aria-hidden="true" />}
      />
    );
  }

  return (
    <QuestionLayout
      title={
        isStock
          ? "Is dit product opnieuw in voorraad?"
          : "Is er nog verkoopbare voorraad?"
      }
      icon={<PackageCheck size={20} aria-hidden="true" />}
    >
      {!isStock && (
        <p className={styles.questionDescription}>
          Verwijder eerst de verlopen exemplaren.
        </p>
      )}

      {isStock && stickered && (
        <p className={styles.questionDescription}>
          Voorraad die klaarstaat om op te halen, telt niet mee.
        </p>
      )}
    </QuestionLayout>
  );
}
