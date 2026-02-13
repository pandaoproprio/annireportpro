import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
}

export const SecureDeleteDialog = ({
  open,
  onClose,
  itemId,
  itemName,
}: Props) => {
  const [confirmation, setConfirmation] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Item removido com sucesso." });
      setConfirmation("");
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setConfirmation(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmação Avançada</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Para excluir permanentemente, digite:{" "}
          <span className="font-semibold text-foreground">{itemName}</span>
        </p>

        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="Digite o nome exato"
        />

        <Button
          variant="destructive"
          disabled={!canDelete || deleteMutation.isPending}
          onClick={() => deleteMutation.mutate()}
        >
          Excluir definitivamente
        </Button>
      </DialogContent>
    </Dialog>
  );
};
