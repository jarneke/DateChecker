"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [itemsToSticker, setItemsToSticker] = useState<number | null>(null);
  const [itemsToMonthlyCheck, setItemsToMonthlyCheck] = useState<number | null>(
    null,
  );

  useEffect(() => {
    async function loadCounts() {
      try {
        const [stickerRes, monthlyRes] = await Promise.all([
          fetch("/api/items/due/count", {
            cache: "no-store",
          }),
          fetch("/api/items/monthly/count", {
            cache: "no-store",
          }),
        ]);

        if (!stickerRes.ok || !monthlyRes.ok) {
          throw new Error("Aantallen konden niet geladen worden.");
        }

        const stickerData = await stickerRes.json();
        const monthlyData = await monthlyRes.json();

        setItemsToSticker(stickerData.count ?? 0);
        setItemsToMonthlyCheck(monthlyData.count ?? 0);
      } catch (error) {
        console.error(error);
        setItemsToSticker(null);
        setItemsToMonthlyCheck(null);
      }
    }

    loadCounts();
  }, []);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          py: 4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 700,
              }}
            >
              Date Check
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1,
              }}
            >
              Controleer producten en verminder voedselverspilling.
            </Typography>
          </Box>

          <Card
            sx={{
              borderRadius: 3,
            }}
          >
            <CardContent
              sx={{
                p: 3,
              }}
            >
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                  }}
                >
                  <LocalOfferOutlinedIcon fontSize="large" />

                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                      }}
                    >
                      30%-controle
                    </Typography>

                    <Typography color="text.secondary">
                      {itemsToSticker === null
                        ? "Aantal items wordt geladen..."
                        : itemsToSticker === 0
                          ? "Geen items te controleren"
                          : `${itemsToSticker} ${
                              itemsToSticker === 1 ? "item" : "items"
                            } te controleren`}
                    </Typography>
                  </Box>
                </Stack>

                {itemsToSticker !== null && itemsToSticker > 0 && (
                  <Button
                    component={Link}
                    href="/stickeren"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    fullWidth
                  >
                    Start met stickeren
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>

          {itemsToMonthlyCheck !== null && itemsToMonthlyCheck > 0 && (
            <Card
              sx={{
                borderRadius: 3,
              }}
            >
              <CardContent
                sx={{
                  p: 3,
                }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                      alignItems: "center",
                    }}
                  >
                    <Inventory2OutlinedIcon fontSize="large" />

                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                        }}
                      >
                        Maandelijkse controle
                      </Typography>

                      <Typography color="text.secondary">
                        {itemsToMonthlyCheck}{" "}
                        {itemsToMonthlyCheck === 1 ? "item" : "items"} te
                        controleren
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    component={Link}
                    href="/maandelijkse-check"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    fullWidth
                  >
                    Start maandelijkse controle
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Stack spacing={2}>
            <Button
              component={Link}
              href="/stockchecker"
              variant="outlined"
              size="large"
              startIcon={<Inventory2OutlinedIcon />}
              fullWidth
            >
              Stock Checker
            </Button>

            <Button
              component={Link}
              href="/settings"
              variant="outlined"
              size="large"
              startIcon={<SettingsOutlinedIcon />}
              fullWidth
            >
              Instellingen
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
}
