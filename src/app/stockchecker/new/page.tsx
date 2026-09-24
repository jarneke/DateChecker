"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");

        if (!response.ok) {
          throw new Error("Categorieën konden niet geladen worden.");
        }

        const data = await response.json();

        setCategories(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Categorieën konden niet geladen worden.",
        );
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Selecteer een geldige afbeelding.");
      return;
    }

    setError("");
    setPhoto(file);

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

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
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/stockchecker"
          startIcon={<ArrowBackOutlinedIcon />}
          sx={{ mb: 3 }}
        >
          Terug
        </Button>

        <Typography variant="h4" sx={{ mb: 3 }}>
          Nieuw item
        </Typography>

        <Box
          component="form"
          onSubmit={handleSubmit}
          className="StyledBox color-invert"
        >
          <Stack spacing={3}>
            {error && <Typography color="error">{error}</Typography>}

            <TextField
              label="Naam"
              value={name}
              onChange={(event) => setName(event.target.value)}
              fullWidth
              required
            />

            <TextField
              select
              label="Categorie"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              fullWidth
              required
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
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
              required
            />

            <Box>
              <Stack spacing={2}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Productfoto
                </Typography>

                {photoPreview && (
                  <Box
                    component="img"
                    src={photoPreview}
                    alt={name || "Productfoto"}
                    sx={{
                      width: "100%",
                      maxHeight: 300,
                      objectFit: "contain",
                      borderRadius: 2,
                    }}
                  />
                )}

                <Button
                  component="label"
                  variant="outlined"
                  size="large"
                  startIcon={<CameraAltOutlinedIcon />}
                  fullWidth
                  disabled={loading}
                >
                  {photoPreview ? "Andere foto nemen" : "Foto nemen"}

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={handlePhotoChange}
                  />
                </Button>

                {photoPreview && (
                  <Button
                    variant="text"
                    color="error"
                    onClick={() => {
                      setPhoto(null);

                      if (photoPreview.startsWith("blob:")) {
                        URL.revokeObjectURL(photoPreview);
                      }

                      setPhotoPreview("");
                    }}
                    disabled={loading}
                  >
                    Foto verwijderen
                  </Button>
                )}
              </Stack>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<AddOutlinedIcon />}
              disabled={loading}
            >
              {loading ? "Aanmaken..." : "Item toevoegen"}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
