"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Button,
  Container,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CameraAltOutlined from "@mui/icons-material/CameraAltOutlined";

type Category = {
  id: string;
  name: string;
};

export default function NewItemPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories");

        if (!response.ok) {
          throw new Error("Failed to load categories");
        }

        const data = await response.json();
        setCategories(data);
      } catch {
        setError("Categorieën konden niet geladen worden.");
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !expiryDate || !categoryId) {
      setError("Vul alle verplichte velden in.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let photoUrl: string | null = null;

      if (photo) {
        const formData = new FormData();
        formData.append("file", photo);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const data = await uploadResponse.json().catch(() => null);

          throw new Error(data?.error || "Foto kon niet geüpload worden.");
        }

        const uploadData = await uploadResponse.json();
        photoUrl = uploadData.url;
      }

      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          photo_url: photoUrl,
          expiry_date: expiryDate,
          category_id: categoryId,
          sticker_30_percent: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.error || "Item kon niet toegevoegd worden.");
      }

      router.push("/stockchecker");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Item kon niet toegevoegd worden.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href="/stockchecker"
          startIcon={<ArrowBackOutlined />}
          sx={{
            alignSelf: "flex-start",
            color: "inherit",
          }}
        >
          Terug
        </Button>

        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Nieuw item
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
            Voeg een nieuw product toe aan de voorraad.
          </Typography>
        </Box>

        <Box className="StyledBox color-invert">
          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            <TextField
              label="Naam"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
            />

            <Button
              component="label"
              variant="outlined"
              size="large"
              startIcon={<CameraAltOutlined />}
              fullWidth
            >
              {photo ? "Andere foto nemen" : "Foto nemen"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhotoChange}
              />
            </Button>

            {photoPreview && (
              <Box
                component="img"
                src={photoPreview}
                alt="Voorbeeld van productfoto"
                sx={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "cover",
                  borderRadius: 2,
                }}
              />
            )}

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

            {error && (
              <Typography variant="body2" sx={{ color: "error.main" }}>
                {error}
              </Typography>
            )}

            <Button
              className="StyledButton1"
              type="submit"
              variant="contained"
              size="large"
              startIcon={<AddOutlined />}
              disabled={loading}
            >
              {loading ? "Toevoegen..." : "Item toevoegen"}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}
