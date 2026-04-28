import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Download, ShieldCheck, ShieldX, Search, Copy, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TermoRow {
  id: string;
  voluntario_nome: string;
  voluntario_cpf: string | null;
  voluntario_email: string | null;
  voluntario_cidade_estado: string | null;
  hash_sha256: string;
  metodo_assinatura: string;
  ip_address: string | null;
  assinado_em: string;
  status: string;
  revogado_em: string | null;
  revogado_motivo: string | null;
  pdf_path: string | null;
  public_token: string;
  form_id: string | null;
}

async function recomputeHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function VolunteerTermsAdminPageInner() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TermoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "assinado" | "revogado">("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, "ok" | "fail">>({});
  const [revokeTarget, setRevokeTarget] = useState<TermoRow | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("voluntario_termos")
      .select("*")
      .order("assinado_em", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Erro ao carregar termos", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as TermoRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.voluntario_nome.toLowerCase().includes(q) ||
      (r.voluntario_email ?? "").toLowerCase().includes(q) ||
      (r.voluntario_cpf ?? "").toLowerCase().includes(q) ||
      r.hash_sha256.toLowerCase().includes(q)
    );
  });

  const handleDownload = async (r: TermoRow) => {
    if (!r.pdf_path) {
      toast({ title: "PDF indisponível", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.storage
      .from("voluntario-termos")
      .createSignedUrl(r.pdf_path, 60);
    if (error || !data) {
      toast({ title: "Erro ao gerar link", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleVerify = async (r: TermoRow) => {
    if (!r.pdf_path) return;
    setVerifyingId(r.id);
    try {
      const { data, error } = await supabase.storage
        .from("voluntario-termos")
        .createSignedUrl(r.pdf_path, 60);
      if (error || !data) throw error;
      const res = await fetch(data.signedUrl);
      const blob = await res.blob();
      const recomputed = await recomputeHash(blob);
      const ok = recomputed === r.hash_sha256;
      setVerifyResult((prev) => ({ ...prev, [r.id]: ok ? "ok" : "fail" }));
      toast({
        title: ok ? "Integridade confirmada" : "Falha na integridade",
        description: ok
          ? "O hash do PDF corresponde ao registro."
          : "O hash recalculado NÃO bate com o registrado. Documento pode ter sido alterado.",
        variant: ok ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Erro na verificação", description: e?.message, variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    setRevoking(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("voluntario_termos")
      .update({
        status: "revogado",
        revogado_em: new Date().toISOString(),
        revogado_motivo: revokeReason.trim(),
        revogado_por: userData.user?.id ?? null,
      })
      .eq("id", revokeTarget.id);
    setRevoking(false);
    if (error) {
      toast({ title: "Erro ao revogar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Termo revogado" });
    setRevokeTarget(null);
    setRevokeReason("");
    load();
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({ title: "Hash copiado" });
  };

  const openVerifyPage = (token: string) => {
    window.open(`/voluntario/termo/${token}`, "_blank");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Termos de Voluntariado</h1>
        <p className="text-muted-foreground mt-1">
          Gestão, verificação de integridade e revogação dos termos assinados digitalmente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, CPF ou hash..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "assinado", "revogado"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "Todos" : s === "assinado" ? "Assinados" : "Revogados"}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {filtered.length} termo{filtered.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voluntário</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Assinado em</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum termo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => {
                    const vr = verifyResult[r.id];
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.voluntario_nome}</div>
                          <div className="text-xs text-muted-foreground">{r.voluntario_email}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.voluntario_cpf ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(r.assinado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {r.metodo_assinatura === "canvas" ? "Manual" : "Digitada"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => copyHash(r.hash_sha256)}
                            className="font-mono text-xs hover:underline flex items-center gap-1"
                            title="Copiar hash"
                          >
                            {r.hash_sha256.slice(0, 12)}...
                            <Copy className="h-3 w-3" />
                          </button>
                        </TableCell>
                        <TableCell>
                          {r.status === "revogado" ? (
                            <Badge variant="destructive">Revogado</Badge>
                          ) : vr === "ok" ? (
                            <Badge className="bg-green-600 hover:bg-green-700">Íntegro</Badge>
                          ) : vr === "fail" ? (
                            <Badge variant="destructive">Adulterado</Badge>
                          ) : (
                            <Badge variant="outline">Assinado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleVerify(r)}
                              disabled={verifyingId === r.id || !r.pdf_path}
                              title="Verificar integridade"
                            >
                              {verifyingId === r.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDownload(r)}
                              disabled={!r.pdf_path}
                              title="Baixar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openVerifyPage(r.public_token)}
                              title="Página pública de verificação"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {r.status === "assinado" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setRevokeTarget(r)}
                                title="Revogar termo"
                              >
                                <ShieldX className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar termo de voluntariado</DialogTitle>
            <DialogDescription>
              Esta ação marca o termo como revogado. O registro permanece auditável, mas o termo
              deixa de ter validade. Informe o motivo para fins de registro.
            </DialogDescription>
          </DialogHeader>
          {revokeTarget && (
            <div className="space-y-3">
              <div className="text-sm bg-muted p-3 rounded">
                <div><strong>Voluntário:</strong> {revokeTarget.voluntario_nome}</div>
                <div><strong>Assinado em:</strong> {format(new Date(revokeTarget.assinado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
              </div>
              <Textarea
                placeholder="Motivo da revogação (obrigatório)..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={4}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={!revokeReason.trim() || revoking}
            >
              {revoking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Revogar termo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function VolunteerTermsAdminPage() {
  return (
    <PermissionGuard permission="forms_view">
      <VolunteerTermsAdminPageInner />
    </PermissionGuard>
  );
}
