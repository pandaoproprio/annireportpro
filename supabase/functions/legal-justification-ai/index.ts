import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_CONFIG: Record<string, { title: string; legalBasis: string; instruction: string }> = {
  ajuste_pt: {
    title: "JUSTIFICATIVA DE AJUSTE DE PLANO DE TRABALHO",
    legalBasis:
      "Art. 57 da Lei nº 13.019/2014 (alteração de plano de trabalho); Portaria Interministerial nº 424/2016, art. 43; normas do Transferegov para alterações de instrumento.",
    instruction:
      "Justifique remanejamento de rubricas e/ou alteração de metas. Demonstre adequação técnica, manutenção do objeto e do interesse público.",
  },
  prorrogacao_vigencia: {
    title: "JUSTIFICATIVA DE PRORROGAÇÃO DE VIGÊNCIA",
    legalBasis:
      "Art. 55, §5º da Lei nº 13.019/2014 (prorrogação de ofício e por solicitação); Portaria Interministerial nº 424/2016, art. 41.",
    instruction:
      "Justifique extensão do prazo de execução. Demonstre fato superveniente, ações já realizadas, ações futuras previstas e novo prazo solicitado.",
  },
  execucao_financeira: {
    title: "JUSTIFICATIVA DE EXECUÇÃO FINANCEIRA",
    legalBasis:
      "Portaria Interministerial nº 424/2016, art. 68; arts. 63 a 72 da Lei nº 13.019/2014 (prestação de contas); Instrução Normativa TCU nº 84/2020.",
    instruction:
      "Justifique a execução financeira parcial ou final. Demonstre nexo entre despesas e metas executadas, conformidade documental e percentual executado.",
  },
  despesa_nao_prevista: {
    title: "JUSTIFICATIVA DE DESPESA NÃO PREVISTA",
    legalBasis:
      "Art. 46 da Lei nº 13.019/2014 (despesas vedadas e admitidas); art. 53 (alterações orçamentárias); Portaria Interministerial nº 424/2016.",
    instruction:
      "Justifique despesa fora do plano de trabalho original. Demonstre necessidade técnica, vínculo com o objeto e impossibilidade de previsão prévia.",
  },
  atraso_execucao: {
    title: "JUSTIFICATIVA DE ATRASO DE EXECUÇÃO",
    legalBasis:
      "Instrução Normativa TCU nº 84/2020; art. 64 da Lei nº 13.019/2014 (acompanhamento e fiscalização); Portaria Interministerial nº 424/2016.",
    instruction:
      "Explique baixa execução em período avaliado. Demonstre causas (caso fortuito, força maior, fato superveniente), ações corretivas e cronograma de recuperação.",
  },
  substituicao_fornecedor: {
    title: "JUSTIFICATIVA DE SUBSTITUIÇÃO DE FORNECEDOR",
    legalBasis:
      "Art. 32 da Lei nº 13.019/2014 (contratação por OSC com recursos do termo); Decreto nº 8.726/2016 e demais normas correlatas; princípios de economicidade e isonomia.",
    instruction:
      "Justifique troca de prestador de serviço. Demonstre motivos (descumprimento, encerramento, melhor proposta), adequação do novo fornecedor e cumprimento das exigências de seleção.",
  },
  cancelamento_meta: {
    title: "JUSTIFICATIVA DE CANCELAMENTO DE META",
    legalBasis:
      "Art. 57, §2º da Lei nº 13.019/2014 (alteração de metas); Portaria Interministerial nº 424/2016, art. 43; manutenção do objeto.",
    instruction:
      "Justifique exclusão de atividade do plano de trabalho. Demonstre fato impeditivo, manutenção do objeto e impacto nos resultados.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, project, context, parameters } = await req.json();
    const cfg = TYPE_CONFIG[type];
    if (!cfg) throw new Error(`Tipo inválido: ${type}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const systemPrompt = `Você é um consultor jurídico especialista em prestação de contas de termos de fomento e parcerias com o poder público no Brasil (Lei 13.019/2014 — MROSC, Portaria Interministerial 424/2016, normas do Transferegov, instruções do TCU, BACEN e CGU).

Você redige justificativas formais, técnicas e juridicamente fundamentadas para a OSC apresentar ao concedente.

Estilo obrigatório:
- Linguagem formal jurídico-administrativa, em terceira pessoa
- Estrutura argumentativa: contextualização → fundamentação legal → descrição do fato → nexo causal → conclusão
- Cite expressamente artigos da Lei 13.019/2014, Portaria 424/2016 e normas aplicáveis
- Nunca use linguagem vaga, genérica ou comercial
- Mantenha tom persuasivo, técnico e respeitoso
- Não use markdown (sem **, ##, listas com -). Texto corrido organizado em parágrafos numerados/separados por seções

Estrutura OBRIGATÓRIA do documento que você deve gerar (texto corrido, sem markdown):

2. DO OBJETO DA JUSTIFICATIVA
[parágrafo objetivo descrevendo o fato motivador]

3. DA FUNDAMENTAÇÃO LEGAL
[citar artigos aplicáveis com transcrição parcial quando relevante]

4. DA JUSTIFICATIVA TÉCNICA
[corpo principal — desenvolvimento argumentativo robusto baseado nos dados do projeto]

5. DO IMPACTO NAS METAS E RESULTADOS
[análise objetiva do impacto nas metas do plano de trabalho]

6. DAS PROVIDÊNCIAS ADOTADAS
[ações tomadas ou a tomar para regularização ou prevenção]

7. DA CONCLUSÃO
[síntese formal e requerimento ao concedente quando aplicável]

NÃO inclua a seção 1 (identificação das partes) — ela é montada pelo sistema com dados estruturados. Comece pela seção 2.`;

    const userPrompt = `TIPO DE JUSTIFICATIVA: ${cfg.title}
BASE LEGAL APLICÁVEL: ${cfg.legalBasis}
ORIENTAÇÃO ESPECÍFICA: ${cfg.instruction}

DADOS DO PROJETO (Termo de Fomento):
- Nome: ${project?.name || "—"}
- Número do Convênio: ${project?.fomento_number || "—"}
- Objeto: ${project?.object || "—"}
- Concedente: ${project?.funder || "—"}${project?.funder_cnpj ? ` (CNPJ ${project.funder_cnpj})` : ""}
- Convenente: ${project?.organization_name || "—"}${project?.organization_cnpj ? ` (CNPJ ${project.organization_cnpj})` : ""}
- Vigência original: ${project?.start_date || "—"} a ${project?.end_date || "—"}
- Valor global: ${project?.global_value ? `R$ ${Number(project.global_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
- Valor de repasse: ${project?.transfer_value ? `R$ ${Number(project.transfer_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
- Contrapartida: ${project?.counterpart_value ? `R$ ${Number(project.counterpart_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}

CONTEXTO ESPECÍFICO DO MÓDULO ORIGEM:
${context ? JSON.stringify(context, null, 2) : "Nenhum contexto adicional"}

PARÂMETROS INFORMADOS PELO GESTOR:
- Período de referência: ${parameters?.reference_period_start || "—"} a ${parameters?.reference_period_end || "—"}
- Rubricas envolvidas: ${parameters?.involved_budget_lines?.length ? parameters.involved_budget_lines.join("; ") : "—"}
- Valor anterior: ${parameters?.previous_value ? `R$ ${Number(parameters.previous_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
- Valor novo: ${parameters?.new_value ? `R$ ${Number(parameters.new_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}

MOTIVO INFORMADO PELO GESTOR (transformar em texto jurídico formal):
${parameters?.user_reason || "Não informado"}

${parameters?.regenerate_instruction ? `INSTRUÇÃO ADICIONAL DE REGENERAÇÃO: ${parameters.regenerate_instruction}` : ""}

Gere agora o documento completo seguindo a estrutura indicada (seções 2 a 7), em texto corrido sem markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Aguarde alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes na IA. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro na geração pela IA");
    }

    const data = await response.json();
    const body = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        title: cfg.title,
        legal_basis: cfg.legalBasis,
        body,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("legal-justification-ai error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
