"use client";

import Link from "next/link";
import { Button, Container, Stack, Typography } from "@mui/material";

export default function AdminPage() {
  return (
    <Container maxWidth="sm" className="py-12">
      <Typography variant="h4" className="mb-2 font-bold">
        Admin
      </Typography>

      <Typography color="text.secondary" className="mb-8">
        Manage the application.
      </Typography>

      <Stack spacing={2}>
        <Button
          component={Link}
          href="/admin/settings"
          variant="outlined"
          fullWidth
        >
          Settings
        </Button>

        <Button
          component={Link}
          href="/admin/relink"
          variant="outlined"
          fullWidth
        >
          Relink
        </Button>

        <Button
          component={Link}
          href="/admin/imagelinker"
          variant="outlined"
          fullWidth
        >
          Image Linker
        </Button>
      </Stack>
    </Container>
  );
}
