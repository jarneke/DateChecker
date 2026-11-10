"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import settingsStyles from "./page.module.css";
import ConfirmDialog from "@/components/ConfirmDialog";
import CheckTileGlass from "@/components/home/CheckTileGlass";
import styles from "./DeliveryPlanner.module.css";

type Delivery = {
  id: string;
  name: string;
  active: boolean;
  version: number;
  weekdays: number[];
  categoryIds: string[];
};

type DeliveryDraft = {
  id?: string;
  version?: number;
  name: string;
  active: boolean;
  weekdays: number[];
  categoryIds: string[];
};

type Category = {
  id: string;
  name: string;
};

type DeliveryPlannerProps = {
  categories: Category[];
  disabled: boolean;
};

const WEEKDAYS = [
  { value: 1, short: "Ma", name: "Maandag" },
  { value: 2, short: "Di", name: "Dinsdag" },
  { value: 3, short: "Wo", name: "Woensdag" },
  { value: 4, short: "Do", name: "Donderdag" },
  { value: 5, short: "Vr", name: "Vrijdag" },
  { value: 6, short: "Za", name: "Zaterdag" },
  { value: 7, short: "Zo", name: "Zondag" },
];

function sortDeliveries(deliveries: Delivery[]): Delivery[] {
  return [...deliveries].sort(
    (a, b) => a.name.localeCompare(b.name, "nl-BE") || a.id.localeCompare(b.id),
  );
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export default function DeliveryPlanner({
  categories,
  disabled,
}: DeliveryPlannerProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [draft, setDraft] = useState<DeliveryDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(
    null,
  );
  const [message, setMessage] = useState("");

  const loadDeliveries = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/deliveries", {
        cache: "no-store",
        signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Leveringen konden niet geladen worden.",
        );
      }

      if (!signal?.aborted) {
        setDeliveries(sortDeliveries(data.deliveries));
      }
    } catch (caughtError) {
      if (!signal?.aborted) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Leveringen konden niet geladen worden.",
        );
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => {
      void loadDeliveries(controller.signal);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [loadDeliveries]);

  function updateDraft(changes: Partial<DeliveryDraft>) {
    setDraft((current) => (current ? { ...current, ...changes } : current));
    setError("");
    setMessage("");
  }

  function startNew() {
    setDraft({
      name: "",
      active: true,
      weekdays: [],
      categoryIds: [],
    });
    setError("");
    setMessage("");
  }

  function editDelivery(delivery: Delivery) {
    setDraft({
      ...delivery,
      weekdays: [...delivery.weekdays],
      categoryIds: [...delivery.categoryIds],
    });
    setError("");
    setMessage("");
  }

  async function saveDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft || saving || disabled) return;

    if (!draft.name.trim() || draft.name.trim().length > 120) {
      setError("Vul een leveringsnaam in van maximaal 120 tekens.");
      return;
    }

    if (draft.weekdays.length === 0 || draft.categoryIds.length === 0) {
      setError("Kies minstens één weekdag en categorie.");
      return;
    }

    const existingCategoryIds = draft.categoryIds.filter((id) =>
      categories.some((category) => category.id === id),
    );

    if (existingCategoryIds.length !== draft.categoryIds.length) {
      updateDraft({ categoryIds: existingCategoryIds });
      setError(
        "Een gekozen categorie bestaat niet meer. Controleer je selectie opnieuw.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/deliveries", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          name: draft.name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Levering kon niet opgeslagen worden.");
      }

      const updated: Delivery = data.delivery;

      setDeliveries((current) =>
        sortDeliveries([
          ...current.filter((delivery) => delivery.id !== updated.id),
          updated,
        ]),
      );
      setDraft(null);
      setMessage("Levering opgeslagen.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Levering kon niet opgeslagen worden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteDelivery(delivery: Delivery) {
    if (saving || disabled) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/deliveries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: delivery.id,
          version: delivery.version,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Levering kon niet verwijderd worden.");
      }

      setDeliveries((current) =>
        current.filter((entry) => entry.id !== delivery.id),
      );
      setMessage("Levering verwijderd.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Levering kon niet verwijderd worden.",
      );
    } finally {
      setSaving(false);
    }
  }

  const blocked = disabled || saving || loading;

  return (
    <section className={`${settingsStyles.section} ${styles.root}`}>
      <CheckTileGlass className={settingsStyles.glass} />

      {deliveryToDelete && (
        <ConfirmDialog
          tone="danger"
          title="Levering verwijderen?"
          description={`Je verwijdert “${deliveryToDelete.name}” uit de planning.`}
          confirmLabel="Levering verwijderen"
          onCancel={() => setDeliveryToDelete(null)}
          onConfirm={() => {
            setDeliveryToDelete(null);
            void deleteDelivery(deliveryToDelete);
          }}
        />
      )}

      <div className={settingsStyles.sectionHeading}>
        <div className={settingsStyles.sectionIcon}>
          <Truck size={19} aria-hidden="true" />
        </div>

        <div>
          <h2>Leveringsplanning</h2>
          <p>Vaste leveringsdagen en bijbehorende categorieën.</p>
        </div>
      </div>

      {disabled && (
        <p className={styles.hint}>
          Sla je wijzigingen aan de instellingen hierboven eerst op om
          leveringen te beheren.
        </p>
      )}

      {loading && (
        <p className={styles.hint} role="status">
          Leveringen laden…
        </p>
      )}

      {error && (
        <div className={styles.error} role="alert">
          <CheckTileGlass className={styles.glass} />
          <p>{error}</p>

          {!saving && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => void loadDeliveries()}
              disabled={disabled}
            >
              Lijst vernieuwen
            </button>
          )}
        </div>
      )}

      {message && (
        <p className={styles.success} role="status">
          <CheckTileGlass className={styles.glass} />
          {message}
        </p>
      )}

      {!loading && !draft && (
        <>
          {deliveries.length === 0 && !error && (
            <p className={styles.hint}>
              Er zijn nog geen leveringen ingesteld.
            </p>
          )}

          <div className={styles.list}>
            {deliveries.map((delivery) => (
              <article key={delivery.id} className={styles.delivery}>
                <CheckTileGlass className={styles.glass} />

                <div className={styles.deliveryHeading}>
                  <h3>{delivery.name}</h3>
                  {!delivery.active && (
                    <span className={styles.inactive}>Inactief</span>
                  )}
                </div>

                <p className={styles.days}>
                  {WEEKDAYS.filter((day) =>
                    delivery.weekdays.includes(day.value),
                  )
                    .map((day) => day.name)
                    .join(" · ")}
                </p>

                <p className={styles.categoryNames}>
                  {delivery.categoryIds
                    .map(
                      (id) =>
                        categories.find((category) => category.id === id)
                          ?.name ?? "Onbekende categorie",
                    )
                    .join(", ")}
                </p>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => editDelivery(delivery)}
                    disabled={blocked}
                  >
                    <CheckTileGlass className={styles.glass} />
                    <Pencil size={15} aria-hidden="true" />
                    Bewerken
                  </button>

                  <button
                    type="button"
                    className={`${styles.button} ${styles.danger}`}
                    onClick={() => setDeliveryToDelete(delivery)}
                    disabled={blocked}
                  >
                    <CheckTileGlass className={styles.glass} />
                    <Trash2 size={15} aria-hidden="true" />
                    Verwijderen
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button
            type="button"
            className={`${styles.button} ${styles.newButton}`}
            onClick={startNew}
            disabled={blocked || categories.length === 0}
          >
            <CheckTileGlass className={styles.glass} />
            <Plus size={17} aria-hidden="true" />
            Levering toevoegen
          </button>
        </>
      )}

      {draft && (
        <form className={styles.editor} onSubmit={saveDelivery}>
          <CheckTileGlass className={styles.glass} />

          <fieldset className={styles.fields} disabled={blocked}>
            <legend>
              {draft.id ? "Levering bewerken" : "Nieuwe levering"}
            </legend>

            <label className={styles.nameField}>
              <span>Naam</span>
              <input
                type="text"
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="Bijvoorbeeld: Droogwaren"
                maxLength={120}
                required
              />
            </label>

            <fieldset className={styles.group}>
              <legend>Leveringsdagen</legend>

              <div className={styles.weekdays}>
                {WEEKDAYS.map((day) => (
                  <label
                    key={day.value}
                    className={styles.choice}
                    title={day.name}
                  >
                    <CheckTileGlass className={styles.glass} />
                    <input
                      type="checkbox"
                      checked={draft.weekdays.includes(day.value)}
                      onChange={() =>
                        updateDraft({
                          weekdays: toggleValue(draft.weekdays, day.value),
                        })
                      }
                      aria-label={day.name}
                    />
                    <span>{day.short}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend>Categorieën in deze levering</legend>

              <div className={styles.categories}>
                {categories.map((category) => (
                  <label key={category.id} className={styles.choice}>
                    <CheckTileGlass className={styles.glass} />
                    <input
                      type="checkbox"
                      checked={draft.categoryIds.includes(category.id)}
                      onChange={() =>
                        updateDraft({
                          categoryIds: toggleValue(
                            draft.categoryIds,
                            category.id,
                          ),
                        })
                      }
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={styles.active}>
              <CheckTileGlass className={styles.glass} />
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  updateDraft({ active: event.target.checked })
                }
              />
              <span>Deze levering staat actief in de planning</span>
            </label>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setDraft(null);
                  setError("");
                }}
              >
                <CheckTileGlass className={styles.glass} />
                <X size={16} aria-hidden="true" />
                Annuleren
              </button>

              <button
                type="submit"
                className={`${styles.button} ${styles.primary}`}
              >
                <CheckTileGlass className={styles.glass} />
                {saving ? (
                  <LoaderCircle
                    size={16}
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                {saving ? "Opslaan…" : "Levering opslaan"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
