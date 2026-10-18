"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";

import ProductCard, {
  type StockItem,
} from "@/components/stockchecker/ProductCard";

import StockFilters, {
  type ControlFilter,
  type DateFilterMode,
  type SortOption,
} from "@/components/stockchecker/StockFilters";

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

  const [search, setSearch] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");

  const [controlFilter, setControlFilter] = useState<ControlFilter>("all");

  const [sort, setSort] = useState<SortOption>("name_asc");

  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("exact");

  const [exactDate, setExactDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Categories

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const data = await response.json();

        setCategories(Array.isArray(data.categories) ? data.categories : []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }

    loadCategories();
  }, []);

  // Reset pagination when filters change

  useEffect(() => {
    setPage(1);
  }, [
    search,
    categoryFilter,
    controlFilter,
    sort,
    dateFilterMode,
    exactDate,
    fromDate,
    toDate,
  ]);

  // Fetch products

  useEffect(() => {
    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("sort", sort);

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (categoryFilter) {
          params.set("category", categoryFilter);
        }

        if (controlFilter !== "all") {
          params.set("control", controlFilter);
        }

        if (dateFilterMode === "exact") {
          if (exactDate) {
            params.set("exactDate", exactDate);
          }
        } else {
          if (fromDate) {
            params.set("fromDate", fromDate);
          }

          if (toDate) {
            params.set("toDate", toDate);
          }
        }

        const response = await fetch(`/api/items?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Producten konden niet geladen worden.");
        }

        const data: ItemsResponse = await response.json();

        if (!Array.isArray(data.items)) {
          throw new Error("Ongeldige data ontvangen.");
        }

        if (controller.signal.aborted) return;

        setItems(data.items);
        setTotal(data.total);
        setTotalPages(Math.max(1, data.totalPages));
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error(err);

        setError("Producten konden niet geladen worden.");

        setItems([]);
        setTotal(0);
        setTotalPages(1);
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
  }, [
    page,
    search,
    categoryFilter,
    controlFilter,
    sort,
    dateFilterMode,
    exactDate,
    fromDate,
    toDate,
  ]);

  function clearFilters() {
    setSearch("");
    setCategoryFilter("");
    setControlFilter("all");
    setSort("name_asc");
    setDateFilterMode("exact");
    setExactDate("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

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
        {/* Header */}

        <header className={styles.header}>
          <Link
            href="/"
            className={styles.backButton}
            aria-label="Terug naar hoofdpagina"
          >
            <ArrowLeft size={21} />
          </Link>

          <div className={styles.headerText}>
            <h1>
              Stock<span>checker</span>
            </h1>

            <p>
              {loading
                ? "Producten laden..."
                : `${total} ${total === 1 ? "product" : "producten"}`}
            </p>
          </div>

          <Link
            href="/stockchecker/new"
            className={styles.addButton}
            aria-label="Nieuw product toevoegen"
          >
            <Plus size={23} strokeWidth={2.3} />
          </Link>
        </header>

        {/* Search */}

        <div className={styles.searchBox}>
          <Search size={20} className={styles.searchIcon} />

          <input
            type="search"
            placeholder="Zoek op naam..."
            aria-label="Zoek product"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setSearch("")}
              aria-label="Zoekterm wissen"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filters */}

        <StockFilters
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          controlFilter={controlFilter}
          onControlFilterChange={setControlFilter}
          sort={sort}
          onSortChange={setSort}
          dateFilterMode={dateFilterMode}
          onDateFilterModeChange={setDateFilterMode}
          exactDate={exactDate}
          onExactDateChange={setExactDate}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
          onClearFilters={clearFilters}
        />

        {/* Products */}

        <section className={styles.results}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsTitle}>
              <Package size={19} />

              <h2>
                {loading
                  ? "Producten laden..."
                  : `${total} ${total === 1 ? "product" : "producten"}`}
              </h2>
            </div>

            {!loading && totalPages > 1 && (
              <span className={styles.pageIndicator}>
                {page} / {totalPages}
              </span>
            )}
          </div>

          {/* Error */}

          {error && (
            <div className={styles.emptyState} role="alert">
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

          {/* Loading */}

          {loading && (
            <div className={styles.loadingState} role="status">
              Producten laden...
            </div>
          )}

          {/* Empty */}

          {!loading && !error && items.length === 0 && (
            <div className={styles.emptyState}>
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

          {/* Product cards */}

          {!loading && !error && items.length > 0 && (
            <>
              <div className={styles.productList}>
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>

              {/* Pagination */}

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Paginering">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    aria-label="Vorige pagina"
                  >
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
