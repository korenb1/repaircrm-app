import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth-server";
import FinancesView from "@/components/finances/FinancesView";
import type {
  Contact,
  FinanceCategory,
  FinancialAccount,
  FinanceTransactionRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage() {
  const supabase = await createClient();

  const user = await getUser();

  const [
    { data: accounts },
    { data: transactions },
    { data: categories },
    { data: contacts },
  ] = await Promise.all([
    supabase.from("financial_accounts").select("*").order("sort_order"),
    supabase
      .from("finance_transactions")
      .select(
        `*, category:finance_categories(name), contact:contacts(id,first_name,last_name), creator:profiles!finance_transactions_created_by_fkey(full_name), ticket:tickets(id,number,group:groups(name),brand:brands(name),model:models(name))`,
      )
      .order("created_at", { ascending: false }),
    supabase.from("finance_categories").select("*").order("kind").order("sort_order"),
    supabase.from("contacts").select("*").order("first_name"),
  ]);

  return (
    <FinancesView
      accounts={(accounts ?? []) as FinancialAccount[]}
      transactions={(transactions ?? []) as FinanceTransactionRow[]}
      categories={(categories ?? []) as FinanceCategory[]}
      contacts={(contacts ?? []) as Contact[]}
      currentUserId={user?.id ?? null}
    />
  );
}
