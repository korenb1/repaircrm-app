"use client";
import { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import DeviceCatalogManager from "@/components/settings/DeviceCatalogManager";
import ServiceCatalogManager from "@/components/settings/ServiceCatalogManager";
import StatusManager from "@/components/settings/StatusManager";
import DocumentTemplatesManager from "@/components/settings/DocumentTemplatesManager";
import CompanySettingsManager from "@/components/settings/CompanySettingsManager";
import UsersManager from "@/components/settings/UsersManager";
import { T } from "@/lib/constants";
import type {
  Group,
  ServiceCatalogItem,
  TicketStatusRow,
  StatusTransition,
  DocumentTemplate,
  CompanySettings,
  AdminUser,
} from "@/lib/types";

export default function SettingsView({
  groups,
  services,
  statuses,
  transitions,
  templates,
  company,
  isAdmin = false,
  users = [],
}: {
  groups: Group[];
  services: ServiceCatalogItem[];
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
  templates: DocumentTemplate[];
  company: CompanySettings;
  isAdmin?: boolean;
  users?: AdminUser[];
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
          <Tab label={T.settings.tabs.company} />
          <Tab label={T.settings.tabs.catalog} />
          <Tab label={T.settings.tabs.services} />
          <Tab label={T.settings.tabs.statuses} />
          <Tab label={T.settings.tabs.documents} />
          {isAdmin && <Tab label={T.settings.tabs.users} />}
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <CompanySettingsManager company={company} />}
          {tab === 1 && <DeviceCatalogManager groups={groups} />}
          {tab === 2 && <ServiceCatalogManager services={services} />}
          {tab === 3 && (
            <StatusManager statuses={statuses} transitions={transitions} />
          )}
          {tab === 4 && <DocumentTemplatesManager templates={templates} />}
          {isAdmin && tab === 5 && <UsersManager users={users} />}
        </Box>
      </Paper>
    </Box>
  );
}
