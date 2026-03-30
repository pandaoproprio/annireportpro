import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_WIDTH = 1920;
const QUALITY = 75;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!roleData || (roleData.role !== "admin" && roleData.role !== "super_admin")) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
    }

    const results = { optimized: 0, skipped: 0, errors: [] as string[], savedBytes: 0 };

    // Extract storage path from a public URL
    function extractStoragePath(url: string, bucket: string): string | null {
      try {
        const marker = `/storage/v1/object/public/${bucket}/`;
        const idx = url.indexOf(marker);
        if (idx === -1) return null;
        return decodeURIComponent(url.substring(idx + marker.length).split("?")[0]);
      } catch { return null; }
    }

    // Optimize a single image in a bucket
    async function optimizeImage(url: string, bucket: string): Promise<boolean> {
      if (!url || !url.startsWith("http") || url.startsWith("data:")) return false;
      // Only optimize storage URLs
      if (!url.includes(`/storage/v1/object/public/${bucket}/`)) return false;

      const path = extractStoragePath(url, bucket);
      if (!path) return false;

      // Skip non-image extensions
      const ext = path.split(".").pop()?.toLowerCase();
      if (!ext || !["jpg", "jpeg", "png", "webp", "bmp", "tiff"].includes(ext)) return false;

      try {
        // Download original to check size
        const { data: origData, error: dlErr } = await supabase.storage.from(bucket).download(path);
        if (dlErr || !origData) {
          results.errors.push(`Download failed ${path}: ${dlErr?.message}`);
          return false;
        }

        const origSize = origData.size;
        // Skip already small files (< 150KB)
        if (origSize < 150 * 1024) {
          results.skipped++;
          return false;
        }

        // Use Supabase Storage transform API to get optimized version
        const transformUrl = `${supabaseUrl}/storage/v1/render/image/public/${bucket}/${path}?width=${MAX_WIDTH}&quality=${QUALITY}&resize=contain`;
        const resp = await fetch(transformUrl, {
          headers: { "Authorization": `Bearer ${serviceKey}` },
        });

        if (!resp.ok) {
          // Transform API not available, fallback: skip
          results.skipped++;
          return false;
        }

        const optimizedBlob = await resp.blob();
        
        // Only replace if actually smaller
        if (optimizedBlob.size >= origSize) {
          results.skipped++;
          return false;
        }

        const optimizedBytes = new Uint8Array(await optimizedBlob.arrayBuffer());
        const contentType = optimizedBlob.type || "image/jpeg";

        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, optimizedBytes, { contentType, cacheControl: "3600", upsert: true });

        if (upErr) {
          results.errors.push(`Upload failed ${path}: ${upErr.message}`);
          return false;
        }

        const saved = origSize - optimizedBlob.size;
        results.savedBytes += saved;
        results.optimized++;
        return true;
      } catch (e) {
        results.errors.push(`Error ${path}: ${String(e)}`);
        return false;
      }
    }

    // Collect all unique image URLs from the database
    const allUrls = new Set<string>();
    const bucketMap = new Map<string, string>(); // url -> bucket

    function addUrl(url: string, bucket: string) {
      if (url && typeof url === "string" && url.startsWith("http") && url.includes(`/${bucket}/`)) {
        allUrls.add(url);
        bucketMap.set(url, bucket);
      }
    }

    // 1. Activities photos
    const { data: activities } = await supabase.from("activities").select("photos");
    if (activities) {
      for (const a of activities) {
        if (Array.isArray(a.photos)) {
          for (const p of a.photos) addUrl(p, "project-photos");
        }
      }
    }

    // 2. Team reports photos
    const { data: reports } = await supabase.from("team_reports").select("photos");
    if (reports) {
      for (const r of reports) {
        if (Array.isArray(r.photos)) {
          for (const p of r.photos) addUrl(p, "team-report-photos");
        }
      }
    }

    // 3. Projects report_data (logos, goal photos, expense images, etc.)
    const { data: projects } = await supabase.from("projects").select("report_data");
    if (projects) {
      for (const proj of projects) {
        if (!proj.report_data) continue;
        const rd = proj.report_data as Record<string, any>;

        for (const key of ["logo", "logoSecondary", "headerBannerUrl"]) {
          if (typeof rd[key] === "string") {
            addUrl(rd[key], "team-report-photos");
            addUrl(rd[key], "project-photos");
          }
        }

        for (const key of ["otherActionsPhotos", "communicationPhotos"]) {
          if (Array.isArray(rd[key])) {
            for (const p of rd[key]) {
              addUrl(p, "team-report-photos");
              addUrl(p, "project-photos");
            }
          }
        }

        if (rd.goalPhotos && typeof rd.goalPhotos === "object") {
          for (const goalId of Object.keys(rd.goalPhotos)) {
            if (Array.isArray(rd.goalPhotos[goalId])) {
              for (const p of rd.goalPhotos[goalId]) {
                addUrl(p, "team-report-photos");
                addUrl(p, "project-photos");
              }
            }
          }
        }

        if (Array.isArray(rd.expenses)) {
          for (const exp of rd.expenses) {
            if (exp.image) {
              addUrl(exp.image, "team-report-photos");
              addUrl(exp.image, "project-photos");
            }
          }
        }
      }
    }

    // 4. Justification reports section_photos
    const { data: justReports } = await supabase.from("justification_reports").select("section_photos");
    if (justReports) {
      for (const jr of justReports) {
        if (jr.section_photos && typeof jr.section_photos === "object") {
          const sp = jr.section_photos as Record<string, any>;
          for (const key of Object.keys(sp)) {
            if (Array.isArray(sp[key])) {
              for (const p of sp[key]) {
                if (typeof p === "string") addUrl(p, "team-report-photos");
                if (typeof p === "object" && p?.url) addUrl(p.url, "team-report-photos");
              }
            }
          }
        }
      }
    }

    // 5. Events cover images
    const { data: events } = await supabase.from("events").select("cover_image_url");
    if (events) {
      for (const ev of events) {
        if (ev.cover_image_url) addUrl(ev.cover_image_url, "team-report-photos");
      }
    }

    // 6. Document images
    const { data: docs } = await supabase.from("documents").select("content");
    if (docs) {
      for (const doc of docs) {
        if (doc.content && typeof doc.content === "object") {
          const content = doc.content as any;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block?.src) addUrl(block.src, "document-images");
            }
          }
        }
      }
    }

    // Process all collected URLs
    const urlList = Array.from(allUrls);
    // Process in batches of 5 to avoid overwhelming the server
    for (let i = 0; i < urlList.length; i += 5) {
      const batch = urlList.slice(i, i + 5);
      await Promise.all(batch.map(url => {
        const bucket = bucketMap.get(url) || "team-report-photos";
        return optimizeImage(url, bucket);
      }));
    }

    const savedMB = (results.savedBytes / (1024 * 1024)).toFixed(2);

    return new Response(JSON.stringify({
      success: true,
      total_images: allUrls.size,
      optimized: results.optimized,
      skipped: results.skipped,
      errors_count: results.errors.length,
      saved_mb: savedMB,
      errors: results.errors.slice(0, 20),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
