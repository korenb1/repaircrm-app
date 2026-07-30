-- Enforce unique catalog item names, case-insensitive, matching the UI grouping:
-- products form one namespace; services and labor share the other (the settings
-- UI shows both under "services"). This blocks duplicates from concurrent
-- inserts and any direct API writes that bypass the client-side check.

create unique index if not exists service_catalog_product_name_uniq
  on service_catalog (lower(name))
  where kind = 'product';

create unique index if not exists service_catalog_service_name_uniq
  on service_catalog (lower(name))
  where kind in ('service', 'labor');
