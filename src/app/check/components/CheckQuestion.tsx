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
  stickered: boolean;
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
      <section className={styles.questionSection}>
        {isDaily && <span className={styles.stepBadge}>Stap 2 van 2</span>}

        {isForwardPickup && (
          <span className={styles.stepBadge}>Ronde 2 van 2 · Voorraad</span>
        )}

        <div className={styles.questionHeading}>
          <CalendarDays size={20} aria-hidden="true" />
          <h3>Wat is de eerstvolgende vervaldatum?</h3>
        </div>

        <p className={styles.questionDescription}>
          {isDaily
            ? "Vul de vroegste vervaldatum in van de exemplaren die na vandaag vervallen. De gestickerde exemplaren voor vandaag tellen hier niet mee."
            : isForwardPickup
              ? "Vul de vroegste vervaldatum in van de overblijvende voorraad die na vandaag vervalt."
              : "Vul de vroegste vervaldatum in van de aanwezige verkoopbare voorraad."}
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
          <span className={styles.stepBadge}>Ronde 1 van 2 · Ophalen</span>
        )}

        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Verwijder de resterende gestickerde exemplaren</h3>
        </div>

        <p className={styles.questionDescription}>
          {isForwardPickup ? (
            <>
              Haal de resterende exemplaren met een 50%-sticker en vervaldatum{" "}
              <strong className={styles.highlightDate}>
                {formatDate(expiryDate)}
              </strong>{" "}
              uit de voorraad.
            </>
          ) : (
            "Haal alle resterende exemplaren met een 30%-sticker uit de voorraad. De opgeslagen datum van de overige voorraad verandert hierdoor niet."
          )}
        </p>

        <p className={styles.questionPrompt}>
          Klik op Volgend product zodra deze exemplaren verwijderd zijn.
          Bevestig ook wanneer alles al verkocht is.
        </p>

        {isForwardPickup && (
          <p className={styles.questionDescription}>
            Haal eerst alle producten op. Daarna volgt een tweede ronde om de
            overige voorraad bij te werken.
          </p>
        )}
      </section>
    );
  }

  if (isStickerRound && dailyStep === "sticker") {
    return (
      <section className={styles.questionSection}>
        {isDaily && <span className={styles.stepBadge}>Stap 1 van 2</span>}

        <div className={styles.questionHeading}>
          <Tag size={20} aria-hidden="true" />
          <h3>
            {isDaily
              ? "Zijn er exemplaren die vandaag vervallen?"
              : "Heeft deze voorraad een 50%-sticker nodig?"}
          </h3>
        </div>

        <p className={styles.questionDescription}>
          Zoek de exemplaren met vervaldatum{" "}
          <strong className={styles.highlightDate}>
            {formatDate(expiryDate)}
          </strong>
          .
          {isDaily
            ? " Geef de aanwezige exemplaren een 30%-sticker."
            : " Beoordeel de hoeveelheid en hoe snel het product verkoopt. Een goed verkopend product met weinig resterende voorraad hoeft mogelijk geen korting."}
        </p>

        {type === "monthly" && stickered && (
          <p className={styles.questionDescription}>
            Er zijn al gestickerde exemplaren geregistreerd. Controleer of er
            nog bijkomende exemplaren gestickerd moeten worden.
          </p>
        )}

        <p className={styles.questionPrompt}>
          {isDaily
            ? "Kies Gestickerd als je exemplaren gestickerd hebt. Kies Niet aanwezig als er geen exemplaren met deze datum zijn."
            : "Kies Gestickerd als je exemplaren gestickerd hebt. Kies Niet gestickerd als je geen nieuwe stickers hebt aangebracht."}
        </p>

        {type === "monthly" && (
          <p className={styles.questionDescription}>
            Niet gestickerd wist een eerdere stickerregistratie niet. Klopt de
            opgeslagen datum niet? Pas het product aan via het productmenu.
          </p>
        )}
      </section>
    );
  }

  if (isDaily) {
    return (
      <section className={styles.questionSection}>
        <span className={styles.stepBadge}>Stap 2 van 2</span>

        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Zijn er ook exemplaren die na vandaag vervallen?</h3>
        </div>

        <p className={styles.questionDescription}>
          Kies Wel voorraad om de vroegste datum van die exemplaren in te
          vullen. Kies Geen voorraad als er alleen exemplaren voor vandaag zijn
          of als alles op is.
        </p>

        <p className={styles.questionPrompt}>
          Gestickerde exemplaren blijven apart onthouden voor Dagelijks ophalen,
          ook als er geen latere voorraad is.
        </p>
      </section>
    );
  }

  if (isForwardPickup) {
    return (
      <section className={styles.questionSection}>
        <span className={styles.stepBadge}>Ronde 2 van 2 · Voorraad</span>

        <div className={styles.questionHeading}>
          <PackageCheck size={20} aria-hidden="true" />
          <h3>Is er nog voorraad die na vandaag vervalt?</h3>
        </div>

        <p className={styles.questionDescription}>
          De ophaalronde is afgerond. Controleer nu de overblijvende voorraad.
          Kies Wel voorraad om de vroegste datum in te vullen, of Geen voorraad
          als er niets meer overblijft.
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
            ? "Is dit product opnieuw in voorraad?"
            : "Is er nog verkoopbare voorraad?"}
        </h3>
      </div>

      <p className={styles.questionDescription}>
        {isStock
          ? "Kijk of het product opnieuw in het rayon staat. Kies Wel voorraad om de vroegste vervaldatum in te vullen. Kies Geen voorraad als er nog niets geleverd is."
          : "Verwijder alle verlopen exemplaren. Kies Wel voorraad om de vroegste datum van de resterende verkoopbare voorraad in te vullen, of Geen voorraad als alles weg is."}
      </p>

      {isStock && stickered && (
        <p className={styles.questionDescription}>
          Exemplaren die al voor ophalen geregistreerd zijn, tellen niet mee als
          nieuwe voorraad.
        </p>
      )}
    </section>
  );
}
