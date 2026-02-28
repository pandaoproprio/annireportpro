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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { action, ...payload } = await req.json();

    // Load config
    const { data: configs } = await supabase
      .from("asana_config")
      .select("*")
      .limit(1);
    const config = configs?.[0];

    switch (action) {
      // ── Test connection ──
      case "test_connection": {
        const result = await asanaFetch("/users/me");
        return jsonResponse({ success: true, user: result.data });
      }

      // ── List workspaces ──
      case "list_workspaces": {
        const result = await asanaFetch("/workspaces?opt_fields=name,gid");
        return jsonResponse({ workspaces: result.data });
      }

      // ── List projects in workspace ──
      case "list_projects": {
        const { workspace_gid } = payload;
        const result = await asanaFetch(
          `/projects?workspace=${workspace_gid}&opt_fields=name,gid&limit=100`
        );
        return jsonResponse({ projects: result.data });
      }

      // ── Create task ──
      case "create_task": {
        if (!config?.enable_create_tasks) {
          return jsonResponse({ error: "Criar tarefas no Asana está desativado" }, 403);
        }
        const { name, notes, project_gid } = payload;
        const targetProject = project_gid || config.project_gid;
        if (!targetProject) {
          return jsonResponse({ error: "Project GID do Asana não configurado" }, 400);
        }

        const result = await asanaFetch("/tasks", {
          method: "POST",
          body: JSON.stringify({
            data: {
              name,
              notes,
              projects: [targetProject],
            },
          }),
        });

        // Save mapping
        if (payload.entity_type && payload.entity_id && payload.system_project_id) {
          await supabase.from("asana_task_mappings").upsert({
            asana_task_gid: result.data.gid,
            entity_type: payload.entity_type,
            entity_id: payload.entity_id,
            project_id: payload.system_project_id,
            user_id: userId,
          }, { onConflict: "entity_type,entity_id" });
        }

        return jsonResponse({ success: true, task: result.data });
      }

      // ── Sync status (update existing Asana task) ──
      case "sync_status": {
        if (!config?.enable_sync_status) {
          return jsonResponse({ error: "Sincronização de status está desativada" }, 403);
        }
        const { entity_type, entity_id, completed, notes: statusNotes } = payload;

        // Find mapping
        const { data: mapping } = await supabase
          .from("asana_task_mappings")
          .select("asana_task_gid")
          .eq("entity_type", entity_type)
          .eq("entity_id", entity_id)
          .single();

        if (!mapping) {
          return jsonResponse({ error: "Tarefa não encontrada no Asana" }, 404);
        }

        const updateData: Record<string, unknown> = {};
        if (completed !== undefined) updateData.completed = completed;
        if (statusNotes) updateData.notes = statusNotes;

        await asanaFetch(`/tasks/${mapping.asana_task_gid}`, {
          method: "PUT",
          body: JSON.stringify({ data: updateData }),
        });

        // Update synced_at
        await supabase
          .from("asana_task_mappings")
          .update({ synced_at: new Date().toISOString() })
          .eq("entity_type", entity_type)
          .eq("entity_id", entity_id);

        return jsonResponse({ success: true });
      }

      // ── Send notification (add comment to task or create task) ──
      case "notify": {
        if (!config?.enable_notifications) {
          return jsonResponse({ error: "Notificações no Asana estão desativadas" }, 403);
        }
        const { message, entity_type: nType, entity_id: nId } = payload;

        // Try to find existing task
        const { data: existingMapping } = await supabase
          .from("asana_task_mappings")
          .select("asana_task_gid")
          .eq("entity_type", nType)
          .eq("entity_id", nId)
          .single();

        if (existingMapping) {
          // Add comment
          await asanaFetch(`/tasks/${existingMapping.asana_task_gid}/stories`, {
            method: "POST",
            body: JSON.stringify({ data: { text: message } }),
          });
        } else if (config.project_gid) {
          // Create notification task
          await asanaFetch("/tasks", {
            method: "POST",
            body: JSON.stringify({
              data: {
                name: `[Notificação] ${message.substring(0, 80)}`,
                notes: message,
                projects: [config.project_gid],
              },
            }),
          });
        }

        return jsonResponse({ success: true });
      }

      // ── Import tasks from Asana as activities ──
      case "import_tasks": {
        if (!config?.enable_import_tasks) {
          return jsonResponse({ error: "Importar tarefas do Asana está desativado" }, 403);
        }
        const { project_gid: importProjectGid, system_project_id } = payload;
        const targetGid = importProjectGid || config.project_gid;
        if (!targetGid) {
          return jsonResponse({ error: "Project GID do Asana não configurado" }, 400);
        }

        // Get tasks from Asana
        const result = await asanaFetch(
          `/tasks?project=${targetGid}&opt_fields=name,notes,completed,due_on,created_at&limit=50`
        );
        const asanaTasks = result.data || [];

        // Import as activities
        const imported: string[] = [];
        for (const task of asanaTasks) {
          // Check if already imported
          const { data: existing } = await supabase
            .from("asana_task_mappings")
            .select("id")
            .eq("asana_task_gid", task.gid)
            .eq("entity_type", "activity")
            .single();

          if (existing) continue;

          const { data: activity, error: actError } = await supabase
            .from("activities")
            .insert({
              user_id: userId,
              project_id: system_project_id,
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
              project_id: system_project_id,
              user_id: userId,
            });
            imported.push(task.gid);
          }
        }

        return jsonResponse({
          success: true,
          imported_count: imported.length,
          total_tasks: asanaTasks.length,
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("asana-integration error:", e);
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
