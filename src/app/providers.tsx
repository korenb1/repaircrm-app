"use client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en";
import theme from "@/theme";

// Root providers wrap every route, including the pre-auth login page. The
// default-locale (English) date adapter applies here; authenticated routes are
// additionally wrapped by <I18nProvider>, which supplies a locale-aware
// LocalizationProvider that overrides this one for app content.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en">
        {children}
      </LocalizationProvider>
    </ThemeProvider>
  );
}
