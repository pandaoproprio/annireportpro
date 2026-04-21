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

    // 5. Get system-wide usage across ALL modules (not just Diário de Bordo)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentActivities } = await supabase
      .from('activities')
      .select('id, user_id, date, created_at, updated_at, is_draft')
      .is('deleted_at', null)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .in('user_id', userIds)

    // Get latest interaction date per user across ALL system modules
    const lastSystemUsageMap = new Map<string, Date>()
    const systemModulesUsed = new Map<string, Set<string>>()

    function trackUsage(userId: string, dateStr: string, module: string) {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return
      const prev = lastSystemUsageMap.get(userId)
      if (!prev || d > prev) lastSystemUsageMap.set(userId, d)
      if (!systemModulesUsed.has(userId)) systemModulesUsed.set(userId, new Set())
      systemModulesUsed.get(userId)!.add(module)
    }

    // 5a. Diário de Bordo (activities)
    const { data: latestActRows } = await supabase
      .from('activities')
      .select('user_id, date')
      .is('deleted_at', null)
      .in('user_id', userIds)
      .order('date', { ascending: false })

    for (const a of latestActRows || []) {
      trackUsage(a.user_id, a.date, 'diario')
    }

    // 5b. Relatórios de equipe
    const { data: teamReportRows } = await supabase
      .from('team_reports')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const r of teamReportRows || []) {
      trackUsage(r.user_id, r.created_at, 'relatorios')
    }

    // 5c. Workflows
    const { data: wfRows } = await supabase
      .from('report_workflows')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const w of wfRows || []) {
      trackUsage(w.user_id, w.created_at, 'workflows')
    }

    // 5d. Formulários criados
    const { data: formRows } = await supabase
      .from('forms')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const f of formRows || []) {
      trackUsage(f.user_id, f.created_at, 'formularios')
    }

    // 5e. Eventos criados
    const { data: eventRows } = await supabase
      .from('events')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const e of eventRows || []) {
      trackUsage(e.user_id, e.created_at, 'eventos')
    }

    // 5f. Chat messages
    const { data: chatRows } = await supabase
      .from('chat_messages')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const c of chatRows || []) {
      trackUsage(c.user_id, c.created_at, 'chat')
    }

    // 5g. Documentos criados
    const { data: docRows } = await supabase
      .from('documents')
      .select('created_by, created_at')
      .in('created_by', userIds)
      .order('created_at', { ascending: false })
    for (const d of docRows || []) {
      trackUsage(d.created_by, d.created_at, 'documentos')
    }

    // 5h. Notas fiscais
    const { data: invoiceRows } = await supabase
      .from('invoices')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const i of invoiceRows || []) {
      trackUsage(i.user_id, i.created_at, 'notas_fiscais')
    }

    // 5i. Narrativas de atividade
    const { data: narrRows } = await supabase
      .from('activity_narratives')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const n of narrRows || []) {
      trackUsage(n.user_id, n.created_at, 'narrativas')
    }

    // 5j. Audit logs (represents any tracked system action)
    const { data: auditRows } = await supabase
      .from('audit_logs')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
    for (const a of auditRows || []) {
      trackUsage(a.user_id, a.created_at, 'audit')
    }

    // 5k. Asana productivity snapshots (from monitoring_asana_snapshots)
    const { data: asanaSnaps } = await supabase
      .from('monitoring_asana_snapshots')
      .select('mapped_user_id, snapshot_date, tasks_completed, tasks_created, tasks_on_time, tasks_overdue, subtasks_completed, comments_count')
      .not('mapped_user_id', 'is', null)
      .gte('snapshot_date', thirtyDaysAgo.toISOString().split('T')[0])

    const asanaCountByUser = new Map<string, { completed: number; created: number; onTime: number; overdue: number; subtasks: number; comments: number }>()
    for (const s of asanaSnaps || []) {
      if (!s.mapped_user_id) continue
      const uid = s.mapped_user_id
      trackUsage(uid, s.snapshot_date, 'asana')
      const prev = asanaCountByUser.get(uid) || { completed: 0, created: 0, onTime: 0, overdue: 0, subtasks: 0, comments: 0 }
      prev.completed += s.tasks_completed || 0
      prev.created += s.tasks_created || 0
      prev.onTime += s.tasks_on_time || 0
      prev.overdue += s.tasks_overdue || 0
      prev.subtasks += s.subtasks_completed || 0
      prev.comments += s.comments_count || 0
      asanaCountByUser.set(uid, prev)
    }

    // Also track old asana_task_mappings for system usage
    const { data: asanaOldRows } = await supabase
      .from('asana_task_mappings')
      .select('user_id, synced_at')
      .in('user_id', userIds)
      .order('synced_at', { ascending: false })
    for (const a of asanaOldRows || []) {
      trackUsage(a.user_id, a.synced_at, 'asana')
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
      const asanaData = asanaCountByUser.get(uid) || { completed: 0, created: 0, onTime: 0, overdue: 0, subtasks: 0, comments: 0 }
      const asanaDeliveries = asanaData.completed + asanaData.subtasks
      const activitiesCount = userActs.length + asanaDeliveries // Diário + Asana combined
      const tasksStarted = userActs.filter(a => a.is_draft).length
      const tasksFinished = userActs.filter(a => !a.is_draft).length + asanaDeliveries

      // Days inactive — cross-reference auth login AND last system-wide usage
      const lastLogin = authUsersMap.get(uid) || null
      const lastSystemUsage = lastSystemUsageMap.get(uid) || null
      const userModules = systemModulesUsed.get(uid) || new Set()

      // Use the MOST RECENT between last login and last system usage
      let lastActiveDate: Date | null = null
      if (lastLogin) lastActiveDate = lastLogin
      if (lastSystemUsage) {
        if (!lastActiveDate || lastSystemUsage > lastActiveDate) {
          lastActiveDate = lastSystemUsage
        }
      }

      const hasLoggedIn = Boolean(lastLogin)
      const hasSystemUsage = userModules.size > 0
      const hasNoTrackedHistory = !hasSystemUsage && !hasLoggedIn

      const daysInactive = lastActiveDate
        ? Math.max(0, Math.floor((nowMs - lastActiveDate.getTime()) / 86400000))
        : 999 // never logged in AND never registered activity

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
      // KEY RULE: Without any tracked history in Diário de Bordo, score is 0.
      // If there is historical participation but nothing in the recent period (Diário + Asana), score reflects only engagement.
      // Each dimension is 0-100.
      // Asana metrics feed into: volume (completed+subtasks), efficiency (on-time %), quality (overdue penalty), consistency (activity signals).

      let engScore: number
      let volScore: number
      let effScore: number
      let qualScore: number
      let consScore: number

      if (hasNoTrackedHistory && asanaDeliveries === 0) {
        // Never logged in AND never used any module AND no Asana work → everything is 0
        engScore = 0; volScore = 0; effScore = 0; qualScore = 0; consScore = 0
      } else if (hasNoRecentActivity && asanaDeliveries === 0) {
        // Has login or system usage but no recent Diário + no Asana → engagement only
        engScore = Math.max(0, Math.min(100, 100 - daysInactive * 5))
        volScore = 0
        effScore = 0
        qualScore = 0
        consScore = 0
      } else {
        // Has activity (Diário and/or Asana) → full calculation
        engScore = Math.max(0, Math.min(100, 100 - daysInactive * 5))
        volScore = Math.min(100, (tasksPerDay / Math.max(minTasksPerDay, 0.1)) * 100)

        // Efficiency: blend internal SLA with Asana on-time rate
        const internalEffPct = slaTotal > 0 ? slaPct : null
        const asanaEffTotal = asanaData.onTime + asanaData.overdue
        const asanaEffPct = asanaEffTotal > 0 ? (asanaData.onTime / asanaEffTotal) * 100 : null
        if (internalEffPct !== null && asanaEffPct !== null) {
          effScore = (internalEffPct + asanaEffPct) / 2
        } else if (asanaEffPct !== null) {
          effScore = asanaEffPct
        } else if (internalEffPct !== null) {
          effScore = internalEffPct
        } else {
          effScore = activitiesCount > 0 ? 70 : 50 // default decent if has some activity
        }

        // Quality: penalize reopens and overdue (both internal and Asana)
        const totalOverdue = overdueCount + asanaData.overdue
        qualScore = Math.max(0, 100 - reopenCount * 20 - totalOverdue * 10)

        // Consistency: boost with Asana activity signals (comments, created tasks)
        const baseConsistency = Math.round((1 - Math.min(weekStdDev, 1)) * 100)
        const asanaActivityBonus = Math.min(20, (asanaData.comments + asanaData.created) * 2)
        consScore = Math.min(100, baseConsistency + (asanaDeliveries > 0 ? asanaActivityBonus : 0))
      }

      const deliveryRegularity = (hasNoRecentActivity && asanaDeliveries === 0) ? 0 : Math.round((1 - Math.min(weekStdDev, 1)) * 100)

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
      if (hasNoTrackedHistory) {
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
      if (activitiesCount === 0 && hasSystemUsage && daysInactive <= inactiveDays) {
        status = 'low_performance'
        reasons.push('Sem atividades no Diário no período (usou: ' + [...userModules].join(', ') + ')')
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
      if (daysInactive > inactiveDays && hasSystemUsage) {
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

        console.log(`[email] Tentando enviar para ${recipients.length} destinatário(s):`, recipients)
        console.log(`[email] LOVABLE_API_KEY=${!!LOVABLE_API_KEY}, RESEND_API_KEY=${!!resendApiKey}`)

        for (const to of recipients) {
          try {
            const resp = await fetch(`${GATEWAY_URL}/emails`, {
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
            const respText = await resp.text()
            if (!resp.ok) {
              console.error(`[email] FALHA ${to} — status ${resp.status}: ${respText}`)
            } else {
              console.log(`[email] OK ${to}: ${respText}`)
            }
          } catch (emailErr) {
            console.error(`[email] EXCEÇÃO ${to}:`, emailErr)
          }
        }
      } else {
        console.log(`[email] Pulado — recipients=${recipients.length}, resendApiKey=${!!resendApiKey}`)
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
