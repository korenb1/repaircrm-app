"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { createUser, type CreateUserState } from "@/app/(app)/settings/users-actions";
import { useT } from "@/lib/i18n/context";
import type { AdminUser } from "@/lib/types";

const initialState: CreateUserState = { error: null, ok: false };

export default function UsersManager({ users }: { users: AdminUser[] }) {
  const T = useT();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createUser, initialState);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setCreated(true);
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const U = T.settings.users;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        {U.heading}
      </Typography>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      <Box component="form" ref={formRef} action={action} sx={{ mb: 4 }}>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <TextField
            name="email"
            label={U.email}
            type="email"
            required
            fullWidth
            autoComplete="off"
          />
          <TextField
            name="fullName"
            label={U.fullName}
            required
            fullWidth
            autoComplete="off"
          />
          <TextField
            name="password"
            label={U.password}
            type="password"
            required
            fullWidth
            autoComplete="new-password"
          />
          <Box>
            <Button
              type="submit"
              variant="contained"
              disabled={pending}
              startIcon={
                pending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <PersonAddIcon />
                )
              }
            >
              {U.create}
            </Button>
          </Box>
        </Stack>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
        {U.listHeading}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{U.cols.name}</TableCell>
              <TableCell>{U.cols.email}</TableCell>
              <TableCell>{U.cols.role}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{U.roles[u.role]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={created}
        autoHideDuration={2500}
        onClose={() => setCreated(false)}
        message={U.created}
      />
    </Box>
  );
}
