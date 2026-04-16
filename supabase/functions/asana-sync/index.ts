import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASANA_BASE = "https://app.asana.com/api/1.0";

async function asanaFetch(path: string, options: RequestInit = {}) {
  const pat = Deno.env.get("ASANA_PAT");
  if (!pat) throw new Error("ASANA_PAT not configured");

  const resp = await fetch(`${ASANA_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Asana API error [${resp.status}]: ${body}`);
  }

  return resp.json();
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function getUserClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

// Log a sync event
async function logSync(
  supabase: ReturnType<typeof createClient>,
  syncedProjectId: string | null,
  direction: string,
  eventType: string,
  status: string,
  opts: { entityType?: string; entityId?: string; asanaTaskGid?: string; errorMessage?: string; metadata?: unknown } = {}
) {
  await supabase.from("asana_sync_logs").insert({
    synced_project_id: syncedProjectId,
    direction,
    event_type: eventType,
    entity_type: opts.entityType || "",
    entity_id: opts.entityId || null,
    asana_task_gid: opts.asanaTaskGid || null,
    status,
    error_message: opts.errorMessage || null,
    metadata: opts.metadata || null,
  });
}

// Update synced project status
async function updateSyncStatus(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  status: string,
  error?: string
) {
  const update: Record<string, unknown> = { sync_status: status, last_synced_at: new Date().toISOString() };
  if (error) update.last_error = error;
  else update.last_error = null;
  await supabase.from("asana_synced_projects").update(update).eq("id", projectId);
}

// Sync tasks FROM Asana for a specific synced project
async function syncFromAsana(supabase: ReturnType<typeof createClient>, syncedProject: any) {
  const projectGid = syncedProject.asana_project_gid;
  let imported = 0;
  let updated = 0;
  let errors = 0;

  try {
    const result = await asanaFetch(
      `/tasks?project=${projectGid}&opt_fields=name,notes,completed,due_on,modified_at,assignee.name,assignee.email&limit=100`
    );
    const tasks = result.data || [];

    for (const task of tasks) {
      try {
        // Check existing mapping
        const { data: mapping } = await supabase
          .from("asana_task_mappings")
          .select("id, entity_id, last_remote_update")
          .eq("asana_task_gid", task.gid)
          .eq("entity_type", "activity")
          .single();

        const remoteModified = task.modified_at ? new Date(task.modified_at) : new Date();

        if (mapping) {
          // Check conflict: only update if Asana version is newer
          if (mapping.last_remote_update) {
            const lastKnown = new Date(mapping.last_remote_update);
            if (remoteModified <= lastKnown) continue;
          }

          // Update existing activity
          await supabase
            .from("activities")
            .update({
              description: task.name || "Tarefa Asana",
              results: task.notes || "",
              date: task.due_on || new Date().toISOString().split("T")[0],
            })
            .eq("id", mapping.entity_id);

          await supabase
            .from("asana_task_mappings")
            .update({ last_remote_update: remoteModified.toISOString(), synced_at: new Date().toISOString() })
            .eq("id", mapping.id);

          updated++;
          await logSync(supabase, syncedProject.id, "asana_to_gira", "task_updated", "success", {
            entityType: "activity",
            entityId: mapping.entity_id,
            asanaTaskGid: task.gid,
          });
        } else {
          // Need a system project to create activities — skip if none mapped
          // Use the first available project or skip
          const { data: projects } = await supabase.from("projects").select("id").limit(1);
          if (!projects?.length) continue;

          const { data: activity, error: actError } = await supabase
            .from("activities")
            .insert({
              user_id: syncedProject.created_by,
              project_id: projects[0].id,
              date: task.due_on || new Date().toISOString().split("T")[0],
              type: "Outras Ações",
              description: task.name || "Tarefa importada do Asana",
              results: task.notes || "",
              challenges: "",
              location: "Asana",
              is_draft: true,
            })
            .select("id")
            .single();

          if (activity && !actError) {
            await supabase.from("asana_task_mappings").insert({
              asana_task_gid: task.gid,
              entity_type: "activity",
              entity_id: activity.id,
              project_id: projects[0].id,
              user_id: syncedProject.created_by,
              asana_project_gid: projectGid,
              last_remote_update: remoteModified.toISOString(),
            });
            imported++;
            await logSync(supabase, syncedProject.id, "asana_to_gira", "task_imported", "success", {
              entityType: "activity",
              entityId: activity.id,
              asanaTaskGid: task.gid,
            });
          }
        }
      } catch (taskErr) {
        errors++;
        await logSync(supabase, syncedProject.id, "asana_to_gira", "task_sync_error", "error", {
          asanaTaskGid: task.gid,
          errorMessage: taskErr instanceof Error ? taskErr.message : String(taskErr),
        });
      }
    }

    await updateSyncStatus(supabase, syncedProject.id, "active");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateSyncStatus(supabase, syncedProject.id, "error", msg);
    await logSync(supabase, syncedProject.id, "asana_to_gira", "sync_failed", "error", { errorMessage: msg });
    throw err;
  }

  return { imported, updated, errors };
}

