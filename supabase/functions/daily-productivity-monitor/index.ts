const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey = Deno.env.get('RESEND_API_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const today = new Date().toISOString().split('T')[0]
    const nowMs = Date.now()

    // 1. Load config
    const { data: configRow } = await supabase
      .from('monitoring_config')
      .select('*')
      .limit(1)
      .single()

    if (!configRow || !configRow.is_active) {
      return new Response(JSON.stringify({ message: 'Monitoramento desativado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const config = configRow
    const inactiveDays = config.inactive_days_threshold || 3
    const minTasksPerDay = Number(config.min_tasks_per_day) || 1
    const scoreWeights = config.score_weights || { engagement: 20, volume: 20, efficiency: 20, quality: 20, consistency: 20 }
    const dropThreshold = Number(config.productivity_drop_threshold) || 30

    // 2. Get all non-superadmin users
    const { data: allRoles } = await supabase.from('user_roles').select('user_id, role')
    const roleMap = new Map<string, string>()
    const superAdminIds = new Set<string>()
    for (const r of allRoles || []) {
      roleMap.set(r.user_id, r.role)
      if (r.role === 'super_admin') superAdminIds.add(r.user_id)
    }
    const userIds = (allRoles || [])
      .filter(r => r.role !== 'super_admin')
      .map(r => r.user_id)

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum usuário para monitorar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email, last_login_at')
      .in('user_id', userIds)

    // 3b. Auth users last_sign_in_at (source of truth for login dates)
    const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authUsersMap = new Map<string, Date | null>()
    if (authUsersData?.users) {
      for (const u of authUsersData.users) {
        authUsersMap.set(u.id, u.last_sign_in_at ? new Date(u.last_sign_in_at) : null)
      }
    }
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

    // 4. Get user-project associations
    const { data: collabs } = await supabase
      .from('project_collaborators')
      .select('user_id, project_id')
      .in('user_id', userIds)

    const { data: projectRows } = await supabase
      .from('projects')
      .select('id, name')

    const projectNameMap = new Map((projectRows || []).map(p => [p.id, p.name]))
    const userProjectsMap = new Map<string, { id: string; name: string }[]>()
    for (const c of collabs || []) {
      if (!userProjectsMap.has(c.user_id)) userProjectsMap.set(c.user_id, [])
      userProjectsMap.get(c.user_id)!.push({
        id: c.project_id,
        name: projectNameMap.get(c.project_id) || 'Projeto',
      })
    }

    // 5. Get ALL activities (not just last 30 days) to find latest activity per user
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentActivities } = await supabase
      .from('activities')
      .select('id, user_id, date, created_at, updated_at, is_draft')
      .is('deleted_at', null)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .in('user_id', userIds)

    // Get latest activity date per user (all time) for cross-referencing
    const { data: latestActRows } = await supabase
      .from('activities')
      .select('user_id, date')
      .is('deleted_at', null)
      .in('user_id', userIds)
      .order('date', { ascending: false })

    const lastActivityMap = new Map<string, string>()
    for (const a of latestActRows || []) {
      if (!lastActivityMap.has(a.user_id)) {
        lastActivityMap.set(a.user_id, a.date)
      }
    }

    const actByUser = new Map<string, any[]>()
    for (const a of recentActivities || []) {
      if (!actByUser.has(a.user_id)) actByUser.set(a.user_id, [])
      actByUser.get(a.user_id)!.push(a)
    }

    // 6. Get report_performance_tracking for reopen_count
    const { data: perfTracking } = await supabase
      .from('report_performance_tracking')
      .select('user_id, reopen_count')
      .in('user_id', userIds)

    const reopenByUser = new Map<string, number>()
    for (const pt of perfTracking || []) {
      reopenByUser.set(pt.user_id, (reopenByUser.get(pt.user_id) || 0) + (pt.reopen_count || 0))
    }

    // 7. Get report_workflows for overdue count
    const { data: workflows } = await supabase
      .from('report_workflows')
      .select('user_id, status, deadline_at')
      .in('user_id', userIds)

    const overdueByUser = new Map<string, number>()
    for (const w of workflows || []) {
      if (w.deadline_at && new Date(w.deadline_at).getTime() < nowMs && w.status !== 'publicado' && w.status !== 'aprovado') {
        overdueByUser.set(w.user_id, (overdueByUser.get(w.user_id) || 0) + 1)
      }
    }

    // 8. Get previous day snapshots for drop detection
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const { data: prevSnaps } = await supabase
      .from('user_productivity_snapshots')
      .select('user_id, score, activities_count')
      .eq('snapshot_date', yesterday.toISOString().split('T')[0])

    const prevScoreMap = new Map<string, number>()
    for (const ps of prevSnaps || []) {
      prevScoreMap.set(ps.user_id, Number(ps.score) || 0)
    }

    // 9. Compute snapshots
    const snapshots: any[] = []
    const alertUsers: { name: string; email: string; reason: string }[] = []
    const newAlerts: any[] = []

    // First pass: collect activities counts for benchmark (only users with activity)
    const allCounts: number[] = []
    const userCountMap = new Map<string, number>()
    for (const uid of userIds) {
      const c = (actByUser.get(uid) || []).length
      allCounts.push(c)
      userCountMap.set(uid, c)
    }
    const activeCounts = allCounts.filter(c => c > 0)
    const teamAvg = activeCounts.length > 0 ? activeCounts.reduce((a, b) => a + b, 0) / activeCounts.length : 0
    const sortedCounts = [...allCounts].sort((a, b) => a - b)

    function percentile(val: number): number {
      if (sortedCounts.length === 0) return 0
      const below = sortedCounts.filter(v => v < val).length
      return Math.round((below / sortedCounts.length) * 100)
    }

    for (const uid of userIds) {
      const profile = profileMap.get(uid)
      if (!profile) continue

      const userActs = actByUser.get(uid) || []
      const activitiesCount = userActs.length
      const tasksStarted = userActs.filter(a => a.is_draft).length
      const tasksFinished = userActs.filter(a => !a.is_draft).length

      // Days inactive — cross-reference auth login AND last activity in diary
      const lastLogin = authUsersMap.get(uid) || null
      const lastActivityDate = lastActivityMap.get(uid)

      // Use the MOST RECENT between last login and last activity
      let lastActiveDate: Date | null = null
      if (lastLogin) lastActiveDate = lastLogin
      if (lastActivityDate) {
        const actDate = new Date(lastActivityDate)
        if (!lastActiveDate || actDate > lastActiveDate) {
          lastActiveDate = actDate
        }
      }

      const daysInactive = lastActiveDate
        ? Math.max(0, Math.floor((nowMs - lastActiveDate.getTime()) / 86400000))
        : 999 // never logged in AND never registered activity

      const neverParticipated = !lastLogin && !lastActivityDate
      const hasNoRecentActivity = activitiesCount === 0

      // Average task time
      let avgSeconds: number | null = null
      const taskTimes: number[] = []
      for (const a of userActs) {
        if (a.created_at && a.updated_at) {
          const diff = (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / 1000
          if (diff > 0 && diff < 86400 * 30) taskTimes.push(diff)
        }
      }
      if (taskTimes.length > 0) {
        avgSeconds = taskTimes.reduce((s, t) => s + t, 0) / taskTimes.length
      }

      const tasksPerDay = activitiesCount / 30

      // SLA
      const maxSla = config.max_avg_task_seconds || 86400
      const slaTotal = taskTimes.length
      const slaViolations = taskTimes.filter(t => t > maxSla).length
      const slaPct = slaTotal > 0 ? ((slaTotal - slaViolations) / slaTotal) * 100 : 100

      // Quality
      const reopenCount = reopenByUser.get(uid) || 0
      const overdueCount = overdueByUser.get(uid) || 0

      // Concurrent tasks (drafts)
      const concurrentTasks = tasksStarted

      // Delivery regularity (std dev of weekly counts over 4 weeks)
      const weekBuckets = [0, 0, 0, 0]
      for (const a of userActs) {
        const daysDiff = Math.floor((nowMs - new Date(a.date).getTime()) / 86400000)
        const weekIdx = Math.min(3, Math.floor(daysDiff / 7))
        weekBuckets[weekIdx]++
      }
      const weekMean = weekBuckets.reduce((a, b) => a + b, 0) / 4
      const weekStdDev = weekMean > 0
        ? Math.sqrt(weekBuckets.reduce((s, v) => s + (v - weekMean) ** 2, 0) / 4) / weekMean
        : 0

      // ── SCORE CALCULATION ──
      // KEY RULE: If you never participated, your score is 0.
      // If you haven't done anything in the period, score reflects only engagement (login).
      // Each dimension is 0-100.

      let engScore: number
      let volScore: number
      let effScore: number
      let qualScore: number
      let consScore: number

      if (neverParticipated) {
        // Never logged in, never did anything → everything is 0
        engScore = 0; volScore = 0; effScore = 0; qualScore = 0; consScore = 0
      } else if (hasNoRecentActivity) {
        // Logged in before but no recent activity → engagement based on recency, rest is 0
        engScore = Math.max(0, Math.min(100, 100 - daysInactive * 5))
        volScore = 0
        effScore = 0
        qualScore = 0 // no activity = can't prove quality
        consScore = 0 // no activity = no consistency
      } else {
        // Has activity → full calculation
        engScore = Math.max(0, Math.min(100, 100 - daysInactive * 5))
        volScore = Math.min(100, (tasksPerDay / Math.max(minTasksPerDay, 0.1)) * 100)
        effScore = slaTotal > 0 ? slaPct : 70 // default decent if no SLA data but has activities
        qualScore = Math.max(0, 100 - reopenCount * 20 - overdueCount * 10)
        consScore = Math.round((1 - Math.min(weekStdDev, 1)) * 100)
      }

      const deliveryRegularity = hasNoRecentActivity ? 0 : Math.round((1 - Math.min(weekStdDev, 1)) * 100)

      const wTotal = (scoreWeights.engagement || 20) + (scoreWeights.volume || 20) + (scoreWeights.efficiency || 20) + (scoreWeights.quality || 20) + (scoreWeights.consistency || 20)
      const score = wTotal > 0
        ? (engScore * (scoreWeights.engagement || 20)
          + volScore * (scoreWeights.volume || 20)
          + effScore * (scoreWeights.efficiency || 20)
          + qualScore * (scoreWeights.quality || 20)
          + consScore * (scoreWeights.consistency || 20)) / wTotal
        : 0

      const percentileRank = percentile(activitiesCount)

      // Status
      let status = 'ok'
      const reasons: string[] = []
      if (neverParticipated) {
        status = 'inactive'
        reasons.push('Nunca acessou o sistema')
      } else if (daysInactive > inactiveDays) {
        status = 'inactive'
        reasons.push(`${daysInactive} dias sem atividade`)
      }
      if (tasksPerDay < minTasksPerDay && activitiesCount > 0) {
        status = status === 'ok' ? 'low_performance' : status
        reasons.push(`Produtividade: ${tasksPerDay.toFixed(1)} tarefas/dia`)
      }
      if (activitiesCount === 0 && !neverParticipated && daysInactive <= inactiveDays) {
        status = 'low_performance'
        reasons.push('Sem atividades no período')
      }
      if (slaViolations > 0) {
        reasons.push(`${slaViolations} violações de SLA`)
      }

      const userProjects = userProjectsMap.get(uid) || []
      const userRole = roleMap.get(uid) || 'usuario'

      snapshots.push({
        user_id: uid,
        snapshot_date: today,
        activities_count: activitiesCount,
        avg_task_seconds: avgSeconds,
        days_inactive: daysInactive,
        tasks_per_day: tasksPerDay,
        sla_violations: slaViolations,
        sla_total: slaTotal,
        sla_pct_on_time: Number(slaPct.toFixed(2)),
        status,
        tasks_started: tasksStarted,
        tasks_finished: tasksFinished,
        reopen_count: reopenCount,
        overdue_count: overdueCount,
        concurrent_tasks: concurrentTasks,
        delivery_regularity: deliveryRegularity,
        team_avg_activities: Number(teamAvg.toFixed(2)),
        percentile_rank: percentileRank,
        score: Number(score.toFixed(1)),
        user_projects: userProjects,
        user_role: userRole,
      })

      // Intelligent alerts
      const userName = profile.name || profile.email

      // Alert: sudden drop
      const prevScore = prevScoreMap.get(uid)
      if (prevScore !== undefined && prevScore > 10 && score < prevScore * (1 - dropThreshold / 100)) {
        newAlerts.push({
          alert_type: 'productivity_drop',
          user_id: uid,
          user_name: userName,
          description: `Score caiu de ${prevScore.toFixed(0)} para ${score.toFixed(0)} (queda de ${((1 - score / prevScore) * 100).toFixed(0)}%)`,
          severity: 'critical',
        })
      }

      // Alert: recurring SLA violations
      if (slaViolations >= 3) {
        newAlerts.push({
          alert_type: 'recurring_sla',
          user_id: uid,
          user_name: userName,
          description: `${slaViolations} violações de SLA no período`,
          severity: 'warning',
        })
      }

      // Alert: inactivity
      if (daysInactive > inactiveDays && !neverParticipated) {
        newAlerts.push({
          alert_type: 'inactivity',
          user_id: uid,
          user_name: userName,
          description: `${daysInactive} dias sem atividade no sistema`,
          severity: daysInactive > inactiveDays * 3 ? 'critical' : 'warning',
        })
      }

      if (reasons.length > 0) {
        alertUsers.push({
          name: userName,
          email: profile.email,
          reason: reasons.join('; '),
        })
      }
    }

    // 10. Upsert snapshots
    if (snapshots.length > 0) {
      await supabase.from('user_productivity_snapshots').upsert(snapshots, {
        onConflict: 'user_id,snapshot_date',
      })
    }

    // 11. Insert alerts
    if (newAlerts.length > 0) {
      await supabase.from('monitoring_alerts').insert(newAlerts)
    }

    // 12. Send email alerts
    if (alertUsers.length > 0) {
      const { data: emailRecipients } = await supabase
        .from('monitoring_emails')
        .select('email')

      const recipients = (emailRecipients || []).map(e => e.email)

      if (recipients.length > 0 && resendApiKey) {
        const tableRows = alertUsers
          .map(u => `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${u.name}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${u.email}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${u.reason}</td></tr>`)
          .join('')

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
            <div style="background:#1e40af;padding:16px 24px;border-radius:8px 8px 0 0">
              <h1 style="color:#fff;margin:0;font-size:18px">🔔 GIRA — Alerta de Produtividade</h1>
            </div>
            <div style="padding:20px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <p style="color:#374151;font-size:14px">Relatório diário de monitoramento — ${new Date().toLocaleDateString('pt-BR')}</p>
              <p style="color:#374151;font-size:14px"><strong>${alertUsers.length}</strong> usuário(s) requerem atenção:</p>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">
                <thead>
                  <tr style="background:#f3f4f6"><th style="padding:8px 12px;text-align:left">Usuário</th><th style="padding:8px 12px;text-align:left">Email</th><th style="padding:8px 12px;text-align:left">Motivo</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
              <p style="color:#9ca3af;font-size:12px;margin-top:20px">Este email é gerado automaticamente pelo GIRA Diário de Bordo.</p>
            </div>
          </div>
        `

        const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

        for (const to of recipients) {
          try {
            await fetch(`${GATEWAY_URL}/emails`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': resendApiKey,
              },
              body: JSON.stringify({
                from: 'GIRA Monitoramento <onboarding@resend.dev>',
                to: [to],
                subject: `[GIRA] Alerta de Produtividade — ${alertUsers.length} usuário(s) — ${new Date().toLocaleDateString('pt-BR')}`,
                html,
              }),
            })
          } catch (emailErr) {
            console.error(`Erro ao enviar email para ${to}:`, emailErr)
          }
        }
      }
    }

    return new Response(JSON.stringify({
      message: 'Monitoramento concluído',
      snapshotsCreated: snapshots.length,
      alertsTriggered: newAlerts.length,
      emailAlerts: alertUsers.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Erro no monitoramento:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
