"use client";
import { useState } from "react";
import { Box, Paper, Tab, Tabs, Typography } from "@mui/material";
import DeviceCatalogManager from "@/components/settings/DeviceCatalogManager";
import CatalogManager from "@/components/settings/CatalogManager";
import StatusManager from "@/components/settings/StatusManager";
import FinanceCategoriesManager from "@/components/settings/FinanceCategoriesManager";
import DocumentTemplatesManager from "@/components/settings/DocumentTemplatesManager";
import CompanySettingsManager from "@/components/settings/CompanySettingsManager";
import UsersManager from "@/components/settings/UsersManager";
import { useT } from "@/lib/i18n/context";
import type {
  Group,
  ServiceCatalogItem,
  ServiceCategory,
  Malfunction,
  EquipmentItem,
  TicketStatusRow,
  StatusTransition,
  DocumentTemplate,
  CompanySettings,
  AdminUser,
  FinanceCategory,
} from "@/lib/types";

export default function SettingsView({
  groups,
  malfunctions,
  equipment,
  services,
  serviceCategories,
  statuses,
  transitions,
  templates,
  company,
  financeCategories,
  isAdmin = false,
  users = [],
}: {
  groups: Group[];
  malfunctions: Malfunction[];
  equipment: EquipmentItem[];
  services: ServiceCatalogItem[];
  serviceCategories: ServiceCategory[];
  statuses: TicketStatusRow[];
  transitions: StatusTransition[];
  templates: DocumentTemplate[];
  company: CompanySettings;
  financeCategories: FinanceCategory[];
  isAdmin?: boolean;
  users?: AdminUser[];
}) {
  const T = useT();
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
          <Tab label={T.settings.tabs.products} />
          <Tab label={T.settings.tabs.statuses} />
          <Tab label={T.settings.tabs.finances} />
          <Tab label={T.settings.tabs.documents} />
          {isAdmin && <Tab label={T.settings.tabs.users} />}
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <CompanySettingsManager company={company} />}
          {tab === 1 && (
            <DeviceCatalogManager
              groups={groups}
              malfunctions={malfunctions}
              equipment={equipment}
            />
          )}
          {tab === 2 && (
            <CatalogManager kind="service" items={services} categories={serviceCategories} />
          )}
          {tab === 3 && (
            <CatalogManager kind="product" items={services} categories={serviceCategories} />
          )}
          {tab === 4 && (
            <StatusManager statuses={statuses} transitions={transitions} />
          )}
          {tab === 5 && (
            <FinanceCategoriesManager categories={financeCategories} />
          )}
          {tab === 6 && <DocumentTemplatesManager templates={templates} />}
          {isAdmin && tab === 7 && <UsersManager users={users} />}
        </Box>
      </Paper>
    </Box>
  );
}
