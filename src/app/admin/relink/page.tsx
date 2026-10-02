"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from "@mui/material";

type ImageItem = {
  url: string;
  path: string;
};

type Product = {
  id: string;
  name: string;
};

export default function RelinkPage() {
  const [image, setImage] = useState<ImageItem | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImage();
    loadProducts();
  }, []);

  useEffect(() => {
    if (!loading && image) {
      searchRef.current?.focus();
    }
  }, [loading, image]);

  async function loadImage() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/relink/images", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load image");
      }

      const data = await response.json();

      setImage(data.images?.[0] ?? null);
    } catch {
      setError("Failed to load image.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      setProductsLoading(true);

      const response = await fetch("/api/relink/products", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();
      setProducts(data.products);
    } catch {
      setError("Failed to load products.");
    } finally {
      setProductsLoading(false);
    }
  }

  async function linkProduct(product: Product) {
    if (!image || linking) {
      return;
    }

    try {
      setLinking(true);
      setError("");

      const response = await fetch("/api/relink/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          imageUrl: image.url,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to link image");
      }

      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to link image.",
      );
      setLinking(false);
    }
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <Container maxWidth="sm" className="py-12 text-center">
        <CircularProgress />
      </Container>
    );
  }

  if (!image) {
    return (
      <Container maxWidth="sm" className="py-12">
        <Typography variant="h5" gutterBottom className="font-bold">
          Relink
        </Typography>

        <Typography color="text.secondary">
          All images have been linked.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" className="py-8">
      <Typography variant="h5" gutterBottom className="font-bold">
        Relink images
      </Typography>

      <Card>
        <Box
          className="flex aspect-square w-full items-center justify-center overflow-hidden bg-stone-100"
        >
          <Box
            component="img"
            src={image.url}
            alt=""
            className="h-full w-full object-contain"
          />
        </Box>

        <CardContent>
          <Typography
            variant="body2"
            color="text.secondary"
            className="mb-4 break-all"
          >
            {image.path}
          </Typography>

          <TextField
            inputRef={searchRef}
            fullWidth
            label="Search product"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
            autoFocus
          />

          <Box className="mt-4">
            {productsLoading ? (
              <Box className="py-4 text-center">
                <CircularProgress size={24} />
              </Box>
            ) : (
              filteredProducts.map((product) => (
                <Button
                  key={product.id}
                  fullWidth
                  variant="outlined"
                  onClick={() => linkProduct(product)}
                  disabled={linking}
                  className="mb-2 justify-start normal-case"
                >
                  {product.name}
                </Button>
              ))
            )}
          </Box>

          {linking && (
            <Box className="mt-4 text-center">
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Typography color="error" className="mt-4">
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
