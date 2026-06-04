"use client";
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    background: { default: "#f5f6f8", paper: "#ffffff" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: [
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "Roboto",
      "Arial",
      "sans-serif",
    ].join(","),
    fontSize: 13,
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTableCell: {
      styleOverrides: {
        root: { paddingTop: 8, paddingBottom: 8, fontSize: 13 },
        head: { fontWeight: 600, backgroundColor: "#fafafa" },
      },
    },
  },
});

export default theme;
