"use client";

import { ChevronDown, Settings2 } from "lucide-react";

import pageStyles from "./page.module.css";
import styles from "./AdvancedItemSettings.module.css";

export type EditableItem = {
  id: string;
  name: string;
  photo_url: string | null;
  category_id: string;
  category_name: string | null;
  expiry_date: string | null;
  sticker_30_percent: boolean;
  stickered: boolean;
  paused: boolean;
  stickered_for_date: string | null;
  check_revision: number;
  created_at: string;
  updated_at: string;
  edit_version: string;
};

type AdvancedItemSettingsProps = {
  item: EditableItem;
  disabled: boolean;
  onChange: (changes: Partial<EditableItem>) => void;
};

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Brussels",
  }).format(date);
}

export default function AdvancedItemSettings({
  item,
  disabled,
  onChange,
}: AdvancedItemSettingsProps) {
  const invalidForwardStatus =
    !item.sticker_30_percent && item.stickered && !item.expiry_date;

  return (
    <>
      <section className={pageStyles.card}>
        <div className={pageStyles.sectionHeader}>
          <div className={pageStyles.sectionIcon}>
            <Settings2 size={22} aria-hidden="true" />
          </div>

          <div>
            <h2>Algemene instellingen</h2>
            <p>Stickersoort, stickerstatus en controles.</p>
          </div>
        </div>

        <div className={styles.content}>
          <div className={pageStyles.field}>
            <label htmlFor="product-sticker-type">Stickersoort</label>

            <div className={pageStyles.selectWrapper}>
              <select
                id="product-sticker-type"
                value={item.sticker_30_percent ? "30" : "50"}
                onChange={(event) =>
                  onChange({
                    sticker_30_percent: event.target.value === "30",
                  })
                }
                disabled={disabled}
                aria-describedby="product-sticker-type-hint"
              >
                <option value="30">30% — dagelijks stickeren</option>
                <option value="50">50% — vooruit stickeren</option>
              </select>

              <ChevronDown
                size={19}
                className={pageStyles.selectChevron}
                aria-hidden="true"
              />
            </div>

            <small id="product-sticker-type-hint">
              Wijzig de stickersoort wanneer de bestaande stickers afgehandeld
              zijn. Zet dan ook de stickerstatus uit.
            </small>
          </div>

          <label className={pageStyles.toggleRow}>
            <span className={pageStyles.toggleText}>
              <strong className={styles.statusLabel}>
                <span
                  className={`${styles.stickerSample} ${
                    item.sticker_30_percent ? styles.pink : styles.orange
                  }`}
                  aria-hidden="true"
                />
                Gestickerd
              </strong>

              <span>
                {item.stickered
                  ? "Er zijn exemplaren gestickerd die nog opgehaald moeten worden."
                  : "Er zijn geen gestickerde exemplaren geregistreerd."}
              </span>
            </span>

            <input
              type="checkbox"
              className={pageStyles.toggleInput}
              checked={item.stickered}
              onChange={(event) =>
                onChange({ stickered: event.target.checked })
              }
              disabled={disabled}
            />

            <span className={pageStyles.toggleSwitch} aria-hidden="true" />
          </label>

          {invalidForwardStatus && (
            <p className={styles.invalid} role="alert">
              Een vooruit gestickerd product heeft een vervaldatum nodig. Vul de
              datum in of zet Gestickerd uit.
            </p>
          )}

          {item.sticker_30_percent && item.stickered && !item.expiry_date && (
            <p className={styles.notice}>
              Er zijn dagelijks gestickerde exemplaren geregistreerd, maar geen
              latere voorraad. Het product blijft bij Dagelijks ophalen
              verschijnen.
            </p>
          )}

          <label className={pageStyles.toggleRow}>
            <span className={pageStyles.toggleText}>
              <strong>Controles pauzeren</strong>

              <span>
                {item.paused
                  ? "Dit product wordt na opslaan uit alle controlerondes gehouden."
                  : "Houd dit product tijdelijk uit de controlerondes. Het blijft in Voorraad staan."}
              </span>
            </span>

            <input
              type="checkbox"
              className={pageStyles.toggleInput}
              checked={item.paused}
              onChange={(event) => onChange({ paused: event.target.checked })}
              disabled={disabled}
            />

            <span className={pageStyles.toggleSwitch} aria-hidden="true" />
          </label>

          {item.paused && item.stickered && (
            <p className={styles.notice}>
              Dit product heeft nog een stickerstatus. Zolang het gepauzeerd is,
              verschijnt het ook niet bij ophalen.
            </p>
          )}
        </div>
      </section>

      <details className={pageStyles.card}>
        <summary className={styles.summary}>
          <span className={styles.summaryText}>
            <strong>Technische gegevens</strong>
            <span>Identificatie en automatisch bijgehouden gegevens</span>
          </span>

          <ChevronDown
            size={20}
            className={styles.chevron}
            aria-hidden="true"
          />
        </summary>

        <dl className={styles.metadata}>
          <div>
            <dt>Product-ID</dt>
            <dd>{item.id}</dd>
          </div>

          <div>
            <dt>Categorie-ID</dt>
            <dd>{item.category_id}</dd>
          </div>

          <div>
            <dt>Foto-URL</dt>
            <dd>{item.photo_url || "Geen foto"}</dd>
          </div>

          <div>
            <dt>Aangemaakt</dt>
            <dd>{formatDateTime(item.created_at)}</dd>
          </div>

          <div>
            <dt>Laatst bijgewerkt</dt>
            <dd>{formatDateTime(item.updated_at)}</dd>
          </div>

          <div>
            <dt>Gegevensversie</dt>
            <dd>{item.check_revision}</dd>
          </div>

          <div>
            <dt>Oude stickerregistratie</dt>
            <dd>{item.stickered_for_date || "Geen"}</dd>
          </div>
        </dl>

        <p className={styles.technicalHint}>
          Deze gegevens worden automatisch beheerd. De huidige stickerstatus pas
          je aan bij Algemene instellingen.
        </p>
      </details>
    </>
  );
}
