import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    if (!roleData || (roleData.role !== "admin" && roleData.role !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
    }

    const results = { team_reports: 0, activities: 0, projects: 0, errors: [] as string[] };

    // Helper: upload base64 to storage
    async function uploadBase64(base64: string, path: string): Promise<string | null> {
      try {
        const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) return null;
        
        const contentType = matches[1];
        const b64Data = matches[2];
        const bytes = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
        
        const { error } = await supabase.storage
          .from("team-report-photos")
          .upload(path, bytes, { contentType, cacheControl: "3600", upsert: true });
        
        if (error) {
          results.errors.push(`Upload error for ${path}: ${error.message}`);
          return null;
        }
        
        const { data: urlData } = supabase.storage
          .from("team-report-photos")
          .getPublicUrl(path);
        
        return urlData.publicUrl;
      } catch (e) {
        results.errors.push(`Error processing ${path}: ${String(e)}`);
        return null;
      }
    }

    // 1. Migrate team_reports photos
    const { data: reports } = await supabase
      .from("team_reports")
      .select("id, photos, project_id")
      .not("deleted_at", "is", null)
      .or("deleted_at.is.null");
    
    // Get all team reports (including non-deleted)
    const { data: allReports } = await supabase
      .from("team_reports")
      .select("id, photos, project_id");

    if (allReports) {
      for (const report of allReports) {
        if (!report.photos || report.photos.length === 0) continue;
        
        let changed = false;
        const newPhotos: string[] = [];
        
        for (let i = 0; i < report.photos.length; i++) {
          const photo = report.photos[i];
          if (photo.startsWith("data:")) {
            const ext = photo.startsWith("data:image/png") ? "png" : "jpg";
            const path = `migration/${report.project_id}/team-reports/${report.id}/${crypto.randomUUID()}.${ext}`;
            const url = await uploadBase64(photo, path);
            newPhotos.push(url || photo);
            if (url) changed = true;
          } else {
            newPhotos.push(photo);
          }
        }
        
        if (changed) {
          await supabase
            .from("team_reports")
            .update({ photos: newPhotos })
            .eq("id", report.id);
          results.team_reports++;
        }
      }
    }

    // 2. Migrate activities photos
    const { data: allActivities } = await supabase
      .from("activities")
      .select("id, photos, project_id");

    if (allActivities) {
      for (const activity of allActivities) {
        if (!activity.photos || activity.photos.length === 0) continue;
        
        let changed = false;
        const newPhotos: string[] = [];
        
        for (let i = 0; i < activity.photos.length; i++) {
          const photo = activity.photos[i];
          if (photo.startsWith("data:")) {
            const ext = photo.startsWith("data:image/png") ? "png" : "jpg";
            const path = `migration/${activity.project_id}/activities/${activity.id}/${crypto.randomUUID()}.${ext}`;
            const url = await uploadBase64(photo, path);
            newPhotos.push(url || photo);
            if (url) changed = true;
          } else {
            newPhotos.push(photo);
          }
        }
        
        if (changed) {
          await supabase
            .from("activities")
            .update({ photos: newPhotos })
            .eq("id", activity.id);
          results.activities++;
        }
      }
    }

    // 3. Migrate project report_data (logos, goalPhotos, otherActionsPhotos, communicationPhotos, expense images)
    const { data: allProjects } = await supabase
      .from("projects")
      .select("id, report_data");

    if (allProjects) {
      for (const project of allProjects) {
        if (!project.report_data) continue;
        const rd = project.report_data as Record<string, any>;
        let changed = false;

        // Migrate logos
        for (const key of ["logo", "logoSecondary"]) {
          if (rd[key] && typeof rd[key] === "string" && rd[key].startsWith("data:")) {
            const ext = rd[key].startsWith("data:image/png") ? "png" : "jpg";
            const path = `migration/${project.id}/logos/${key}_${crypto.randomUUID()}.${ext}`;
            const url = await uploadBase64(rd[key], path);
            if (url) { rd[key] = url; changed = true; }
          }
        }

        // Migrate photo arrays
        for (const key of ["otherActionsPhotos", "communicationPhotos"]) {
          if (Array.isArray(rd[key])) {
            for (let i = 0; i < rd[key].length; i++) {
              if (rd[key][i].startsWith("data:")) {
                const ext = rd[key][i].startsWith("data:image/png") ? "png" : "jpg";
                const path = `migration/${project.id}/${key}/${crypto.randomUUID()}.${ext}`;
                const url = await uploadBase64(rd[key][i], path);
                if (url) { rd[key][i] = url; changed = true; }
              }
            }
          }
        }

        // Migrate goalPhotos
        if (rd.goalPhotos && typeof rd.goalPhotos === "object") {
          for (const goalId of Object.keys(rd.goalPhotos)) {
            if (Array.isArray(rd.goalPhotos[goalId])) {
              for (let i = 0; i < rd.goalPhotos[goalId].length; i++) {
                if (rd.goalPhotos[goalId][i].startsWith("data:")) {
                  const ext = rd.goalPhotos[goalId][i].startsWith("data:image/png") ? "png" : "jpg";
                  const path = `migration/${project.id}/goals/${goalId}/${crypto.randomUUID()}.${ext}`;
                  const url = await uploadBase64(rd.goalPhotos[goalId][i], path);
                  if (url) { rd.goalPhotos[goalId][i] = url; changed = true; }
                }
              }
            }
          }
        }

        // Migrate expense images
        if (Array.isArray(rd.expenses)) {
          for (const expense of rd.expenses) {
            if (expense.image && expense.image.startsWith("data:")) {
              const ext = expense.image.startsWith("data:image/png") ? "png" : "jpg";
              const path = `migration/${project.id}/expenses/${crypto.randomUUID()}.${ext}`;
              const url = await uploadBase64(expense.image, path);
              if (url) { expense.image = url; changed = true; }
            }
          }
        }

        if (changed) {
          await supabase
            .from("projects")
            .update({ report_data: rd })
            .eq("id", project.id);
          results.projects++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
