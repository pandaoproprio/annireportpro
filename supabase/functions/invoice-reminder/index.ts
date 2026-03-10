import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getLastBusinessDay(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return lastDay;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const deadline = getLastBusinessDay(year, month);
    const alertDate = new Date(deadline);
    alertDate.setDate(alertDate.getDate() - 5);

    // Only run if we're within the alert window (5 days before deadline)
    if (now < alertDate) {
      return new Response(
        JSON.stringify({ message: "Not within alert window yet", deadline: deadline.toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const referenceMonth = `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // Get all users with 'oficineiro' role who haven't submitted this month
    const { data: oficineiros, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "oficineiro");

    if (roleError) throw roleError;

    const oficineiroIds = (oficineiros || []).map((r: any) => r.user_id);
    if (oficineiroIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No oficineiros found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check who already submitted
    const { data: submitted, error: invError } = await supabase
      .from("invoices")
      .select("user_id")
      .eq("reference_month", referenceMonth);

    if (invError) throw invError;

    const submittedIds = new Set((submitted || []).map((i: any) => i.user_id));
    const pendingIds = oficineiroIds.filter((id: string) => !submittedIds.has(id));

    if (pendingIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "All oficineiros have submitted", total: oficineiroIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profiles for pending users
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", pendingIds);

    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Create automation run
    const { data: run } = await supabase
      .from("automation_runs")
      .insert({
        run_type: "invoice_reminder",
        status: "running",
      })
      .select()
      .single();

    let alertsCreated = 0;

    // Create alerts for each pending oficineiro
    for (const profile of profiles || []) {
      const { error: alertError } = await supabase
        .from("automation_alerts")
        .insert({
          run_id: run?.id,
          alert_type: "invoice_pending",
          severity: daysLeft <= 0 ? "critical" : daysLeft <= 2 ? "high" : "medium",
          title: `Nota Fiscal pendente - ${new Date(year, month).toLocaleString("pt-BR", { month: "long", year: "numeric" })}`,
          description: `${(profile as any).name}, sua nota fiscal do mês de referência ainda não foi enviada. Prazo: ${deadline.toLocaleDateString("pt-BR")}. Faltam ${Math.max(0, daysLeft)} dia(s).`,
          target_user_id: (profile as any).user_id,
          target_email: (profile as any).email,
          entity_type: "invoice",
        });

      if (!alertError) alertsCreated++;
    }

    // Update run
    if (run?.id) {
      await supabase
        .from("automation_runs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          alerts_generated: alertsCreated,
        })
        .eq("id", run.id);
    }

    return new Response(
      JSON.stringify({
        message: "Invoice reminders processed",
        pending: pendingIds.length,
        alerts_created: alertsCreated,
        deadline: deadline.toISOString(),
        days_left: daysLeft,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
