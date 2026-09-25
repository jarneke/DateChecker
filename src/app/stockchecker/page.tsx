"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useState } from "react";
import Image from "next/image";

type Item = {
  id: string;
  name: string;
  photo_url: string | null;
  expiry_date: string;
  sticker_30_percent: boolean;
  category_id: string;
  category_name: string | null;
};

type ControlFilter = "all" | "30" | "month";
type DateFilterMode = "exact" | "range";

type SortOption =
  | "name_asc"
  | "name_desc"
  | "expiry_asc"
  | "expiry_desc"
  | "category_asc"
  | "category_desc";

type ItemsResponse = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 10;

export default function StockCheckerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [controlFilter, setControlFilter] = useState<ControlFilter>("all");

  const [sort, setSort] = useState<SortOption>("name_asc");

  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("exact");

  const [exactDate, setExactDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    controlFilter,
    sort,
    exactDate,
    fromDate,
    toDate,
    dateFilterMode,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadItems();
    }, 300);

    return () => clearTimeout(timeout);
  }, [
    page,
    search,
    controlFilter,
    sort,
    exactDate,
    fromDate,
    toDate,
    dateFilterMode,
  ]);

  async function loadItems() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("sort", sort);

      if (search.trim()) {
        params.set("search", search.trim());
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
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error("API /items error:", errorText);

        throw new Error("Items konden niet geladen worden.");
      }

      const data: ItemsResponse = await response.json();

      if (!Array.isArray(data.items)) {
        throw new Error("Ongeldige data ontvangen.");
      }

      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error(error);
      setError("Items konden niet geladen worden.");
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("nl-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Brussels",
    });
  }

  function clearFilters() {
    setSearch("");
    setControlFilter("all");
    setSort("name_asc");
    setDateFilterMode("exact");
    setExactDate("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  const filtersActive =
    search !== "" ||
    controlFilter !== "all" ||
    sort !== "name_asc" ||
    exactDate !== "" ||
    fromDate !== "" ||
    toDate !== "";

  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const lastItem = Math.min(page * PAGE_SIZE, total);

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages || newPage === page) {
      return;
    }

    setPage(newPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function getPageNumbers() {
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }

      return pages;
    }

    pages.push(1);

    if (page > 4) {
      pages.push("...");
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ minHeight: "100vh", py: 4 }}>
        <Stack spacing={4}>
          <Stack
            spacing={3}
            direction="row"
            sx={{
              justifyContent: "space-between",
            }}
          >
            <Button
              className="StyledButton3"
              component={Link}
              href="/"
              startIcon={<ArrowBackIcon />}
            >
              Terug
            </Button>

            <Button
              className="StyledButton3"
              component={Link}
              href="/stockchecker/new"
              variant="contained"
              startIcon={<AddIcon />}
            >
              Nieuw item
            </Button>
          </Stack>

          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Stock checker
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Zoek en controleer producten en hun vervaldatums.
            </Typography>
          </Box>

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <TextField
                label="Zoek product"
                placeholder="Bijvoorbeeld melk..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ mr: 1 }} />,
                  },
                }}
              />

              <FormControl fullWidth>
                <InputLabel>Controle</InputLabel>

                <Select
                  value={controlFilter}
                  label="Controle"
                  onChange={(event) =>
                    setControlFilter(event.target.value as ControlFilter)
                  }
                >
                  <MenuItem value="all">Alle Controles</MenuItem>

                  <MenuItem value="30">Dagelijkse controle</MenuItem>

                  <MenuItem value="month">Maandelijkse controle</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Sorteren</InputLabel>

                <Select
                  value={sort}
                  label="Sorteren"
                  onChange={(event) =>
                    setSort(event.target.value as SortOption)
                  }
                >
                  <MenuItem value="name_asc">Naam A-Z</MenuItem>

                  <MenuItem value="name_desc">Naam Z-A</MenuItem>

                  <MenuItem value="expiry_asc">
                    Vervaldatum: vroeg → laat
                  </MenuItem>

                  <MenuItem value="expiry_desc">
                    Vervaldatum: laat → vroeg
                  </MenuItem>

                  <MenuItem value="category_asc">Categorie A-Z</MenuItem>

                  <MenuItem value="category_desc">Categorie Z-A</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2">Datumfilter</Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color={
                        dateFilterMode === "exact"
                          ? "text.primary"
                          : "text.secondary"
                      }
                    >
                      Exacte datum
                    </Typography>

                    <Switch
                      checked={dateFilterMode === "range"}
                      onChange={(event) =>
                        setDateFilterMode(
                          event.target.checked ? "range" : "exact",
                        )
                      }
                    />

                    <Typography
                      variant="body2"
                      color={
                        dateFilterMode === "range"
                          ? "text.primary"
                          : "text.secondary"
                      }
                    >
                      Tussen datums
                    </Typography>
                  </Box>
                </Box>

                {dateFilterMode === "exact" ? (
                  <TextField
                    label="Vervaldatum"
                    type="date"
                    value={exactDate}
                    onChange={(event) => setExactDate(event.target.value)}
                    fullWidth
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />
                ) : (
                  <Stack
                    direction={{
                      xs: "column",
                      sm: "row",
                    }}
                    spacing={2}
                  >
                    <TextField
                      label="Vanaf datum"
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      fullWidth
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />

                    <TextField
                      label="Tot datum"
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      fullWidth
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />
                  </Stack>
                )}
              </Box>

              <Button
                className="StyledButton3"
                variant="outlined"
                onClick={clearFilters}
                disabled={!filtersActive}
              >
                Filters wissen
              </Button>
            </Stack>
          </Box>

          {loading && (
            <Typography color="text.secondary">Items laden...</Typography>
          )}

          {error && <Typography color="error">{error}</Typography>}

          {!loading && !error && (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Typography color="text.secondary">
                  {total === 0
                    ? "Geen items"
                    : `${firstItem}-${lastItem} van ${total} ${
                        total === 1 ? "item" : "items"
                      }`}
                </Typography>

                {totalPages > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    Pagina {page} van {totalPages}
                  </Typography>
                )}
              </Box>

              {items.map((item) => (
                <Box
                  className="StyledBox color-invert"
                  key={item.id}
                  component={Link}
                  href={`/stockchecker/${item.id}`}
                  sx={{
                    display: "flex",
                    gap: 2,
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "transform 0.15s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {item.photo_url ? (
                    <Image
                      src={item.photo_url}
                      alt={item.name}
                      width={100}
                      height={100}
                      loading="lazy"
                      sizes="100px"
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: "cover",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: 2,
                        backgroundColor: "action.hover",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          textAlign: "center",
                        }}
                      >
                        Geen foto
                      </Typography>
                    </Box>
                  )}

                  <Stack
                    spacing={1}
                    sx={{
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      className="color-invert"
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </Typography>

                    <Typography className="color-invert" color="text.secondary">
                      {item.category_name ?? "Geen categorie"}
                    </Typography>

                    <Typography className="color-invert">
                      Vervaldatum:{" "}
                      <strong>{formatDate(item.expiry_date)}</strong>
                    </Typography>

                    <Typography
                      className="color-invert"
                      variant="body2"
                      color="text.secondary"
                    >
                      {item.sticker_30_percent
                        ? "Dagelijkse Controle"
                        : "Maandcontrole"}
                    </Typography>
                  </Stack>
                </Box>
              ))}

              {items.length === 0 && (
                <Typography color="text.secondary">
                  Geen items gevonden met deze filters.
                </Typography>
              )}

              {totalPages > 1 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    pt: 2,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Button
                    className="StyledButton3"
                    variant="outlined"
                    size="small"
                    disabled={page === 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    Vorige
                  </Button>

                  {getPageNumbers().map((pageNumber, index) =>
                    pageNumber === "..." ? (
                      <Typography
                        key={`ellipsis-${index}`}
                        sx={{
                          px: 1,
                        }}
                      >
                        ...
                      </Typography>
                    ) : (
                      <Button
                        className={
                          pageNumber === page
                            ? "StyledButton1"
                            : "StyledButton3"
                        }
                        key={pageNumber}
                        variant={pageNumber === page ? "contained" : "outlined"}
                        size="small"
                        onClick={() => goToPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    ),
                  )}

                  <Button
                    className="StyledButton3"
                    variant="outlined"
                    size="small"
                    disabled={page === totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    Volgende
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
