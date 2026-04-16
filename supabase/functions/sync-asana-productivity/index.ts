const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const asanaPat = Deno.env.get('ASANA_PAT')!

const ASANA_API = 'https://app.asana.com/api/1.0'

async function asanaGet(path: string): Promise<any> {
  const res = await fetch(`${ASANA_API}${path}`, {
    headers: { 'Authorization': `Bearer ${asanaPat}` },
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Asana API ${res.status}: ${txt}`)
  }
  return (await res.json()).data
}

async function asanaGetPaginated(path: string): Promise<any[]> {
  const results: any[] = []
  let url = `${ASANA_API}${path}`
  const separator = path.includes('?') ? '&' : '?'
  url += `${separator}limit=100`

  while (url) {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${asanaPat}` },
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Asana API ${res.status}: ${txt}`)
    }
    const json = await res.json()
    results.push(...(json.data || []))
    url = json.next_page?.uri || ''
  }
  return results
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!asanaPat) {
      return new Response(JSON.stringify({ error: 'ASANA_PAT não configurado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const today = new Date().toISOString().split('T')[0]

    // 1. Get active boards to monitor
    const { data: boards } = await supabase
      .from('monitoring_asana_boards')
      .select('*')
      .eq('is_active', true)

    if (!boards || boards.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum board Asana configurado para monitoramento' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Get all profiles for email mapping
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, name')

    const emailToUserId = new Map<string, string>()
    for (const p of profiles || []) {
      if (p.email) emailToUserId.set(p.email.toLowerCase(), p.user_id)
    }

    // 3. Calculate period (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sinceDate = thirtyDaysAgo.toISOString().split('T')[0]

    let totalSnapshots = 0

    for (const board of boards) {
      try {
        const projectGid = board.asana_project_gid

        // 3a. Get project info to update name
        try {
          const projectInfo = await asanaGet(`/projects/${projectGid}?opt_fields=name,workspace.gid`)
          if (projectInfo?.name) {
            await supabase
              .from('monitoring_asana_boards')
              .update({
                asana_project_name: projectInfo.name,
                asana_workspace_gid: projectInfo.workspace?.gid || board.asana_workspace_gid,
              })
              .eq('id', board.id)
          }
        } catch { /* ignore name update errors */ }

        // 3b. Get all tasks completed in the period
        const completedTasks = await asanaGetPaginated(
          `/tasks?project=${projectGid}&completed_since=${sinceDate}&opt_fields=assignee,assignee.email,assignee.name,completed,completed_at,created_at,created_by,created_by.email,created_by.name,due_on,num_subtasks`
        )

        // 3c. Get all tasks (including incomplete) to count created tasks
        const allTasks = await asanaGetPaginated(
          `/tasks?project=${projectGid}&modified_since=${sinceDate}T00:00:00Z&opt_fields=assignee,assignee.email,assignee.name,completed,completed_at,created_at,created_by,created_by.email,created_by.name,due_on,num_subtasks`
        )

        // Build per-user metrics
        const userMetrics = new Map<string, {
          gid: string; email: string; name: string;
          completed: number; created: number; onTime: number; overdue: number;
          subtasks: number; comments: number;
        }>()

        function getOrCreateUser(gid: string, email: string, name: string) {
          if (!userMetrics.has(gid)) {
            userMetrics.set(gid, {
              gid, email: email || '', name: name || 'Desconhecido',
              completed: 0, created: 0, onTime: 0, overdue: 0,
              subtasks: 0, comments: 0,
            })
          }
          return userMetrics.get(gid)!
        }

        // Count completed tasks per assignee
        for (const task of completedTasks) {
          if (!task.completed || !task.assignee?.gid) continue
          const u = getOrCreateUser(task.assignee.gid, task.assignee.email || '', task.assignee.name || '')
          u.completed++

          // Check deadline compliance
          if (task.due_on && task.completed_at) {
            const dueDate = new Date(task.due_on + 'T23:59:59Z')
            const completedDate = new Date(task.completed_at)
            if (completedDate <= dueDate) {
              u.onTime++
            } else {
              u.overdue++
            }
          } else if (task.completed) {
            // No due date = on time by default
            u.onTime++
          }

          // Count subtasks
          if (task.num_subtasks > 0) {
            u.subtasks += task.num_subtasks
          }
        }

        // Count created tasks per creator
        for (const task of allTasks) {
          if (!task.created_by?.gid) continue
          const createdAt = new Date(task.created_at)
          if (createdAt >= thirtyDaysAgo) {
            const u = getOrCreateUser(task.created_by.gid, task.created_by.email || '', task.created_by.name || '')
            u.created++
          }
        }

        // 3d. Get stories (comments) for each task to count per user
        // Limit to last 30 tasks to avoid API rate limits
        const recentTasks = allTasks.slice(0, 30)
        for (const task of recentTasks) {
          try {
            const stories = await asanaGet(`/tasks/${task.gid}/stories?opt_fields=type,created_by,created_by.email,created_by.name`)
            for (const story of stories || []) {
              if (story.type === 'comment' && story.created_by?.gid) {
                const u = getOrCreateUser(story.created_by.gid, story.created_by.email || '', story.created_by.name || '')
                u.comments++
              }
            }
          } catch { /* skip story errors */ }
        }

        // 3e. Upsert snapshots
        const snapshots = Array.from(userMetrics.values()).map(u => ({
          board_id: board.id,
          asana_user_gid: u.gid,
          asana_user_email: u.email || null,
          asana_user_name: u.name,
          mapped_user_id: u.email ? (emailToUserId.get(u.email.toLowerCase()) || null) : null,
          snapshot_date: today,
          tasks_completed: u.completed,
          tasks_created: u.created,
          tasks_on_time: u.onTime,
          tasks_overdue: u.overdue,
          subtasks_completed: u.subtasks,
          comments_count: u.comments,
        }))

        if (snapshots.length > 0) {
          await supabase.from('monitoring_asana_snapshots').upsert(snapshots, {
            onConflict: 'board_id,asana_user_gid,snapshot_date',
          })
          totalSnapshots += snapshots.length
        }

        // Update last sync time
        await supabase
          .from('monitoring_asana_boards')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', board.id)

      } catch (boardErr) {
        console.error(`Erro ao processar board ${board.asana_project_gid}:`, boardErr)
      }
    }

    return new Response(JSON.stringify({
      message: 'Sincronização Asana concluída',
      boardsProcessed: boards.length,
      snapshotsCreated: totalSnapshots,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Erro na sincronização Asana:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})