// Sync a GIRA entity TO Asana
async function syncToAsana(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string,
  data: { completed?: boolean; notes?: string; comment?: string }
) {
  const { data: mapping } = await supabase
    .from("asana_task_mappings")
    .select("asana_task_gid, asana_project_gid")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .single();

  if (!mapping) return { skipped: true, reason: "no_mapping" };

  // Find synced project for logging
  let syncedProjectId: string | null = null;
  if (mapping.asana_project_gid) {
    const { data: sp } = await supabase
      .from("asana_synced_projects")
      .select("id")
      .eq("asana_project_gid", mapping.asana_project_gid)
      .single();
    syncedProjectId = sp?.id || null;
  }

  try {
    // Update task fields
    if (data.completed !== undefined || data.notes) {
      const updateData: Record<string, unknown> = {};
      if (data.completed !== undefined) updateData.completed = data.completed;
      if (data.notes) updateData.notes = data.notes;

      await asanaFetch(`/tasks/${mapping.asana_task_gid}`, {
        method: "PUT",
        body: JSON.stringify({ data: updateData }),
      });
    }

    // Add comment
    if (data.comment) {
      await asanaFetch(`/tasks/${mapping.asana_task_gid}/stories`, {
        method: "POST",
        body: JSON.stringify({ data: { text: data.comment } }),
      });
    }

    await supabase
      .from("asana_task_mappings")
      .update({ synced_at: new Date().toISOString() })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId);

    await logSync(supabase, syncedProjectId, "gira_to_asana", "sync_update", "success", {
      entityType,
      entityId,
      asanaTaskGid: mapping.asana_task_gid,
    });

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logSync(supabase, syncedProjectId, "gira_to_asana", "sync_error", "error", {
      entityType,
      entityId,
      asanaTaskGid: mapping.asana_task_gid,
      errorMessage: msg,
    });
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // ── Webhook handshake (Asana sends GET with X-Hook-Secret) ──
    const hookSecret = req.headers.get("X-Hook-Secret");
    if (hookSecret) {
      return new Response(null, {
        status: 200,
        headers: { ...corsHeaders, "X-Hook-Secret": hookSecret },
      });
    }

    // ── Webhook events from Asana (POST without auth) ──
    if (url.searchParams.get("webhook") === "true") {
      const supabase = getServiceClient();
      const body = await req.json();
      const events = body.events || [];

      for (const event of events) {
        if (event.resource?.resource_type === "task" && event.action) {
          const taskGid = event.resource.gid;
          const parentGid = event.parent?.gid;

          // Find synced project
          let syncedProjectId: string | null = null;
          if (parentGid) {
            const { data: sp } = await supabase
              .from("asana_synced_projects")
              .select("id, is_active")
              .eq("asana_project_gid", parentGid)
              .single();
            if (sp && sp.is_active) syncedProjectId = sp.id;
            else continue; // Not a synced project
          }

          try {
            // Fetch task details
            const taskResult = await asanaFetch(`/tasks/${taskGid}?opt_fields=name,notes,completed,due_on,modified_at`);
            const task = taskResult.data;

            // Check mapping
            const { data: mapping } = await supabase
              .from("asana_task_mappings")
              .select("id, entity_id, last_remote_update")
              .eq("asana_task_gid", taskGid)
              .eq("entity_type", "activity")
              .single();

            if (mapping) {
              const remoteModified = task.modified_at ? new Date(task.modified_at) : new Date();

              await supabase
                .from("activities")
                .update({
                  description: task.name || "Tarefa Asana",
                  results: task.notes || "",
                  date: task.due_on || new Date().toISOString().split("T")[0],
                })
                .eq("id", mapping.entity_id);

              await supabase
                .from("asana_task_mappings")
                .update({ last_remote_update: remoteModified.toISOString(), synced_at: new Date().toISOString() })
                .eq("id", mapping.id);

              await logSync(supabase, syncedProjectId, "asana_to_gira", "webhook_update", "success", {
                entityType: "activity",
                entityId: mapping.entity_id,
                asanaTaskGid: taskGid,
              });
            }
          } catch (err) {
            await logSync(supabase, syncedProjectId, "asana_to_gira", "webhook_error", "error", {
              asanaTaskGid: taskGid,
              errorMessage: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      return jsonResponse({ success: true });
    }

    // ── Authenticated actions ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = getUserClient(authHeader);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { action, ...payload } = await req.json();

    // Check global enabled
    const serviceClient = getServiceClient();
    const { data: configs } = await serviceClient.from("asana_config").select("is_globally_enabled").limit(1);
    const globalEnabled = configs?.[0]?.is_globally_enabled !== false;

    switch (action) {
      // ── Force sync a specific board ──
      case "force_sync": {
        const { synced_project_id } = payload;
        if (!synced_project_id) return jsonResponse({ error: "synced_project_id required" }, 400);

        const { data: sp } = await serviceClient
          .from("asana_synced_projects")
          .select("*")
          .eq("id", synced_project_id)
          .single();

        if (!sp) return jsonResponse({ error: "Synced project not found" }, 404);

        const result = await syncFromAsana(serviceClient, sp);
        return jsonResponse({ success: true, ...result });
      }

      // ── Sync entity to Asana ──
      case "sync_to_asana": {
        if (!globalEnabled) return jsonResponse({ error: "Integração global desativada" }, 403);

        const { entity_type, entity_id, completed, notes, comment } = payload;
        if (!entity_type || !entity_id) return jsonResponse({ error: "entity_type and entity_id required" }, 400);

        const result = await syncToAsana(serviceClient, entity_type, entity_id, { completed, notes, comment });
        return jsonResponse(result);
      }

      // ── Register webhook for a synced project ──
      case "register_webhook": {
        const { synced_project_id } = payload;
        const { data: sp } = await serviceClient
          .from("asana_synced_projects")
          .select("asana_project_gid")
          .eq("id", synced_project_id)
          .single();

        if (!sp) return jsonResponse({ error: "Synced project not found" }, 404);

        const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/asana-sync?webhook=true`;

        const result = await asanaFetch("/webhooks", {
          method: "POST",
          body: JSON.stringify({
            data: {
              resource: sp.asana_project_gid,
              target: webhookUrl,
            },
          }),
        });

        return jsonResponse({ success: true, webhook: result.data });
      }

      // ── Periodic sync (called by cron) ──
      case "periodic_sync": {
        if (!globalEnabled) return jsonResponse({ skipped: true, reason: "globally_disabled" });

        const { data: activeProjects } = await serviceClient
          .from("asana_synced_projects")
          .select("*")
          .eq("is_active", true);

        const results: Record<string, unknown> = {};
        for (const sp of activeProjects || []) {
          try {
            const r = await syncFromAsana(serviceClient, sp);
            results[sp.asana_project_gid] = { success: true, ...r };
          } catch (err) {
            results[sp.asana_project_gid] = {
              success: false,
              error: err instanceof Error ? err.message : String(err),
            };
          }
        }

        return jsonResponse({ success: true, results });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("asana-sync error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
