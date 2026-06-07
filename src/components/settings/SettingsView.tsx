"use client";
import { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import DeviceCatalogManager from "@/components/settings/DeviceCatalogManager";
import ServiceCatalogManager from "@/components/settings/ServiceCatalogManager";
import StatusManager from "@/components/settings/StatusManager";
import { T } from "@/lib/constants";
import type {
  Group,
  ServiceCatalogItem,
  TicketStatusRow,
  StatusTransition,
} from "@/lib/types";

export default function SettingsView({
  groups,
  services,
  statuses,
  transitions,
}: {
  groups: Group[];
  services: ServiceCatalogItem[];
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
}) {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Paper>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 2, borderBottom: "1px solid #e0e0e0" }}
        >
          <Tab label={T.settings.tabs.catalog} />
          <Tab label={T.settings.tabs.services} />
          <Tab label={T.settings.tabs.statuses} />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <DeviceCatalogManager groups={groups} />}
          {tab === 1 && <ServiceCatalogManager services={services} />}
          {tab === 2 && (
            <StatusManager statuses={statuses} transitions={transitions} />
          )}
        </Box>
      </Paper>
    </Box>
  );
}
