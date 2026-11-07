"use client";

import { useId, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Filter,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import {
  CONTROL_OPTIONS,
  DATE_OPTIONS,
  PHOTO_OPTIONS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  STICKER_OPTIONS,
  STOCK_OPTIONS,
  getStockDateError,
  type StockPreferences,
} from "@/lib/stock-preferences";
import CheckTileGlass from "@/components/home/CheckTileGlass";
import styles from "./StockFilters.module.css";

export type {
  ControlFilter,
  DateFilterMode,
  SortOption,
} from "@/lib/stock-preferences";

type StockFiltersProps = {
  categories: { id: string; name: string; color: string }[];
  preferences: StockPreferences;
  onChange: (changes: Partial<StockPreferences>) => void;
  onClearFilters: () => void;
};

const SORT_GROUPS = [...new Set(SORT_OPTIONS.map((option) => option.group))];

const EXTRA_FIELDS = [
  { key: "stockFilter", label: "Voorraadregistratie", options: STOCK_OPTIONS },
  { key: "statusFilter", label: "Productstatus", options: STATUS_OPTIONS },
  { key: "photoFilter", label: "Productfoto", options: PHOTO_OPTIONS },
] as const;

export default function StockFilters({
  categories,
  preferences,
  onChange,
  onClearFilters,
}: StockFiltersProps) {
  const id = useId();
  const [openPanel, setOpenPanel] = useState<"filters" | "sort" | null>(null);
  const filtersButton = useRef<HTMLButtonElement>(null);
  const sortButton = useRef<HTMLButtonElement>(null);
  const dateError = getStockDateError(preferences);

  const customDateActive =
    preferences.dateFilterMode === "exact"
      ? Boolean(preferences.exactDate)
      : Boolean(preferences.fromDate || preferences.toDate);

  const activeFilterCount =
    Number(Boolean(preferences.categoryFilter)) +
    Number(preferences.controlFilter !== "all") +
    Number(preferences.stickerFilter !== "all") +
    Number(preferences.stockFilter !== "all") +
    Number(preferences.statusFilter !== "all") +
    Number(preferences.photoFilter !== "all") +
    Number(
      preferences.datePreset === "custom"
        ? customDateActive
        : preferences.datePreset !== "all",
    );

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          ref={filtersButton}
          type="button"
          className={styles.toolbarButton}
          aria-expanded={openPanel === "filters"}
          aria-controls={id + "-filters"}
          onClick={() =>
            setOpenPanel(openPanel === "filters" ? null : "filters")
          }
        >
          <Filter size={18} aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span className={styles.filterCount}>{activeFilterCount}</span>
          )}
          <ChevronDown
            size={17}
            className={styles.chevron}
            aria-hidden="true"
          />
        </button>

        <button
          ref={sortButton}
          type="button"
          className={styles.toolbarButton}
          aria-expanded={openPanel === "sort"}
          aria-controls={id + "-sort"}
          onClick={() => setOpenPanel(openPanel === "sort" ? null : "sort")}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          Sorteren
          <ChevronDown
            size={17}
            className={styles.chevron}
            aria-hidden="true"
          />
        </button>
      </div>

      {openPanel === "filters" && (
        <section
          id={id + "-filters"}
          className={styles.panel}
          aria-label="Productfilters"
        >
          <CheckTileGlass className={styles.glass} />

          <div className={styles.panelHeader}>
            <h2>Filters</h2>

            <button
              type="button"
              className={styles.resetButton}
              onClick={onClearFilters}
              disabled={
                activeFilterCount === 0 &&
                !preferences.search &&
                preferences.sort === "name_asc"
              }
            >
              <RotateCcw size={15} aria-hidden="true" />
              Wissen
            </button>
          </div>

          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Categorie</span>

              <select
                value={preferences.categoryFilter}
                onChange={(event) =>
                  onChange({ categoryFilter: event.target.value })
                }
              >
                <option value="">Alle categorieën</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Stickersoort</span>

              <select
                value={preferences.controlFilter}
                onChange={(event) =>
                  onChange({
                    controlFilter: event.target
                      .value as StockPreferences["controlFilter"],
                  })
                }
              >
                {CONTROL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className={styles.fieldset}>
            <legend>Stickerstatus</legend>

            <div className={styles.legend}>
              <span>
                <i className={styles.pink} aria-hidden="true" />
                30%
              </span>
              <span>
                <i className={styles.orange} aria-hidden="true" />
                50%
              </span>
            </div>

            <div className={styles.segments}>
              {STICKER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={preferences.stickerFilter === option.value}
                  onClick={() => onChange({ stickerFilter: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.fields}>
            {EXTRA_FIELDS.map((field) => (
              <label key={field.key} className={styles.field}>
                <span>{field.label}</span>

                <select
                  value={preferences[field.key]}
                  onChange={(event) =>
                    onChange({ [field.key]: event.target.value })
                  }
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <fieldset className={styles.fieldset}>
            <legend>Vervaldatum</legend>

            <div className={styles.presets}>
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={preferences.datePreset === option.value}
                  onClick={() => onChange({ datePreset: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {preferences.datePreset === "next7" && (
              <p className={styles.hint}>Vandaag tot en met over 7 dagen.</p>
            )}

            {preferences.datePreset === "custom" && (
              <div className={styles.customDate}>
                <div className={styles.segments}>
                  <button
                    type="button"
                    aria-pressed={preferences.dateFilterMode === "exact"}
                    onClick={() => onChange({ dateFilterMode: "exact" })}
                  >
                    Exacte datum
                  </button>

                  <button
                    type="button"
                    aria-pressed={preferences.dateFilterMode === "range"}
                    onClick={() => onChange({ dateFilterMode: "range" })}
                  >
                    Periode
                  </button>
                </div>

                {preferences.dateFilterMode === "exact" ? (
                  <label className={styles.field}>
                    <span>Datum</span>
                    <input
                      type="date"
                      value={preferences.exactDate}
                      onChange={(event) =>
                        onChange({ exactDate: event.target.value })
                      }
                    />
                  </label>
                ) : (
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span>Vanaf</span>
                      <input
                        type="date"
                        value={preferences.fromDate}
                        onChange={(event) =>
                          onChange({ fromDate: event.target.value })
                        }
                        aria-invalid={Boolean(dateError)}
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Tot en met</span>
                      <input
                        type="date"
                        value={preferences.toDate}
                        onChange={(event) =>
                          onChange({ toDate: event.target.value })
                        }
                        aria-invalid={Boolean(dateError)}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {dateError && (
              <p className={styles.error} role="alert">
                {dateError}
              </p>
            )}
          </fieldset>

          <button
            type="button"
            className={styles.applyButton}
            disabled={Boolean(dateError)}
            onClick={() => {
              setOpenPanel(null);
              filtersButton.current?.focus();
            }}
          >
            Resultaten bekijken
          </button>
        </section>
      )}

      {openPanel === "sort" && (
        <section
          id={id + "-sort"}
          className={styles.panel}
          aria-label="Sorteeropties"
        >
          <CheckTileGlass className={styles.glass} />

          <div className={styles.panelHeader}>
            <h2>Sorteren op</h2>
          </div>

          {SORT_GROUPS.map((group) => (
            <fieldset key={group} className={styles.sortGroup}>
              <legend>{group}</legend>

              {SORT_OPTIONS.filter((option) => option.group === group).map(
                (option) => (
                  <label key={option.value} className={styles.sortOption}>
                    <input
                      type="radio"
                      name={id + "-sort-option"}
                      value={option.value}
                      checked={preferences.sort === option.value}
                      onChange={() => {
                        onChange({ sort: option.value });
                        setOpenPanel(null);
                        sortButton.current?.focus();
                      }}
                    />
                    <span>{option.label}</span>

                    {preferences.sort === option.value && (
                      <Check size={16} aria-hidden="true" />
                    )}
                  </label>
                ),
              )}
            </fieldset>
          ))}

          <p className={styles.hint}>
            Bij sorteren op vervaldatum staan producten zonder datum onderaan.
          </p>
        </section>
      )}
    </div>
  );
}
