"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

import styles from "./StockFilters.module.css";

export type ControlFilter = "all" | "30" | "month";
export type DateFilterMode = "exact" | "range";

export type SortOption =
  | "name_asc"
  | "name_desc"
  | "expiry_asc"
  | "expiry_desc"
  | "category_asc"
  | "category_desc";

type Category = {
  id: string;
  name: string;
  color: string;
};

type StockFiltersProps = {
  categories: Category[];
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;

  controlFilter: ControlFilter;
  onControlFilterChange: (value: ControlFilter) => void;

  sort: SortOption;
  onSortChange: (value: SortOption) => void;

  dateFilterMode: DateFilterMode;
  onDateFilterModeChange: (value: DateFilterMode) => void;

  exactDate: string;
  onExactDateChange: (value: string) => void;

  fromDate: string;
  onFromDateChange: (value: string) => void;

  toDate: string;
  onToDateChange: (value: string) => void;

  onClearFilters: () => void;
};

const sortOptions: {
  value: SortOption;
  label: string;
}[] = [
  { value: "name_asc", label: "Naam (A → Z)" },
  { value: "name_desc", label: "Naam (Z → A)" },
  { value: "expiry_asc", label: "Vervaldatum (oud → nieuw)" },
  { value: "expiry_desc", label: "Vervaldatum (nieuw → oud)" },
  { value: "category_asc", label: "Categorie (A → Z)" },
  { value: "category_desc", label: "Categorie (Z → A)" },
];

export default function StockFilters({
  categories,
  categoryFilter,
  onCategoryFilterChange,
  controlFilter,
  onControlFilterChange,
  sort,
  onSortChange,
  dateFilterMode,
  onDateFilterModeChange,
  exactDate,
  onExactDateChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  onClearFilters,
}: StockFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const activeFilterCount =
    Number(categoryFilter !== "") +
    Number(controlFilter !== "all") +
    Number(
      dateFilterMode === "exact"
        ? exactDate !== ""
        : fromDate !== "" || toDate !== "",
    );

  const filtersActive = activeFilterCount > 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.toolbarButton} ${
            filtersOpen ? styles.active : ""
          }`}
          onClick={() => {
            setFiltersOpen(!filtersOpen);
            setSortOpen(false);
          }}
          aria-expanded={filtersOpen}
          aria-controls="stock-filters-panel"
        >
          <Filter size={18} />
          <span>Filters</span>

          {activeFilterCount > 0 && (
            <span className={styles.filterCount}>{activeFilterCount}</span>
          )}

          {filtersOpen ? (
            <ChevronUp size={17} className={styles.chevron} />
          ) : (
            <ChevronDown size={17} className={styles.chevron} />
          )}
        </button>

        <button
          type="button"
          className={`${styles.toolbarButton} ${sortOpen ? styles.active : ""}`}
          onClick={() => {
            setSortOpen(!sortOpen);
            setFiltersOpen(false);
          }}
          aria-expanded={sortOpen}
          aria-controls="stock-sort-panel"
        >
          <SlidersHorizontal size={18} />
          <span>Sorteren</span>

          {sortOpen ? (
            <ChevronUp size={17} className={styles.chevron} />
          ) : (
            <ChevronDown size={17} className={styles.chevron} />
          )}
        </button>
      </div>

      {filtersOpen && (
        <section
          id="stock-filters-panel"
          className={styles.panel}
          aria-label="Productfilters"
        >
          <div className={styles.panelHeader}>
            <h2>
              <Filter size={18} />
              Filters
            </h2>

            <button
              type="button"
              className={styles.resetButton}
              onClick={onClearFilters}
              disabled={!filtersActive}
            >
              <RotateCcw size={15} />
              Wissen
            </button>
          </div>

          {/* Category filter */}

          <div className={styles.field}>
            <label htmlFor="stock-category-filter">Categorie</label>

            <select
              id="stock-category-filter"
              value={categoryFilter}
              onChange={(event) => onCategoryFilterChange(event.target.value)}
            >
              <option value="">Alle categorieën</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Control type */}

          <div className={styles.field}>
            <label htmlFor="stock-control-filter">Controletype</label>

            <select
              id="stock-control-filter"
              value={controlFilter}
              onChange={(event) =>
                onControlFilterChange(event.target.value as ControlFilter)
              }
            >
              <option value="all">Alle controles</option>
              <option value="30">Dagelijkse controle</option>
              <option value="month">Maandelijkse controle</option>
            </select>
          </div>

          {/* Expiry date */}

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Vervaldatum</span>

            <div className={styles.segmented}>
              <button
                type="button"
                className={
                  dateFilterMode === "exact" ? styles.selectedSegment : ""
                }
                onClick={() => onDateFilterModeChange("exact")}
              >
                Exacte datum
              </button>

              <button
                type="button"
                className={
                  dateFilterMode === "range" ? styles.selectedSegment : ""
                }
                onClick={() => onDateFilterModeChange("range")}
              >
                Datumbereik
              </button>
            </div>
          </div>

          {dateFilterMode === "exact" ? (
            <div className={styles.field}>
              <label htmlFor="stock-exact-date">Datum</label>

              <input
                id="stock-exact-date"
                type="date"
                value={exactDate}
                onChange={(event) => onExactDateChange(event.target.value)}
              />
            </div>
          ) : (
            <div className={styles.dateFields}>
              <div className={styles.field}>
                <label htmlFor="stock-from-date">Vanaf</label>

                <input
                  id="stock-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => onFromDateChange(event.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="stock-to-date">Tot</label>

                <input
                  id="stock-to-date"
                  type="date"
                  value={toDate}
                  onChange={(event) => onToDateChange(event.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.applyButton}
            onClick={() => setFiltersOpen(false)}
          >
            Resultaten bekijken
          </button>
        </section>
      )}

      {sortOpen && (
        <section
          id="stock-sort-panel"
          className={styles.panel}
          aria-label="Sorteeropties"
        >
          <div className={styles.panelHeader}>
            <h2>
              <SlidersHorizontal size={18} />
              Sorteren op
            </h2>
          </div>

          <div className={styles.sortOptions}>
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.sortOption} ${
                  sort === option.value ? styles.sortSelected : ""
                }`}
                onClick={() => {
                  onSortChange(option.value);
                  setSortOpen(false);
                }}
              >
                <span className={styles.radioIndicator} aria-hidden="true" />

                {option.label}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
