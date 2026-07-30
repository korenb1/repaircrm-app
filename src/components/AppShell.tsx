"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  Toolbar,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/context";

const WIDTH = 88;

// Nav entries: hrefs/icons are static; labels are resolved per-render from the
// active locale dictionary (see NAV() below).
const NAV_ITEMS = [
  { href: "/workflows", labelKey: "workflows", icon: <AssignmentIcon /> },
  { href: "/contacts", labelKey: "contacts", icon: <PeopleIcon /> },
  { href: "/finances", labelKey: "finances", icon: <AccountBalanceWalletIcon /> },
  { href: "/settings", labelKey: "settings", icon: <SettingsIcon /> },
] as const;

export default function AppShell({
  children,
  userName,
  avatarUrl,
}: {
  children: React.ReactNode;
  userName: string;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const T = useT();
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV = NAV_ITEMS.map((n) => ({
    href: n.href,
    icon: n.icon,
    label: T.nav[n.labelKey],
  }));

  // Title for the current section, derived from the nav entry that matches the
  // active route (so pages no longer render their own heading).
  const pageTitle =
    NAV.find((n) => pathname.startsWith(n.href))?.label ??
    (pathname.startsWith("/profile") ? T.nav.profile : "");

  async function logout() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ minHeight: 56, px: 0, justifyContent: "center" }}>
        <Avatar
          variant="rounded"
          sx={{ bgcolor: "primary.main", width: 36, height: 36 }}
        >
          R
        </Avatar>
      </Toolbar>
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              sx={{
                flexDirection: "column",
                gap: 0.5,
                py: 1.25,
                color: active ? "primary.main" : "text.secondary",
                bgcolor: active ? "action.selected" : "transparent",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <ListItemIcon
                sx={{ minWidth: 0, color: "inherit", justifyContent: "center" }}
              >
                {item.icon}
              </ListItemIcon>
              <Typography
                variant="caption"
                sx={{
                  fontSize: 11,
                  lineHeight: 1.2,
                  textAlign: "center",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {item.label}
              </Typography>
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ p: 1, display: "flex", justifyContent: "center" }}>
        <Tooltip title={userName} placement="right" arrow>
          <IconButton
            onClick={(e) => setUserAnchor(e.currentTarget)}
            size="small"
          >
            <Avatar
              src={avatarUrl ?? undefined}
              sx={{ bgcolor: "primary.main", width: 36, height: 36 }}
            >
              {userName.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={userAnchor}
          open={Boolean(userAnchor)}
          onClose={() => setUserAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <MenuItem disabled sx={{ opacity: "1 !important" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {userName}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem
            component={Link}
            href="/profile"
            onClick={() => {
              setUserAnchor(null);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            {T.nav.profile}
          </MenuItem>
          <Divider />
          <MenuItem onClick={logout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {T.nav.logout}
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box
        component="nav"
        sx={{ width: { sm: WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              width: WIDTH,
              boxSizing: "border-box",
              bgcolor: "#fff",
              borderRight: "1px solid #e0e0e0",
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              width: WIDTH,
              boxSizing: "border-box",
              bgcolor: "#fff",
              borderRight: "1px solid #e0e0e0",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ borderBottom: "1px solid #e0e0e0", bgcolor: "#fff" }}
        >
          <Toolbar sx={{ minHeight: 56, gap: 1 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { sm: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.56rem" }}>
              {pageTitle}
            </Typography>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{ flexGrow: 1, minWidth: 0, p: { xs: 1, sm: 2 } }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
