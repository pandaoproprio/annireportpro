/**
 * CNPJ lookup using BrasilAPI (free, no API key required)
 * https://brasilapi.com.br/docs#tag/CNPJ
 */

export interface CnpjData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  descricao_situacao_cadastral: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
  ddd_telefone_2: string;
  email: string | null;
  qsa: Array<{
    nome_socio: string;
    qualificacao_socio: string;
  }>;
}

export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos');
  }

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('CNPJ não encontrado na base da Receita Federal');
    }
    throw new Error('Erro ao consultar CNPJ. Tente novamente.');
  }

  return response.json();
}
