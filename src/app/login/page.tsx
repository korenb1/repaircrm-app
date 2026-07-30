"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import KeyIcon from "@mui/icons-material/Key";
import { getDict } from "@/lib/i18n";
import { authClient } from "@/lib/auth-client";
import { login, type LoginState } from "./actions";

// Pre-auth screen: no I18nProvider above it, so use the default-locale dict.
const T = getDict(undefined);

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const router = useRouter();

  // Conditional UI: browsers that support it suggest passkeys from the
  // email field's autofill (autoComplete="username webauthn").
  useEffect(() => {
    if (
      typeof window.PublicKeyCredential === "undefined" ||
      !PublicKeyCredential.isConditionalMediationAvailable
    ) {
      return;
    }
    let cancelled = false;
    PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
      if (!available || cancelled) return;
      authClient.signIn.passkey({
        autoFill: true,
        fetchOptions: { onSuccess: () => router.push("/workflows") },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const signInWithPasskey = async () => {
    setPasskeyError(null);
    const result = await authClient.signIn.passkey();
    if (result?.error) {
      setPasskeyError(T.login.passkeyError);
      return;
    }
    router.push("/workflows");
  };

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
                autoComplete="username webauthn"
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
              {passkeyError && <Alert severity="error">{passkeyError}</Alert>}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={pending}
                fullWidth
              >
                {T.login.submit}
              </Button>
              <Divider />
              <Button
                type="button"
                variant="outlined"
                size="large"
                startIcon={<KeyIcon />}
                onClick={signInWithPasskey}
                fullWidth
              >
                {T.login.passkey}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
