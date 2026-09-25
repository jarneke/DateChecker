"use client";
import { upload } from "@vercel/blob/client";
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
type Category = { id: string; name: string };
type CheckType = "daily" | "monthly";
function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSize = 800;
      let width = image.naturalWidth;
      let height = image.naturalHeight;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height / width) * maxSize);
          width = maxSize;
        } else {
          width = Math.round((width / height) * maxSize);
          height = maxSize;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Afbeelding kon niet verwerkt worden."));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Afbeelding kon niet gecomprimeerd worden."));
            return;
          }
          const compressedFile = new File(
            [blob],
            `${file.name.replace(/\.[^/.]+$/, "")}.webp`,
            { type: "image/webp", lastModified: Date.now() },
          );
          resolve(compressedFile);
        },
        "image/webp",
        0.8,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Afbeelding kon niet gelezen worden."));
    };
    image.src = objectUrl;
  });
}
export default function NewItemPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [checkType, setCheckType] = useState<CheckType>("daily");
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
    if (!name.trim() || !expiryDate || !categoryId || !checkType) {
      setError("Vul alle verplichte velden in.");
      return;
    }
    setLoading(true);
    setError("");
    let itemId: string | null = null;
    let photoUrl: string | null = null;
    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          photo_url: null,
          expiry_date: expiryDate,
          category_id: categoryId,
          sticker_30_percent: checkType === "daily",
        }),
      });
      const itemData = await response.json();
      if (!response.ok) {
        throw new Error(itemData?.error || "Item kon niet toegevoegd worden.");
      }
      itemId = itemData.id;
      if (photo && itemId) {
        const compressedPhoto = await compressImage(photo);
        const blob = await upload(compressedPhoto.name, compressedPhoto, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: JSON.stringify({ itemId }),
        });
        photoUrl = blob.url;
        const photoResponse = await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo_url: photoUrl }),
        });
        if (!photoResponse.ok) {
          const data = await photoResponse.json().catch(() => null);
          throw new Error(
            data?.error || "Foto kon niet aan het item gekoppeld worden.",
          );
        }
      }
      router.push("/stockchecker");
    } catch (error) {
      console.error("Failed to create item:", error);
      if (photoUrl) {
        try {
          await fetch("/api/upload", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: photoUrl }),
          });
        } catch (deleteError) {
          console.error("Failed to clean up uploaded photo:", deleteError);
        }
      }
      if (itemId) {
        try {
          await fetch(`/api/items/${itemId}`, { method: "DELETE" });
        } catch (deleteError) {
          console.error("Failed to clean up item after error:", deleteError);
        }
      }
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
      {" "}
      <Stack spacing={3}>
        {" "}
        <Button
          className="StyledButton3"
          component={Link}
          href="/stockchecker"
          startIcon={<ArrowBackOutlined />}
          sx={{ alignSelf: "flex-start", color: "inherit" }}
        >
          {" "}
          Terug{" "}
        </Button>{" "}
        <Box>
          {" "}
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {" "}
            Nieuw item{" "}
          </Typography>{" "}
          <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
            {" "}
            Voeg een nieuw product toe aan de voorraad.{" "}
          </Typography>{" "}
        </Box>{" "}
        <Box className="StyledBox color-invert">
          {" "}
          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            {" "}
            <Button
              className="StyledButton3"
              component="label"
              variant="outlined"
              size="large"
              startIcon={<CameraAltOutlined />}
              fullWidth
            >
              {" "}
              {photo ? "Andere foto nemen" : "Foto nemen"}{" "}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handlePhotoChange}
              />{" "}
            </Button>{" "}
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
            )}{" "}
            <TextField
              label="Naam"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
            />{" "}
            <TextField
              label="Vervaldatum"
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />{" "}
            <TextField
              select
              label="Categorie"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
              fullWidth
            >
              {" "}
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {" "}
                  {category.name}{" "}
                </MenuItem>
              ))}{" "}
            </TextField>{" "}
            <TextField
              select
              label="Controle"
              value={checkType}
              onChange={(event) =>
                setCheckType(event.target.value as CheckType)
              }
              required
              fullWidth
            >
              {" "}
              <MenuItem value="daily">Dagelijkse check</MenuItem>{" "}
              <MenuItem value="monthly">Maandelijkse check</MenuItem>{" "}
            </TextField>{" "}
            {error && (
              <Typography variant="body2" sx={{ color: "error.main" }}>
                {" "}
                {error}{" "}
              </Typography>
            )}{" "}
            <Button
              className="StyledButton1"
              type="submit"
              variant="contained"
              size="large"
              startIcon={<AddOutlined />}
              disabled={loading}
            >
              {" "}
              {loading ? "Toevoegen..." : "Item toevoegen"}{" "}
            </Button>{" "}
          </Stack>{" "}
        </Box>{" "}
      </Stack>{" "}
    </Container>
  );
}
