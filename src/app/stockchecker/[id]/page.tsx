"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  Container,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";

type Category = {
  id: string;
  name: string;
};

type Item = {
  id: string;
  name: string;
  photo_url: string | null;
  category_id: string;
  expiry_date: string;
  sticker_30_percent: boolean;
  category_name: string | null;
};

export default function ItemDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [itemResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/items/${id}`),
          fetch("/api/categories"),
        ]);

        if (!itemResponse.ok) {
          throw new Error("Item not found");
        }

        const itemData = await itemResponse.json();
        const categoriesData = await categoriesResponse.json();

        setItem(itemData);
        setCategories(categoriesData);
      } catch {
        setError("Kon item niet laden.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleSave() {
    if (!item) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: item.name,
          photo_url: item.photo_url,
          category_id: item.category_id,
          expiry_date: item.expiry_date,
          sticker_30_percent: item.sticker_30_percent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      const updatedItem = await response.json();
      setItem((current) => ({
        ...current!,
        ...updatedItem,
      }));

      router.refresh();
    } catch {
      setError("Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) return;

    const confirmed = window.confirm(
      `Weet je zeker dat je "${item.name}" wilt verwijderen?`,
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      router.push("/stockchecker");
    } catch {
      setError("Verwijderen mislukt.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography>Laden...</Typography>
        </Box>
      </Container>
    );
  }

  if (!item) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Typography variant="h5">Item niet gevonden</Typography>

          <Button
            component={Link}
            href="/stockchecker"
            startIcon={<ArrowBackOutlined />}
            sx={{ mt: 2 }}
          >
            Terug naar overzicht
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/stockchecker"
          startIcon={<ArrowBackOutlined />}
          sx={{ mb: 3 }}
        >
          Terug
        </Button>

        <Typography variant="h4" sx={{ mb: 3 }}>
          Item aanpassen
        </Typography>

        <Box className="StyledBox color-invert">
          <Stack spacing={3}>
            {error && <Typography color="error">{error}</Typography>}

            <TextField
              label="Naam"
              value={item.name}
              onChange={(event) =>
                setItem({
                  ...item,
                  name: event.target.value,
                })
              }
              fullWidth
            />

            <TextField
              select
              label="Categorie"
              value={item.category_id}
              onChange={(event) =>
                setItem({
                  ...item,
                  category_id: event.target.value,
                })
              }
              fullWidth
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Vervaldatum"
              type="date"
              value={item.expiry_date?.split("T")[0] ?? ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  expiry_date: event.target.value,
                })
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />

            <TextField
              label="Foto URL"
              value={item.photo_url ?? ""}
              onChange={(event) =>
                setItem({
                  ...item,
                  photo_url: event.target.value || null,
                })
              }
              fullWidth
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography>30% sticker</Typography>

                <Typography variant="body2" color="text.secondary">
                  Item krijgt de 30% sticker-routine.
                </Typography>
              </Box>

              <Switch
                checked={item.sticker_30_percent}
                onChange={(event) =>
                  setItem({
                    ...item,
                    sticker_30_percent: event.target.checked,
                  })
                }
              />
            </Box>

            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                startIcon={<SaveOutlined />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Opslaan..." : "Opslaan"}
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={saving}
              >
                Item verwijderen
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
