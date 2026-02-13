import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/auditLog";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2 } from "lucide-react";

type EntityType = "projects" | "activities" | "team_reports";

interface Props {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  entityType?: EntityType;
  onSuccess?: () => void;
}

export const SecureDeleteDialog = ({
  open,
  onClose,
  itemId,
  itemName,
  entityType = "projects",
  onSuccess,
}: Props) => {
  const [confirmation, setConfirmation] = useState("");
  const { toast } = useToast();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      // Soft delete — set deleted_at timestamp
      const { error } = await supabase
        .from(entityType)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", itemId);

      if (error) throw error;

      // Audit log
      await logAuditEvent({
        userId: user.id,
        action: "DELETE",
        entityType,
        entityId: itemId,
        entityName: itemName,
        metadata: { role: role as string, softDelete: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType] });
      toast({ title: "Item movido para a lixeira com sucesso." });
      setConfirmation("");
      onSuccess?.();
      onClose();
    },
    onError: (error: any) =>
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      }),
  });

  const canDelete = confirmation === itemName;

  const entityLabel: Record<EntityType, string> = {
    projects: "projeto",
    activities: "atividade",
    team_reports: "relatório",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setConfirmation("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Exclusão Segura</DialogTitle>
              <DialogDescription>
                Esta ação moverá o {entityLabel[entityType]} para a lixeira.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm text-muted-foreground">
              Para confirmar, digite o nome exato:
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">
              {itemName}
            </p>
          </div>

          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Digite o nome exato para confirmar"
            className={
              confirmation.length > 0 && !canDelete
                ? "border-destructive"
                : canDelete
                ? "border-green-500"
                : ""
            }
          />

          {!isAdmin && (
            <p className="text-xs text-muted-foreground">
              Apenas administradores podem restaurar itens da lixeira.
            </p>
          )}

          <Button
            variant="destructive"
            className="w-full"
            disabled={!canDelete || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending
              ? "Excluindo..."
              : "Mover para lixeira"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
