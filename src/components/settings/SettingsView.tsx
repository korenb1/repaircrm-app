"use client";
import { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import DeviceCatalogManager from "@/components/settings/DeviceCatalogManager";
import ServiceCatalogManager from "@/components/settings/ServiceCatalogManager";
import StatusManager from "@/components/settings/StatusManager";
import DocumentTemplatesManager from "@/components/settings/DocumentTemplatesManager";
import CompanySettingsManager from "@/components/settings/CompanySettingsManager";
import { T } from "@/lib/constants";
import type {
  Group,
  ServiceCatalogItem,
  TicketStatusRow,
  StatusTransition,
  DocumentTemplate,
  CompanySettings,
} from "@/lib/types";

export default function SettingsView({
  groups,
  services,
  statuses,
  transitions,
  templates,
  company,
}: {
  groups: Group[];
  services: ServiceCatalogItem[];
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
  templates: DocumentTemplate[];
  company: CompanySettings;
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
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <CompanySettingsManager company={company} />}
          {tab === 1 && <DeviceCatalogManager groups={groups} />}
          {tab === 2 && <ServiceCatalogManager services={services} />}
          {tab === 3 && (
            <StatusManager statuses={statuses} transitions={transitions} />
          )}
          {tab === 4 && <DocumentTemplatesManager templates={templates} />}
        </Box>
      </Paper>
    </Box>
  );
}
