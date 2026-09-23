"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type CheckType = "sticker" | "overdue" | "monthly";

type Item = {
  id: string;
  name: string;
  photo_url: string | null;
  expiry_date: string;
  sticker_30_percent: boolean;
  category_id: string;
  category_name: string;
};

const checkConfig: Record<
  CheckType,
  {
    title: string;
    endpoint: string;
    emptyDescription: string;
    instructions: string;
    icon: React.ReactNode;
  }
> = {
  sticker: {
    title: "Dagelijkse controle",
    endpoint: "/api/items/due",
    emptyDescription:
      "Alle items voor de dagelijkse controle zijn gecontroleerd.",
    instructions:
      "Ga naar het aangegeven product in de winkel en controleer de vervaldatum van de aanwezige producten.",
    icon: <LocalOfferOutlinedIcon fontSize="large" />,
  },
  overdue: {
    title: "Te controleren",
    endpoint: "/api/items/overdue",
    emptyDescription:
      "Alle items met een verlopen controledatum zijn gecontroleerd.",
    instructions:
      "Deze controle is eerder gepland maar nog niet uitgevoerd. Zoek het aangegeven product en controleer de aanwezige stock en vervaldatums.",
    icon: <FactCheckOutlinedIcon fontSize="large" />,
  },
  monthly: {
    title: "Maandelijkse controle",
    endpoint: "/api/items/monthly",
    emptyDescription:
      "Alle items voor de maandelijkse controle zijn gecontroleerd.",
    instructions:
      "Zoek het aangegeven product in de winkel en controleer welke vervaldatum momenteel de eerstvolgende is.",
    icon: <CalendarMonthOutlinedIcon fontSize="large" />,
  },
};

