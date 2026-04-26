import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileSignature, Upload, Download, ShieldCheck, Loader2, FileText, Hash, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useProjectSignedDocuments,
  CATEGORY_LABELS,
  type SignedDocCategory,
  type SignedDocument,
} from '@/hooks/useProjectSignedDocuments';

interface Props {
  projectId: string | undefined;
  canUpload?: boolean;
}

const CATEGORY_ORDER: SignedDocCategory[] = [
  'termo_fomento',
  'plano_trabalho',
  'declaracao_justificativa',
  'contrato_rh',
  'contrato_servico',
  'contrato_fornecedor',
  'aditivo',
  'outro',
];

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function SignedDocumentsSection({ projectId, canUpload = true }: Props) {
  const { documents, loading, refresh, uploadDocument, downloadDocument } = useProjectSignedDocuments(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<SignedDocCategory>>(
    new Set(['termo_fomento', 'declaracao_justificativa'])
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length || !projectId) return;
    setUploading(true);
    setProgress({ current: 0, total: files.length });
    let ok = 0, dup = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const r = await uploadDocument(files[i]);
        if (r.status === 'duplicate') dup++; else ok++;
      } catch (e) {
        console.error(e);
        fail++;
      }
      setProgress({ current: i + 1, total: files.length });
    }
    setUploading(false);
    setProgress(null);
    await refresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(
      `${ok} enviado(s)${dup ? `, ${dup} duplicado(s)` : ''}${fail ? `, ${fail} falha(s)` : ''}.`
    );
  };

  const toggleCategory = (cat: SignedDocCategory) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const grouped = documents.reduce<Record<string, SignedDocument[]>>((acc, d) => {
    (acc[d.category] ||= []).push(d);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Documentos Assinados
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Anexos imutáveis (Termo, Plano de Trabalho, contratos e justificativas) com hash SHA-256 de integridade.
          </p>
        </div>
        {canUpload && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !projectId}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
              {uploading && progress ? `Enviando ${progress.current}/${progress.total}` : 'Enviar PDF(s) assinado(s)'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando documentos…
          </div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
            Nenhum documento assinado anexado a este projeto. Envie os PDFs assinados (gov.br ou outros).
          </div>
        ) : (
          CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => {
            const docs = grouped[cat];
            const open = openCategories.has(cat);
            return (
              <div key={cat} className="border rounded-md">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 rounded-t-md"
                  onClick={() => toggleCategory(cat)}
                >
                  <span className="flex items-center gap-2 font-medium text-sm">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {CATEGORY_LABELS[cat]}
                    <Badge variant="secondary">{docs.length}</Badge>
                  </span>
                </button>
                {open && (
                  <ul className="divide-y">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-start gap-3 px-3 py-2">
                        <FileText className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{d.display_name}</div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                            <span>{formatBytes(d.file_size_bytes)}</span>
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {d.sha256_hash.slice(0, 12)}…
                            </span>
                            {d.signature_provider && (
                              <Badge variant="outline" className="h-5 gap-1 px-1.5">
                                <ShieldCheck className="h-3 w-3" /> {d.signature_provider}
                              </Badge>
                            )}
                            {d.legal_justification_id && (
                              <Badge variant="outline" className="h-5">vinculado a justificativa</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(d).catch((e) => toast.error(e.message))}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
