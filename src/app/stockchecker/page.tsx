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
import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name: string;
  photo_url: string | null;
  expiry_date: string;
  sticker_30_percent: boolean;
  category_id: string;
  category_name: string;
};

type ControlFilter = "all" | "30" | "month";
type DateFilterMode = "exact" | "range";

export default function StockCheckerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [controlFilter, setControlFilter] = useState<ControlFilter>("all");

  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("exact");

  const [exactDate, setExactDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    async function loadItems() {
      try {
        setError(null);

        const response = await fetch("/api/items", {
          cache: "no-store",
        });

        if (!response.ok) {
          const error = await response.text();
          console.error("API /items error:", error);
          throw new Error(`Items konden niet geladen worden: ${error}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Ongeldige data ontvangen.");
        }

        setItems(data);
      } catch (error) {
        console.error(error);
        setError("Items konden niet geladen worden.");
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, []);

  function getDateString(date: string) {
    return new Date(date).toLocaleDateString("en-CA", {
      timeZone: "Europe/Brussels",
    });
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("nl-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Brussels",
    });
  }

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const itemDate = getDateString(item.expiry_date);

      const matchesSearch =
        !normalizedSearch || item.name.toLowerCase().includes(normalizedSearch);

      const matchesControl =
        controlFilter === "all" ||
        (controlFilter === "30" && item.sticker_30_percent) ||
        (controlFilter === "month" && !item.sticker_30_percent);

      const matchesDate =
        dateFilterMode === "exact"
          ? !exactDate || itemDate === exactDate
          : (!fromDate || itemDate >= fromDate) &&
            (!toDate || itemDate <= toDate);

      return matchesSearch && matchesControl && matchesDate;
    });
  }, [
    items,
    search,
    controlFilter,
    dateFilterMode,
    exactDate,
    fromDate,
    toDate,
  ]);

  function clearFilters() {
    setSearch("");
    setControlFilter("all");
    setDateFilterMode("exact");
    setExactDate("");
    setFromDate("");
    setToDate("");
  }

  const filtersActive =
    search !== "" ||
    controlFilter !== "all" ||
    exactDate !== "" ||
    fromDate !== "" ||
    toDate !== "";

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
              component={Link}
              href="/"
              startIcon={<ArrowBackIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              Terug
            </Button>
            <Button
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
                  <MenuItem value="all">Alle controles</MenuItem>

                  <MenuItem value="30">30%-controle</MenuItem>

                  <MenuItem value="month">Maandcontrole</MenuItem>
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
                      inputLabel: { shrink: true },
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
                        inputLabel: { shrink: true },
                      }}
                    />

                    <TextField
                      label="Tot datum"
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      fullWidth
                      slotProps={{
                        inputLabel: { shrink: true },
                      }}
                    />
                  </Stack>
                )}
              </Box>

              <Button
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
              <Typography color="text.secondary">
                {filteredItems.length}{" "}
                {filteredItems.length === 1 ? "item" : "items"}
              </Typography>

              {filteredItems.map((item) => (
                <Box
                  className="StyledBox color-invert"
                  key={item.id}
                  component={Link}
                  href={`/stockchecker/${item.id}`}
                  sx={{
                    textDecoration: "none",
                    color: "inherit",
                    transition: "transform 0.15s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Stack spacing={1}>
                    <Typography
                      className="color-invert"
                      variant="h6"
                      sx={{ fontWeight: 700 }}
                    >
                      {item.name}
                    </Typography>

                    <Typography className="color-invert" color="text.secondary">
                      {item.category_name}
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
                        ? "30%-controle"
                        : "Maandcontrole"}
                    </Typography>
                  </Stack>
                </Box>
              ))}

              {filteredItems.length === 0 && (
                <Typography color="text.secondary">
                  Geen items gevonden met deze filters.
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
