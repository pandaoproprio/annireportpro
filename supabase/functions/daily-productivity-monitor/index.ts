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

    // 2. Get all non-superadmin users
    const { data: allRoles } = await supabase.from('user_roles').select('user_id, role')
    const superAdminIds = new Set(
      (allRoles || []).filter(r => r.role === 'super_admin').map(r => r.user_id)
    )
    const userIds = (allRoles || [])
      .filter(r => r.role !== 'super_admin')
      .map(r => r.user_id)

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum usuário para monitorar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Get profiles for name/email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email, last_login_at')
      .in('user_id', userIds)

    // 3b. Get auth.users last_sign_in_at (more accurate than profiles.last_login_at)
    const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authUsersMap = new Map<string, Date | null>()
    if (authUsersData?.users) {
      for (const u of authUsersData.users) {
        authUsersMap.set(u.id, u.last_sign_in_at ? new Date(u.last_sign_in_at) : null)
      }
    }

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]))

    // 4. Get activities from last 30 days for all users
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activities } = await supabase
      .from('activities')
      .select('id, user_id, date, created_at, updated_at')
      .is('deleted_at', null)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .in('user_id', userIds)

    // Group activities by user
    const actByUser = new Map<string, any[]>()
    for (const a of activities || []) {
      if (!actByUser.has(a.user_id)) actByUser.set(a.user_id, [])
      actByUser.get(a.user_id)!.push(a)
    }

    // 5. Compute snapshots
    const snapshots: any[] = []
    const alertUsers: { name: string; email: string; reason: string }[] = []

    for (const uid of userIds) {
      const profile = profileMap.get(uid)
      if (!profile) continue

      const userActs = actByUser.get(uid) || []
      const activitiesCount = userActs.length

      // Days inactive
      const lastLogin = profile.last_login_at ? new Date(profile.last_login_at) : null
      const daysInactive = lastLogin
        ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000)
        : 999

      // Average task time (created_at → updated_at as proxy)
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

      // Tasks per day (over 30 day window)
      const tasksPerDay = activitiesCount / 30

      // SLA - simple: count tasks where time > max threshold
      const maxSla = config.max_avg_task_seconds || 86400
      const slaTotal = taskTimes.length
      const slaViolations = taskTimes.filter(t => t > maxSla).length
      const slaPct = slaTotal > 0 ? ((slaTotal - slaViolations) / slaTotal) * 100 : 100

      // Status
      let status = 'ok'
      const reasons: string[] = []
      if (daysInactive > inactiveDays) {
        status = 'inactive'
        reasons.push(`${daysInactive} dias sem login`)
      }
      if (tasksPerDay < minTasksPerDay && activitiesCount > 0) {
        status = status === 'ok' ? 'low_performance' : status
        reasons.push(`Produtividade: ${tasksPerDay.toFixed(1)} tarefas/dia`)
      }
      if (slaViolations > 0) {
        reasons.push(`${slaViolations} violações de SLA`)
      }

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
      })

      if (reasons.length > 0) {
        alertUsers.push({
          name: profile.name || profile.email,
          email: profile.email,
          reason: reasons.join('; '),
        })
      }
    }

    // 6. Upsert snapshots
    if (snapshots.length > 0) {
      await supabase.from('user_productivity_snapshots').upsert(snapshots, {
        onConflict: 'user_id,snapshot_date',
      })
    }

    // 7. Send email alerts if there are issues
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
      alertsTriggered: alertUsers.length,
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
