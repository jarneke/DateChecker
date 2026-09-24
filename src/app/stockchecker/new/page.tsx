"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  Box,
  Button,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";

type Category = {
  id: string;
  name: string;
};

export default function NewItemPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useState(() => {
    fetch("/api/categories")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        return response.json();
      })
      .then((data) => {
        setCategories(data);
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Categorieën konden niet geladen worden.",
        );
      });
  });

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !categoryId || !expiryDate) {
      setError("Vul alle verplichte velden in.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const itemResponse = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          expiry_date: expiryDate,
          category_id: categoryId,
          sticker_30_percent: false,
          photo_url: null,
        }),
      });

      const itemData = await itemResponse.json();

      if (!itemResponse.ok) {
        throw new Error(itemData?.error || "Item kon niet aangemaakt worden.");
      }

      const itemId = itemData.id;

      if (photo) {
        await upload(photo.name, photo, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({
            itemId,
          }),
        });
      }

      router.push("/stockchecker");
      router.refresh();
    } catch (err) {
      console.error("Failed to create item:", err);

      setError(
        err instanceof Error ? err.message : "Item kon niet aangemaakt worden.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Button
            component={Link}
            href="/stockchecker"
            startIcon={<ArrowBackOutlinedIcon />}
            sx={{
              color: "text.secondary",
              textTransform: "none",
              mb: 2,
            }}
          >
            Terug
          </Button>

          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Nieuw item
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Voeg een product toe aan de voorraadcontrole.
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            label="Naam"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
          />

          <TextField
            select
            label="Categorie"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
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
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
            required
            fullWidth
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CameraAltOutlinedIcon />}
              fullWidth
              sx={{
                minHeight: 52,
                textTransform: "none",
              }}
            >
              {photo ? "Foto wijzigen" : "Foto toevoegen"}
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handlePhotoChange}
              />
            </Button>

            {photoPreview && (
              <Box
                component="img"
                src={photoPreview}
                alt="Voorbeeld van gekozen foto"
                sx={{
                  display: "block",
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "contain",
                  borderRadius: 2,
                  mt: 2,
                }}
              />
            )}
          </Box>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={<AddOutlinedIcon />}
            sx={{
              minHeight: 52,
              textTransform: "none",
            }}
          >
            {loading ? "Bezig met opslaan..." : "Item toevoegen"}
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}
