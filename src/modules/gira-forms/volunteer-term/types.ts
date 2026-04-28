export interface OrgLegalSettings {
  id: string;
  is_active: boolean;
  razao_social: string | null;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  email_administrativo: string | null;
  logo_url: string | null;
}

export interface VolunteerData {
  nome: string;
  cpf: string;
  email: string;
  cidadeEstado: string;
}

export interface SignedTermResult {
  termoId: string;
  publicToken: string;
  hash: string;
  pdfPath: string;
  pdfBlob: Blob;
  pdfBase64: string;
  assinadoEm: string;
}
