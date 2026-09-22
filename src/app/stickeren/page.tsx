"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  name: string;
  photo_url: string | null;
  expiry_date: string;
  sticker_30_percent: boolean;
  category_id: string;
  category_name: string;
};

export default function StickerenPage() {
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
    async function loadItems() {
      try {
        setError(null);

        const res = await fetch("/api/items/due", {
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
  }, []);

  const currentItem = items[0];

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
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                }}
              >
                Er ging iets mis
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 1,
                }}
              >
                {error}
              </Typography>
            </Box>

            <Button
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
                sx={{
                  fontWeight: 700,
                }}
              >
                Alles gecontroleerd
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 1,
                }}
              >
                Alle items voor de dagelijkse 30%-controle zijn gecontroleerd.
              </Typography>
            </Box>

            <Button
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
              Dagelijkse 30%-controle
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1,
              }}
            >
              {items.length} {items.length === 1 ? "item" : "items"} te
              controleren
            </Typography>
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

          <Card
            sx={{
              borderRadius: 3,
            }}
          >
            <CardContent
              sx={{
                p: 4,
              }}
            >
              <Stack spacing={3}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                  }}
                >
                  <LocalOfferOutlinedIcon fontSize="large" />

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
                        color: "error.dark",
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
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        Is er nieuwe stock? Noteer dan de eerstvolgende
                        vervaldatum.
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
                    <Typography
                      sx={{
                        fontWeight: 600,
                      }}
                    >
                      Is er nieuwe stock aanwezig?
                    </Typography>

                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleNewStock}
                    >
                      Ja, nieuwe stock
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleSkip}
                    >
                      Nee, overslaan
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      label="Eerst volgende vervaldatum"
                      type="date"
                      value={nextExpiryDate}
                      onChange={(event) =>
                        setNextExpiryDate(event.target.value)
                      }
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
                      variant="contained"
                      size="large"
                      startIcon={<CheckIcon />}
                      onClick={handleChecked}
                      disabled={!nextExpiryDate || saving}
                      fullWidth
                    >
                      {saving ? "Opslaan..." : "Gecontroleerd"}
                    </Button>

                    <Button
                      variant="text"
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

                <Typography
                  color="text.secondary"
                  sx={{
                    textAlign: "center",
                    fontSize: "0.875rem",
                  }}
                >
                  {items.length > 0 ? `1 / ${items.length}` : ""}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Container>
  );
}
