import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Calculate previous month boundaries
    const now = new Date();
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const snapshotMonth = firstOfLastMonth.toISOString().slice(0, 10); // YYYY-MM-DD
    const startStr = firstOfLastMonth.toISOString();
    const endStr = firstOfThisMonth.toISOString();

    console.log(`[perf-snapshot] Generating snapshot for ${snapshotMonth}`);

    // Get all active projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .is("deleted_at", null);

    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No projects" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let snapshots = 0;

    for (const project of projects) {
      // Activities count
      const { count: activityCount } = await supabase
        .from("activities")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .is("deleted_at", null)
        .gte("created_at", startStr)
        .lt("created_at", endStr);

      // Reports count (team + justification published in period)
      const [teamRes, justRes] = await Promise.all([
        supabase.from("team_reports").select("*", { count: "exact", head: true })
          .eq("project_id", project.id).eq("is_draft", false).is("deleted_at", null)
          .gte("updated_at", startStr).lt("updated_at", endStr),
        supabase.from("justification_reports").select("*", { count: "exact", head: true })
          .eq("project_id", project.id).eq("is_draft", false).is("deleted_at", null)
          .gte("updated_at", startStr).lt("updated_at", endStr),
      ]);

      const totalReports = (teamRes.count || 0) + (justRes.count || 0);

      // Performance tracking metrics
      const { data: perfData } = await supabase
        .from("report_performance_tracking")
        .select("calculated_lead_time, calculated_cycle_time, reopen_count")
        .eq("project_id", project.id)
        .gte("created_at", startStr)
        .lt("created_at", endStr);

      const perf = perfData || [];
      const avgLeadTime = perf.length > 0
        ? perf.reduce((s, p) => s + (p.calculated_lead_time || 0), 0) / perf.length
        : null;
      const avgCycleTime = perf.length > 0
        ? perf.reduce((s, p) => s + (p.calculated_cycle_time || 0), 0) / perf.length
        : null;
      const totalReopens = perf.reduce((s, p) => s + p.reopen_count, 0);
      const rejectionRate = perf.length > 0 ? totalReopens / perf.length : null;

      // SLA compliance
      const { data: slaData } = await supabase
        .from("report_sla_tracking")
        .select("status")
        .eq("project_id", project.id);

      const slaTotal = slaData?.length || 0;
      const slaOnTime = slaData?.filter(s => s.status === "no_prazo").length || 0;
      const slaComplianceRate = slaTotal > 0 ? slaOnTime / slaTotal : null;

      // Workflows
      const { data: wfData } = await supabase
        .from("report_workflows")
        .select("status")
        .eq("project_id", project.id);

      const workflowsCompleted = wfData?.filter(w => w.status === "publicado").length || 0;
      const workflowsPending = wfData?.filter(w => w.status !== "publicado").length || 0;

      // Upsert snapshot
      const { error } = await supabase
        .from("performance_snapshots")
        .upsert({
          project_id: project.id,
          snapshot_month: snapshotMonth,
          total_activities: activityCount || 0,
          total_reports: totalReports,
          avg_lead_time_hours: avgLeadTime ? Math.round(avgLeadTime * 100) / 100 : null,
          avg_cycle_time_hours: avgCycleTime ? Math.round(avgCycleTime * 100) / 100 : null,
          rejection_rate: rejectionRate ? Math.round(rejectionRate * 10000) / 10000 : null,
          sla_compliance_rate: slaComplianceRate ? Math.round(slaComplianceRate * 10000) / 10000 : null,
          workflows_completed: workflowsCompleted,
          workflows_pending: workflowsPending,
          metadata: { project_name: project.name },
        }, { onConflict: "project_id,snapshot_month" });

      if (error) {
        console.error(`[perf-snapshot] Error for project ${project.id}:`, error.message);
      } else {
        snapshots++;
      }
    }

    console.log(`[perf-snapshot] Generated ${snapshots}/${projects.length} snapshots for ${snapshotMonth}`);

    return new Response(JSON.stringify({ success: true, snapshots, month: snapshotMonth }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("[perf-snapshot] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
