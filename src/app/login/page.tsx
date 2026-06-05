"use client";
import { useActionState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { T } from "@/lib/constants";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 360 }}>
        <CardContent>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 2,
            }}
          >
            {T.appName}
          </Typography>
          {/* action={formAction} works as a native POST before hydration */}
          <form action={formAction}>
            <Stack spacing={2}>
              <TextField
                name="email"
                label={T.login.email}
                type="email"
                defaultValue="admin@repair.local"
                fullWidth
                autoComplete="username"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                name="password"
                label={T.login.password}
                type="password"
                fullWidth
                autoComplete="current-password"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              {state.error && <Alert severity="error">{state.error}</Alert>}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={pending}
                fullWidth
              >
                {T.login.submit}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
