"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Package, Search, X } from "lucide-react";

import ProductCard, {
  type StockItem,
} from "@/components/stockchecker/ProductCard";
import StockFilters from "@/components/stockchecker/StockFilters";
import CheckTileGlass from "@/components/home/CheckTileGlass";
import { getStockDateError, getStockQuery } from "@/lib/stock-preferences";

import { useStockPreferences } from "./useStockPreferences";
import styles from "./page.module.css";

type ItemsResponse = {
  items: StockItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

const PAGE_SIZE = 10;

function getPageNumbers(page: number, totalPages: number) {
  const pages: (number | "...")[] = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return pages;
  }

  pages.push(1);

  if (page > 3) {
    pages.push("...");
  }

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (page < totalPages - 2) {
    pages.push("...");
  }

  pages.push(totalPages);

  return pages;
}

export default function StockCheckerPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadedQuery, setLoadedQuery] = useState("");

  const { preferences, ready, updatePreferences, setPage, clearFilters } =
    useStockPreferences();

  const { search, page } = preferences;
  const query = getStockQuery(preferences);
  const dateError = getStockDateError(preferences);
  const busy = !ready || loading || loadedQuery !== query;

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setCategories(Array.isArray(data.categories) ? data.categories : []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to load categories:", err);
        }
      }
    }

    void loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!ready || dateError) return;

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/items?" + query, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Producten konden niet geladen worden.",
          );
        }

        if (!Array.isArray(data.items)) {
          throw new Error("Ongeldige data ontvangen.");
        }

        if (controller.signal.aborted) return;

        const result = data as ItemsResponse;
        const availablePages = Math.max(1, result.totalPages);

        if (result.page > availablePages) {
          setPage(availablePages);
          return;
        }

        setItems(result.items);
        setTotal(result.total);
        setTotalPages(availablePages);
        setLoadedQuery(query);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Producten konden niet geladen worden.",
        );
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setLoadedQuery(query);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [ready, query, dateError, setPage]);

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }

    setPage(nextPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.searchBox}>
          <CheckTileGlass className={styles.glass} />
          <Search size={20} className={styles.searchIcon} />

          <input
            type="search"
            placeholder="Zoek op naam..."
            aria-label="Zoek product"
            value={search}
            disabled={!ready}
            onChange={(event) =>
              updatePreferences({ search: event.target.value })
            }
          />

          {search && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => updatePreferences({ search: "" })}
              aria-label="Zoekterm wissen"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {ready && (
          <StockFilters
            categories={categories}
            preferences={preferences}
            onChange={updatePreferences}
            onClearFilters={clearFilters}
          />
        )}

        <section className={styles.results} aria-busy={busy && !dateError}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsTitle}>
              <Package size={19} />

              <h2>
                {dateError
                  ? "Controleer je filters"
                  : busy
                    ? "Producten laden..."
                    : `${total} ${total === 1 ? "product" : "producten"}`}
              </h2>
            </div>

            {!dateError && !busy && totalPages > 1 && (
              <span className={styles.pageIndicator}>
                {page} / {totalPages}
              </span>
            )}
          </div>

          {dateError && (
            <div className={styles.error} role="alert">
              <CheckTileGlass className={styles.glass} />
              {dateError}
            </div>
          )}

          {!dateError && !busy && error && (
            <div className={styles.emptyState} role="alert">
              <CheckTileGlass className={styles.glass} />
              <Package size={42} />
              <h3>Er ging iets mis</h3>
              <p>{error}</p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className={styles.emptyButton}
              >
                Opnieuw proberen
              </button>
            </div>
          )}

          {!dateError && busy && (
            <div className={styles.loadingState} role="status">
              <CheckTileGlass className={styles.glass} />
              Producten laden...
            </div>
          )}

          {!dateError && !busy && !error && items.length === 0 && (
            <div className={styles.emptyState}>
              <CheckTileGlass className={styles.glass} />
              <Search size={43} />
              <h3>Geen producten gevonden</h3>
              <p>Probeer een andere zoekterm of pas je filters aan.</p>

              <button
                type="button"
                onClick={clearFilters}
                className={styles.emptyButton}
              >
                Filters wissen
              </button>
            </div>
          )}

          {!dateError && !busy && !error && items.length > 0 && (
            <>
              <div className={styles.productList}>
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Paginering">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    aria-label="Vorige pagina"
                  >
                    <CheckTileGlass className={styles.glass} />
                    <ChevronLeft size={20} />
                  </button>

                  {pageNumbers.map((number, index) =>
                    number === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className={styles.ellipsis}
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={number}
                        onClick={() => goToPage(number)}
                        className={number === page ? styles.currentPage : ""}
                        aria-label={`Pagina ${number}`}
                        aria-current={number === page ? "page" : undefined}
                      >
                        <CheckTileGlass className={styles.glass} />
                        {number}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Volgende pagina"
                  >
                    <CheckTileGlass className={styles.glass} />
                    <ChevronRight size={20} />
                  </button>
                </nav>
              )}

              <p className={styles.rangeLabel}>
                Toont {firstItem}–{lastItem} van {total}
              </p>
            </>
          )}
        </section>

        <footer className={styles.footer}>
          DateCheck <span>•</span> Voorraadbeheer
        </footer>
      </div>
    </main>
  );
}
