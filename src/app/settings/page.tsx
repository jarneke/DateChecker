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
import SaveIcon from "@mui/icons-material/Save";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [daysBeforeEnd, setDaysBeforeEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Instellingen konden niet geladen worden.");
        }

        const data = await res.json();

        setDaysBeforeEnd(String(data.monthCheckDaysBeforeEnd));
      } catch (error) {
        console.error(error);
        setError("Instellingen konden niet geladen worden.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave() {
    const value = Number(daysBeforeEnd);

    if (!Number.isInteger(value) || value < 0 || value > 31 || saving) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          monthCheckDaysBeforeEnd: value,
        }),
      });

      if (!res.ok) {
        throw new Error("Instellingen konden niet opgeslagen worden.");
      }

      setSaved(true);
    } catch (error) {
      console.error(error);
      setError("Instellingen konden niet opgeslagen worden.");
    } finally {
      setSaving(false);
    }
  }

  const value = Number(daysBeforeEnd);
  const isValid =
    daysBeforeEnd !== "" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 31;

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          py: 4,
        }}
      >
        <Stack spacing={4}>
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
              Instellingen
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Stel in wanneer de maandcontrole moet starten.
            </Typography>
          </Box>

          {loading ? (
            <Typography color="text.secondary">
              Instellingen laden...
            </Typography>
          ) : (
            <Box sx={{ bgcolor: "background.paper", p: 2 }}>
              <Stack spacing={2}>
                <TextField
                  label="Dagen voor einde maand"
                  type="number"
                  value={daysBeforeEnd}
                  onChange={(event) => {
                    setDaysBeforeEnd(event.target.value);
                    setSaved(false);
                  }}
                  helperText="Bijvoorbeeld 5 = de maandcontrole start 5 dagen voor het einde van de maand."
                  error={!isValid}
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: 31,
                    },
                  }}
                  fullWidth
                />

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={!isValid || saving}
                  fullWidth
                >
                  {saving ? "Opslaan..." : "Opslaan"}
                </Button>

                {saved && (
                  <Typography color="success.main" sx={{ textAlign: "center" }}>
                    Instellingen opgeslagen.
                  </Typography>
                )}

                {error && (
                  <Typography color="error" sx={{ textAlign: "center" }}>
                    {error}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
