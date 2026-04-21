import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'GIRA Diário de Bordo'

interface AlertUser {
  name: string
  email: string
  reason: string
}

interface ProductivityAlertProps {
  alertUsers?: AlertUser[]
  reportDate?: string
}

const ProductivityAlertEmail = ({
  alertUsers = [],
  reportDate,
}: ProductivityAlertProps) => {
  const total = alertUsers.length
  const dateLabel = reportDate || new Date().toLocaleDateString('pt-BR')

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>
        {total} usuário(s) requerem atenção — {dateLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>🔔 Alerta de Produtividade</Heading>
            <Text style={headerSub}>{SITE_NAME}</Text>
          </Section>

          <Section style={content}>
            <Text style={lead}>
              Relatório diário de monitoramento — <strong>{dateLabel}</strong>
            </Text>
            <Text style={text}>
              <strong>{total}</strong> usuário(s) requerem atenção:
            </Text>

            <table style={table as React.CSSProperties}>
              <thead>
                <tr style={tableHeadRow}>
                  <th style={th}>Usuário</th>
                  <th style={th}>Email</th>
                  <th style={th}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {alertUsers.map((u, i) => (
                  <tr key={i}>
                    <td style={td}>{u.name}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{u.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Text style={footer}>
              Este email é gerado automaticamente pelo {SITE_NAME}. Para
              ajustar critérios ou destinatários, acesse o painel de
              Monitoramento de Produtividade.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ProductivityAlertEmail,
  subject: (data: Record<string, any>) => {
    const total = Array.isArray(data?.alertUsers) ? data.alertUsers.length : 0
    const date = data?.reportDate || new Date().toLocaleDateString('pt-BR')
    return `[GIRA] Alerta de Produtividade — ${total} usuário(s) — ${date}`
  },
  displayName: 'Alerta de Produtividade',
  previewData: {
    reportDate: '21/04/2026',
    alertUsers: [
      {
        name: 'Maria Silva',
        email: 'maria@example.com',
        reason: 'Inativo há 4 dias',
      },
      {
        name: 'João Souza',
        email: 'joao@example.com',
        reason: 'Baixa produtividade (2 atividades em 7 dias)',
      },
    ],
  },
} satisfies TemplateEntry

const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, sans-serif',
  margin: 0,
  padding: '20px 0',
}

const container: React.CSSProperties = {
  maxWidth: '700px',
  margin: '0 auto',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  background: '#1e40af',
  padding: '20px 24px',
}

const h1: React.CSSProperties = {
  color: '#ffffff',
  margin: 0,
  fontSize: '20px',
  fontWeight: 'bold',
}

const headerSub: React.CSSProperties = {
  color: '#dbeafe',
  margin: '4px 0 0',
  fontSize: '13px',
}

const content: React.CSSProperties = {
  padding: '20px 24px',
  background: '#ffffff',
}

const lead: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 8px',
}

const text: React.CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  margin: '0 0 12px',
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
  marginTop: '12px',
}

const tableHeadRow: React.CSSProperties = {
  background: '#f3f4f6',
}

const th: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  color: '#111827',
  fontSize: '13px',
}

const td: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #e5e7eb',
  color: '#374151',
  fontSize: '13px',
}

const footer: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '20px 0 0',
}
