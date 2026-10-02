"use client";

import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import UpdateIcon from "@mui/icons-material/Update";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import NightlightOutlinedIcon from "@mui/icons-material/NightlightOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEffect, useState } from "react";

type SettingsResponse = {
  monthCheckDaysBeforeEnd: number;
};

export default function HomePage() {
  const [itemsToSticker, setItemsToSticker] = useState<number | null>(null);
  const [itemsOverdue, setItemsOverdue] = useState<number | null>(null);
  const [itemsToMonthlyCheck, setItemsToMonthlyCheck] = useState<number | null>(
    null,
  );
  const [monthCheckDaysBeforeEnd, setMonthCheckDaysBeforeEnd] = useState<
    number | null
  >(null);

  useEffect(() => {
    async function loadCounts() {
      try {
        const [stickerRes, overdueRes, monthlyRes, settingsRes] =
          await Promise.all([
            fetch("/api/items/due/count", {
              cache: "no-store",
            }),
            fetch("/api/items/overdue/count", {
              cache: "no-store",
            }),
            fetch("/api/items/monthly/count", {
              cache: "no-store",
            }),
            fetch("/api/settings", {
              cache: "no-store",
            }),
          ]);

        if (
          !stickerRes.ok ||
          !overdueRes.ok ||
          !monthlyRes.ok ||
          !settingsRes.ok
        ) {
          throw new Error("Gegevens konden niet geladen worden.");
        }

        const stickerData = await stickerRes.json();
        const overdueData = await overdueRes.json();
        const monthlyData = await monthlyRes.json();
        const settingsData: SettingsResponse = await settingsRes.json();

        setItemsToSticker(stickerData.count ?? 0);
        setItemsOverdue(overdueData.count ?? 0);
        setItemsToMonthlyCheck(monthlyData.count ?? 0);
        setMonthCheckDaysBeforeEnd(settingsData.monthCheckDaysBeforeEnd);
      } catch (error) {
        console.error(error);
        setItemsToSticker(null);
        setItemsOverdue(null);
        setItemsToMonthlyCheck(null);
        setMonthCheckDaysBeforeEnd(null);
      }
    }

    loadCounts();
  }, []);

  const today = new Date();

  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const daysUntilMonthEnd = Math.ceil(
    (lastDayOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const monthlyCheckActive =
    monthCheckDaysBeforeEnd !== null &&
    daysUntilMonthEnd <= monthCheckDaysBeforeEnd;

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

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                }}
              >
                <UpdateIcon fontSize="large" />

                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Te controleren
                  </Typography>

                  <Typography color="text.secondary">
                    {itemsOverdue === null
                      ? "Aantal items wordt geladen..."
                      : itemsOverdue === 0
                        ? "Geen items over datum"
                        : `${itemsOverdue} ${
                            itemsOverdue === 1 ? "item" : "items"
                          } te controleren`}
                  </Typography>
                </Box>
              </Stack>

              {itemsOverdue !== null && itemsOverdue > 0 && (
                <Button
                  className="StyledButton1"
                  component={Link}
                  href="/check?type=overdue"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  fullWidth
                >
                  Start
                </Button>
              )}
            </Stack>
          </Box>

          <Box className="StyledBox color-invert">
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
                    Dagelijkse controle
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
                  className="StyledButton1"
                  component={Link}
                  href="/check?type=sticker"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  fullWidth
                >
                  Start
                </Button>
              )}
            </Stack>
          </Box>

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                }}
              >
                <CalendarMonthOutlinedIcon fontSize="large" />

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
                    {itemsToMonthlyCheck === null
                      ? "Items worden geladen..."
                      : itemsToMonthlyCheck === 0
                        ? "Geen items die deze maand vervallen"
                        : `${itemsToMonthlyCheck} ${
                            itemsToMonthlyCheck === 1 ? "item" : "items"
                          } vervallen deze maand`}
                  </Typography>
                </Box>
              </Stack>

              {itemsToMonthlyCheck !== null &&
                itemsToMonthlyCheck > 0 &&
                (monthlyCheckActive ? (
                  <Button
                    className="StyledButton1"
                    component={Link}
                    href="/check?type=monthly"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    fullWidth
                  >
                    Start
                  </Button>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      textAlign: "center",
                    }}
                  >
                    Beschikbaar vanaf de laatste {monthCheckDaysBeforeEnd} dagen
                    van de maand.
                  </Typography>
                ))}
            </Stack>
          </Box>

          <Box className="StyledBox color-invert">
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                }}
              >
                <NightlightOutlinedIcon fontSize="large" />

                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Avondcontrole
                  </Typography>

                  <Typography color="text.secondary">
                    Controleer de producten die vandaag gestickerd zijn.
                  </Typography>
                </Box>
              </Stack>

              <Button
                className="StyledButton1"
                component={Link}
                href="/check?type=evening"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                fullWidth
              >
                Start
              </Button>
            </Stack>
          </Box>

          <Stack spacing={2}>
            <Button
              className="StyledButton3"
              component={Link}
              href="/stockchecker"
              variant="outlined"
              size="large"
              startIcon={<Inventory2OutlinedIcon />}
              fullWidth
            >
              Stock Checker
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Container>
  );
}