function CheckContent() {
  const searchParams = useSearchParams();

  const typeParam = searchParams.get("type");

  const type: CheckType | null =
    typeParam === "sticker" ||
    typeParam === "overdue" ||
    typeParam === "monthly"
      ? typeParam
      : null;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nextExpiryDate, setNextExpiryDate] = useState("");
  const [showDateInput, setShowDateInput] = useState(false);

  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  useEffect(() => {
    if (!type) {
      setLoading(false);
      return;
    }

    const checkType = type;

    async function loadItems() {
      try {
        setLoading(true);
        setError(null);

        const config = checkConfig[checkType];

        const res = await fetch(config.endpoint, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Items konden niet geladen worden.");
        }

        const data = await res.json();

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
  }, [type]);

  function handleNewStock() {
    setShowDateInput(true);
  }

  function handleSkip() {
    if (!currentItem) return;

    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== currentItem.id),
    );
  }

  async function handleChecked() {
    if (!currentItem || !nextExpiryDate || saving) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/items/${currentItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expiry_date: nextExpiryDate,
        }),
      });

      if (!res.ok) {
        throw new Error("Item kon niet opgeslagen worden.");
      }

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== currentItem.id),
      );

      setNextExpiryDate("");
      setShowDateInput(false);
    } catch (error) {
      console.error(error);
      setError("Het item kon niet opgeslagen worden.");
    } finally {
      setSaving(false);
    }
  }

  if (!type) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Ongeldige controle
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Geen geldige controle geselecteerd.
              </Typography>
            </Box>

            <Button
              className="StyledButton1"
              component={Link}
              href="/"
              variant="outlined"
              startIcon={<ArrowBackIcon />}
            >
              Terug naar home
            </Button>
          </Stack>
        </Box>
      </Container>
    );
  }

  const config = checkConfig[type];
  const currentItem = items[0];

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ py: 6 }}>
          <Typography>Items laden...</Typography>
        </Box>
      </Container>
    );
  }

  if (error && items.length === 0) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Stack spacing={3} sx={{ width: "100%" }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Er ging iets mis
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {error}
              </Typography>
            </Box>

            <Button
              className="StyledButton1"
              component={Link}
              href="/"
              variant="outlined"
              startIcon={<ArrowBackIcon />}
            >
              Terug naar home
            </Button>
          </Stack>
        </Box>
      </Container>
    );
  }

  if (!currentItem) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Stack spacing={3} sx={{ width: "100%" }}>
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                }}
              >
                Alles gecontroleerd
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {config.emptyDescription}
              </Typography>
            </Box>

            <Button
              className="StyledButton1"
              component={Link}
              href="/"
              variant="outlined"
              startIcon={<ArrowBackIcon />}
            >
              Terug naar home
            </Button>
          </Stack>
        </Box>
      </Container>
    );
  }

  const expiryDate = new Date(currentItem.expiry_date);

  const expiryDateString = expiryDate.toLocaleDateString("en-CA", {
    timeZone: "Europe/Brussels",
  });

  const missedCheck = expiryDateString < todayString;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          py: 4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Button
          className="StyledButton3"
          component={Link}
          href="/"
          startIcon={<ArrowBackIcon />}
          sx={{
            alignSelf: "flex-start",
            mb: 4,
          }}
        >
          Terug
        </Button>

        <Stack
          spacing={3}
          sx={{
            flex: 1,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
              }}
            >
              {config.title}
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {items.length} {items.length === 1 ? "item" : "items"} te
              controleren
            </Typography>
          </Box>

          <Box
            className="StyledBox"
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.06)",
            }}
          >
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 700 }}>
                Stap 1 — Zoek het product
              </Typography>

              <Typography color="text.secondary">
                {config.instructions}
              </Typography>
            </Stack>
          </Box>

          {error && (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "error.main",
                color: "error.contrastText",
              }}
            >
              <Typography>{error}</Typography>
            </Box>
          )}

          <Box className="StyledBox color-invert">
            <Stack spacing={3}>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                }}
              >
                {config.icon}

                <Box>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    {currentItem.name}
                  </Typography>

                  <Typography color="text.secondary">
                    {currentItem.category_name}
                  </Typography>
                </Box>
              </Stack>

              {currentItem.photo_url && (
                <Box
                  component="img"
                  src={currentItem.photo_url}
                  alt={currentItem.name}
                  sx={{
                    width: "100%",
                    maxHeight: 300,
                    objectFit: "contain",
                    borderRadius: 2,
                  }}
                />
              )}

              <Box>
                {missedCheck && (
                  <Box
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: "error.light",
                      color: "error.contrastText",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>
                      Vervaldatum verstreken
                    </Typography>

                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Controleer de facing op producten met vervaldatum{" "}
                      {new Date(currentItem.expiry_date).toLocaleDateString(
                        "nl-BE",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          timeZone: "Europe/Brussels",
                        },
                      )}
                      .
                    </Typography>
                  </Box>
                )}

                <Typography color="text.secondary">
                  Huidige vervaldatum
                </Typography>

                <Typography
                  sx={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  {new Date(currentItem.expiry_date).toLocaleDateString(
                    "nl-BE",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      timeZone: "Europe/Brussels",
                    },
                  )}
                </Typography>
              </Box>

              {!showDateInput ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      Stap 2 — Controleer de stock
                    </Typography>

                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Kijk of er nieuwe producten aanwezig zijn met een latere
                      vervaldatum.
                    </Typography>
                  </Box>

                  <Button
                    className="StyledButton1"
                    variant="contained"
                    size="large"
                    onClick={handleNewStock}
                  >
                    Ja, nieuwe stock
                  </Button>

                  <Box>
                    <Button
                      className="StyledButton2"
                      variant="outlined"
                      size="large"
                      onClick={handleSkip}
                      fullWidth
                    >
                      Nee, geen nieuwe stock
                    </Button>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        textAlign: "center",
                      }}
                    >
                      Geen nieuwe stock gevonden? Kies deze optie om verder te
                      gaan naar het volgende item.
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      Stap 3 — Noteer de nieuwe vervaldatum
                    </Typography>

                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Vul de eerstvolgende vervaldatum in die je op de nieuwe
                      stock vindt.
                    </Typography>
                  </Box>

                  <TextField
                    label="Eerstvolgende vervaldatum"
                    type="date"
                    value={nextExpiryDate}
                    onChange={(event) => setNextExpiryDate(event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                      htmlInput: {
                        min: todayString,
                      },
                    }}
                    fullWidth
                  />

                  <Button
                    className="StyledButton1"
                    variant="contained"
                    size="large"
                    startIcon={<CheckIcon />}
                    onClick={handleChecked}
                    disabled={!nextExpiryDate || saving}
                    fullWidth
                  >
                    {saving ? "Opslaan..." : "Gecontroleerd"}
                  </Button>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: "center" }}
                  >
                    Na het opslaan wordt dit item als gecontroleerd beschouwd en
                    ga je verder met het volgende item.
                  </Typography>

                  <Button
                    className="StyledButton2"
                    variant="outlined"
                    onClick={() => {
                      setShowDateInput(false);
                      setNextExpiryDate("");
                    }}
                    disabled={saving}
                  >
                    Terug
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Container>
  );
}

function CheckPageFallback() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 6 }}>
        <Typography>Controle laden...</Typography>
      </Box>
    </Container>
  );
}

export default function CheckPage() {
  return (
    <Suspense fallback={<CheckPageFallback />}>
      <CheckContent />
    </Suspense>
  );
}
