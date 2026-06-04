"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AppBar,
  Avatar,
  Box,
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
import LogoutIcon from "@mui/icons-material/Logout";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/lib/constants";

const WIDTH = 64;

const NAV = [
  { href: "/workflows", label: T.nav.workflows, icon: <AssignmentIcon /> },
  { href: "/contacts", label: T.nav.contacts, icon: <PeopleIcon /> },
];

export default function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: WIDTH,
            boxSizing: "border-box",
            bgcolor: "#1f2733",
            color: "#fff",
            border: 0,
          },
        }}
      >
        <Toolbar sx={{ minHeight: 56, px: 0, justifyContent: "center" }}>
          <Avatar sx={{ bgcolor: "#f5a623", width: 36, height: 36 }}>R</Avatar>
        </Toolbar>
        <List>
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Tooltip key={item.href} title={item.label} placement="right">
                <ListItemButton
                  component={Link}
                  href={item.href}
                  sx={{
                    justifyContent: "center",
                    py: 1.5,
                    color: active ? "#fff" : "#9aa4b2",
                    bgcolor: active ? "rgba(245,166,35,0.15)" : "transparent",
                    borderLeft: active
                      ? "3px solid #f5a623"
                      : "3px solid transparent",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, color: "inherit" }}>
                    {item.icon}
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ borderBottom: "1px solid #e0e0e0", bgcolor: "#fff" }}
        >
          <Toolbar sx={{ minHeight: 56, gap: 2 }}>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {userName}
            </Typography>
            <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
              <Avatar sx={{ bgcolor: "#f5a623", width: 32, height: 32 }}>
                {userName.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchor}
              open={Boolean(anchor)}
              onClose={() => setAnchor(null)}
            >
              <MenuItem onClick={logout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Вийти
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
