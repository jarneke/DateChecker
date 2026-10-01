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
      <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!image) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
          Relink
        </Typography>

        <Typography color="text.secondary">
          All images have been linked.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Relink images
      </Typography>

      <Card>
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "grey.100",
            overflow: "hidden",
          }}
        >
          <Box
            component="img"
            src={image.url}
            alt=""
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </Box>

        <CardContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              wordBreak: "break-all",
            }}
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

          <Box sx={{ mt: 2 }}>
            {productsLoading ? (
              <Box sx={{ textAlign: "center", py: 2 }}>
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
                  sx={{
                    justifyContent: "flex-start",
                    mb: 1,
                    textTransform: "none",
                  }}
                >
                  {product.name}
                </Button>
              ))
            )}
          </Box>

          {linking && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
