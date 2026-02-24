import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DocumentModel,
  DocumentBlock,
  DocumentPage,
  HeaderFooterConfig,
  LayoutConfig,
  createDefaultDocument,
} from '@/types/document';

export const useDocumentModel = (documentId?: string) => {
  const queryClient = useQueryClient();
  const [model, setModel] = useState<DocumentModel>(createDefaultDocument());
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch document ──
  const { data: documentRow, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });

  // Sync fetched data into state
  useEffect(() => {
    if (documentRow?.content) {
      setModel(documentRow.content as unknown as DocumentModel);
      setIsDirty(false);
    }
  }, [documentRow]);

  // ── Auto-save mutation ──
  const saveMutation = useMutation({
    mutationFn: async (doc: DocumentModel) => {
      if (!documentId) return;
      const { error } = await supabase
        .from('documents')
        .update({ content: JSON.parse(JSON.stringify(doc)) })
        .eq('id', documentId);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['document', documentId] });
    },
    onError: () => toast.error('Erro ao salvar documento'),
  });

  // Debounced auto-save
  const triggerSave = useCallback((newModel: DocumentModel) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate(newModel);
    }, 1500);
  }, [saveMutation]);

  const updateModel = useCallback((updater: (prev: DocumentModel) => DocumentModel) => {
    setModel(prev => {
      const next = updater(prev);
      setIsDirty(true);
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  // ── Block operations ──
  const addBlock = useCallback((block: DocumentBlock, pageIndex?: number) => {
    const pi = pageIndex ?? activePageIndex;
    updateModel(prev => {
      const pages = [...prev.pages];
      const page = { ...pages[pi], blocks: [...pages[pi].blocks, block] };
      pages[pi] = page;
      return { ...prev, pages };
    });
    setActiveBlockId(block.id);
  }, [activePageIndex, updateModel]);

  const updateBlock = useCallback((blockId: string, updates: Partial<DocumentBlock>) => {
    updateModel(prev => {
      const pages = prev.pages.map(page => ({
        ...page,
        blocks: page.blocks.map(b =>
          b.id === blockId ? { ...b, ...updates } as DocumentBlock : b
        ),
      }));
      return { ...prev, pages };
    });
  }, [updateModel]);

  const removeBlock = useCallback((blockId: string) => {
    updateModel(prev => ({
      ...prev,
      pages: prev.pages.map(page => ({
        ...page,
        blocks: page.blocks.filter(b => b.id !== blockId),
      })),
    }));
    if (activeBlockId === blockId) setActiveBlockId(null);
  }, [updateModel, activeBlockId]);

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    updateModel(prev => {
      const pages = prev.pages.map(page => {
        const idx = page.blocks.findIndex(b => b.id === blockId);
        if (idx === -1) return page;
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= page.blocks.length) return page;
        const blocks = [...page.blocks];
        [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
        return { ...page, blocks };
      });
      return { ...prev, pages };
    });
  }, [updateModel]);

  // ── Page operations ──
  const addPage = useCallback(() => {
    updateModel(prev => ({
      ...prev,
      pages: [...prev.pages, {
        id: crypto.randomUUID(),
        header: null,
        footer: null,
        blocks: [],
      }],
    }));
  }, [updateModel]);

  const removePage = useCallback((pageIndex: number) => {
    if (model.pages.length <= 1) return;
    updateModel(prev => ({
      ...prev,
      pages: prev.pages.filter((_, i) => i !== pageIndex),
    }));
    if (activePageIndex >= model.pages.length - 1) {
      setActivePageIndex(Math.max(0, activePageIndex - 1));
    }
  }, [updateModel, model.pages.length, activePageIndex]);

  // ── Layout ──
  const updateLayout = useCallback((updates: Partial<LayoutConfig>) => {
    updateModel(prev => ({
      ...prev,
      layout: { ...prev.layout, ...updates },
    }));
  }, [updateModel]);

  // ── Header / Footer ──
  const updateGlobalHeader = useCallback((updates: Partial<HeaderFooterConfig>) => {
    updateModel(prev => ({
      ...prev,
      globalHeader: { ...prev.globalHeader, ...updates },
    }));
  }, [updateModel]);

  const updateGlobalFooter = useCallback((updates: Partial<HeaderFooterConfig>) => {
    updateModel(prev => ({
      ...prev,
      globalFooter: { ...prev.globalFooter, ...updates },
    }));
  }, [updateModel]);

  // ── Active block helper ──
  const activeBlock = model.pages
    .flatMap(p => p.blocks)
    .find(b => b.id === activeBlockId) ?? null;

  const activePage = model.pages[activePageIndex] ?? model.pages[0];

  return {
    model,
    isLoading,
    isDirty,
    isSaving: saveMutation.isPending,
    activePageIndex,
    setActivePageIndex,
    activeBlockId,
    setActiveBlockId,
    activeBlock,
    activePage,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    addPage,
    removePage,
    updateLayout,
    updateGlobalHeader,
    updateGlobalFooter,
    updateModel,
    title: documentRow?.title ?? 'Documento sem título',
  };
};
