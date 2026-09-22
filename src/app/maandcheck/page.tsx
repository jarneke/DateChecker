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
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
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

export default function MaandcheckPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nextExpiryDate, setNextExpiryDate] = useState("");
  const [showDateInput, setShowDateInput] = useState(false);
  const [daysBeforeEnd, setDaysBeforeEnd] = useState<number | null>(null);

  useEffect(() => {
    async function loadItems() {
      try {
        setError(null);

        const settingsRes = await fetch("/api/settings", {
          cache: "no-store",
        });

        if (!settingsRes.ok) {
          throw new Error("Instellingen konden niet geladen worden.");
        }

        const settings = await settingsRes.json();
        const days = settings.monthCheckDaysBeforeEnd;

        setDaysBeforeEnd(days);

        const itemsRes = await fetch(
          `/api/items/month-check?daysBeforeEnd=${days}`,
          {
            cache: "no-store",
          },
        );

        if (!itemsRes.ok) {
          throw new Error("Items konden niet geladen worden.");
        }

        const data = await itemsRes.json();

        if (!Array.isArray(data)) {
          throw new Error("Ongeldige data ontvangen.");
        }

        setItems(data);
      } catch (error) {
        console.error(error);
        setError("De maandcontrole kon niet geladen worden.");
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

    setItems((currentItems) => [...currentItems.slice(1), currentItem]);

    setNextExpiryDate("");
    setShowDateInput(false);
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
        <Box
          sx={{
            minHeight: "100vh",
            py: 4,
          }}
        >
          <Typography color="text.secondary">Maandcontrole laden...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "100vh",
            py: 4,
          }}
        >
          <Stack spacing={3}>
            <Button
              component={Link}
              href="/"
              startIcon={<ArrowBackIcon />}
              sx={{
                alignSelf: "flex-start",
              }}
            >
              Terug
            </Button>

            <Typography color="error">{error}</Typography>
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
            py: 4,
          }}
        >
          <Stack spacing={3}>
            <Button
              component={Link}
              href="/"
              startIcon={<ArrowBackIcon />}
              sx={{
                alignSelf: "flex-start",
              }}
            >
              Terug
            </Button>

            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Maandcontrole klaar
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Er zijn momenteel geen items voor de maandcontrole.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Stack spacing={3}>
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            sx={{
              alignSelf: "flex-start",
            }}
          >
            Terug
          </Button>

          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Maandcontrole
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {daysBeforeEnd} dagen voor het einde van de maand.
            </Typography>
          </Box>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={3}>
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
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{ fontWeight: 700 }}
                  >
                    {currentItem.name}
                  </Typography>

                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {currentItem.category_name}
                  </Typography>

                  <Typography sx={{ mt: 2 }}>
                    Huidige vervaldatum:{" "}
                    <strong>{currentItem.expiry_date}</strong>
                  </Typography>
                </Box>

                {!showDateInput ? (
                  <Stack spacing={2}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Inventory2OutlinedIcon />}
                      onClick={handleNewStock}
                      fullWidth
                    >
                      Nieuwe voorraad
                    </Button>

                    <Button
                      variant="outlined"
                      size="large"
                      onClick={handleSkip}
                      fullWidth
                    >
                      Nee, overslaan
                    </Button>
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <TextField
                      label="Nieuwe vervaldatum"
                      type="date"
                      value={nextExpiryDate}
                      onChange={(event) =>
                        setNextExpiryDate(event.target.value)
                      }
                      slotProps={{
                        inputLabel: {
                          shrink: true,
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
                      variant="outlined"
                      onClick={() => {
                        setShowDateInput(false);
                        setNextExpiryDate("");
                      }}
                      disabled={saving}
                      fullWidth
                    >
                      Annuleren
                    </Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Typography color="text.secondary" sx={{ textAlign: "center" }}>
            {items.length} {items.length === 1 ? "item" : "items"} resterend
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
}
