"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";

type Product = {
  id: string;
  name: string;
};

export default function ImageLinkerPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProduct();
  }, []);

  async function loadProduct() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/image-linker", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load product");
      }

      const data = await response.json();
      setProduct(data.product ?? null);
    } catch {
      setError("Failed to load product.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Container maxWidth="sm" className="py-12 text-center">
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" className="py-12">
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container maxWidth="sm" className="py-12">
        <Typography variant="h5" className="mb-2 font-bold">
          Image Linker
        </Typography>

        <Typography color="text.secondary">All items have an image.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" className="py-12">
      <Typography variant="h5" className="mb-2 font-bold">
        Image Linker
      </Typography>

      <Typography color="text.secondary" className="mb-8">
        Find this product in the store and take a picture of it.
      </Typography>

      <Card>
        <CardContent>
          <Typography
            variant="h4"
            className="mb-6 break-words font-bold"
          >
            {product.name}
          </Typography>

          <Stack spacing={2}>
            <Button
              component={Link}
              href={`/stockchecker/${product.id}?returnTo=/admin/imagelinker`}
              variant="contained"
              fullWidth
            >
              Open item
            </Button>

            <Button component={Link} href="/admin" variant="outlined" fullWidth>
              Back to admin
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
