import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { item, type, projectContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = `Você é um consultor especialista em prestação de contas de projetos sociais financiados por editais públicos do governo federal brasileiro (Ministério da Cultura, Ministério dos Direitos Humanos, etc.).

Sua tarefa é gerar justificativas DETALHADAS, FUNDAMENTADAS e CONVINCENTES para ajustes orçamentários em Planos de Trabalho (PT).

Regras:
- A justificativa deve ser formal, técnica e persuasiva
- Nunca use justificativas genéricas como "Precisamos incluir este serviço pois nos dará maior apoio"
- Demonstre necessidade real, impacto nas metas do projeto e benefícios para o público-alvo
- Cite a conexão com os objetivos do projeto
- Para alterações de valor, mencione a adequação ao mercado e a necessidade da mudança
- Para exclusões, explique por que o item não é mais necessário e como as atividades serão mantidas sem ele
- Para inclusões, demonstre a lacuna que o item preencherá e sua importância para o êxito do projeto
- Mantenha um tom institucional e convincente
- Se o item foi parcialmente executado, reconheça o valor já gasto e justifique a alteração considerando este fato`;

    let userPrompt = '';

    if (type === 'item_justification') {
      userPrompt = `Gere uma justificativa detalhada para o seguinte ajuste orçamentário:

Item: ${item.specification}
Descrição: ${item.description}
Proposta: ${item.proposal?.toUpperCase()}
Valor original: R$ ${Number(item.original_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
${item.executed_amount > 0 ? `Valor já executado: R$ ${Number(item.executed_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
${item.proposal === 'alterar' ? `Novo valor proposto: R$ ${Number(item.new_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
${item.is_new_item ? 'Este é um ITEM NOVO a ser incluído no orçamento.' : ''}

Contexto do projeto: ${projectContext || 'Projeto social comunitário'}

Gere apenas a justificativa, sem títulos ou cabeçalhos.`;
    } else if (type === 'ra_justification') {
      userPrompt = `Gere uma justificativa detalhada e um cronograma para uso dos recursos do Saldo de Rendimento de Aplicação (RA) no valor de R$ ${Number(item.ra_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.

Itens que utilizarão recursos de RA:
${item.ra_items || 'Itens novos incluídos no ajuste'}

Contexto do projeto: ${projectContext || 'Projeto social comunitário'}

Gere a justificativa e um cronograma detalhado de atividades, demonstrando a necessidade do uso desses recursos e como serão empregados para o bom andamento do projeto.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ justification: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
