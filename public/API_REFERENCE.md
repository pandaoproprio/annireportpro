# API Reference — Edge Functions

Documentação das Edge Functions disponíveis no sistema.

## Autenticação

Todas as funções protegidas requerem header `Authorization: Bearer <token>` com um JWT válido do usuário autenticado.

---

## `health-check`
**GET** — Verificação de saúde dos serviços

**Autenticação:** Não requer  
**Rate Limit:** Sem limite

**Response 200:**
```json
{
  "status": "healthy | degraded | unhealthy",
  "timestamp": "2026-04-16T12:00:00.000Z",
  "total_latency_ms": 150,
  "checks": {
    "database": { "status": "healthy", "latency_ms": 45 },
    "auth": { "status": "healthy", "latency_ms": 60 },
    "storage": { "status": "healthy", "latency_ms": 40 }
  }
}
```

**Response 503:** Retornado quando algum serviço está `unhealthy`.

---

## `lgpd-data-export`
**POST** — Exporta todos os dados pessoais do titular (LGPD Art. 18)

**Autenticação:** Obrigatória  
**Rate Limit:** 5 req/hora por usuário

**Response 200:**
```json
{
  "export_date": "2026-04-16T12:00:00.000Z",
  "user_id": "uuid",
  "data": {
    "profiles": [...],
    "activities": [...],
    "auth_user": [{ "email": "...", "created_at": "..." }]
  },
  "record_counts": { "profiles": 1, "activities": 42 }
}
```

---

## `lgpd-data-deletion`
**POST** — Exclui permanentemente todos os dados do titular (LGPD Art. 18)

**Autenticação:** Obrigatória  
**Rate Limit:** 1 req/dia por usuário

**Request Body:**
```json
{ "confirmation": "EXCLUIR MEUS DADOS" }
```

**Response 200:**
```json
{
  "success": true,
  "deleted_tables": ["activities", "justification_reports", ...],
  "message": "Todos os seus dados foram excluídos conforme a LGPD."
}
```

**Response 400:** Confirmação inválida.

---

## `generate-narrative`
**POST** — Gera narrativa textual para atividade usando IA

**Autenticação:** Obrigatória  

**Request Body:**
```json
{
  "activityId": "uuid",
  "projectId": "uuid",
  "tone": "formal | informal",
  "targetReports": ["report_object", "report_team"]
}
```

---

## `generate-dashboard-summary`
**POST** — Gera resumo executivo do dashboard com IA

**Autenticação:** Obrigatória

**Request Body:**
```json
{
  "projectId": "uuid",
  "metrics": { ... }
}
```

---

## `analyze-risks`
**POST** — Análise de riscos do projeto com IA

**Autenticação:** Obrigatória

**Request Body:**
```json
{
  "projectId": "uuid",
  "risks": [...]
}
```

---

## `classify-activity`
**POST** — Classificação automática de tipo de atividade via IA

**Autenticação:** Obrigatória

**Request Body:**
```json
{
  "description": "string",
  "location": "string"
}
```

---

## `ocr-attendance`
**POST** — OCR de lista de presença via imagem

**Autenticação:** Obrigatória

**Request Body:**
```json
{
  "imageUrl": "https://..."
}
```

---

## `send-workflow-email`
**POST** — Envia notificação de transição de workflow

**Autenticação:** Obrigatória (admin/coordenador)

---

## `export-form-pdf`
**POST** — Exporta formulário e respostas em PDF

**Autenticação:** Obrigatória

---

## `send-event-confirmation`
**POST** — Envia confirmação de inscrição em evento

**Autenticação:** Não requer (público)

---

## Códigos de Erro Comuns

| Código | Significado |
|--------|-------------|
| 401 | Token ausente ou inválido |
| 400 | Parâmetros inválidos |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |
| 503 | Serviço indisponível |
