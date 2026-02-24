import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ReportType = 'report_object' | 'report_team' | 'justification';

export interface ReportVisualConfig {
  // Header
  headerBannerUrl: string;
  headerLeftText: string;
  headerRightText: string;
  logo: string;
  logoCenter: string;
  logoSecondary: string;
  // Cover
  coverTitle: string;
  coverSubtitle: string;
  // Footer
  footerText: string;
  footerShowAddress: boolean;
  footerShowContact: boolean;
  footerAlignment: 'left' | 'center' | 'right';
}

const DEFAULT_CONFIG: ReportVisualConfig = {
  headerBannerUrl: '',
  headerLeftText: '',
  headerRightText: '',
  logo: '',
  logoCenter: '',
  logoSecondary: '',
  coverTitle: '',
  coverSubtitle: '',
  footerText: '',
  footerShowAddress: true,
  footerShowContact: true,
  footerAlignment: 'center',
};

export const useReportVisualConfig = (projectId: string | undefined, reportType: ReportType) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ReportVisualConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [rowId, setRowId] = useState<string | null>(null);

  // Load config from project_report_templates
  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await (supabase
          .from('project_report_templates')
          .select('id, report_data') as any)
          .eq('project_id', projectId)
          .eq('report_type', reportType)
          .maybeSingle();

        if (error) {
          console.error('Error loading visual config:', error);
        } else if (data) {
          setRowId(data.id);
          const rd = (data.report_data || {}) as Record<string, any>;
          setConfig({
            headerBannerUrl: rd.headerBannerUrl || '',
            headerLeftText: rd.headerLeftText || '',
            headerRightText: rd.headerRightText || '',
            logo: rd.logo || '',
            logoCenter: rd.logoCenter || '',
            logoSecondary: rd.logoSecondary || '',
            coverTitle: rd.coverTitle || '',
            coverSubtitle: rd.coverSubtitle || '',
            footerText: rd.footerText || '',
            footerShowAddress: rd.footerShowAddress !== false,
            footerShowContact: rd.footerShowContact !== false,
            footerAlignment: rd.footerAlignment || 'center',
          });
        }
      } catch (e) {
        console.error('Error loading visual config:', e);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [projectId, reportType]);

  const updateConfig = useCallback((partial: Partial<ReportVisualConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  const saveConfig = useCallback(async (showToast = true) => {
    if (!projectId || !user?.id) return;

    const reportData = { ...config };

    try {
      if (rowId) {
        const { error } = await supabase
          .from('project_report_templates')
          .update({ report_data: reportData as any, updated_at: new Date().toISOString() })
          .eq('id', rowId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('project_report_templates')
          .insert({
            project_id: projectId,
            report_type: reportType as any,
            report_data: reportData as any,
            created_by: user.id,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        if (data) setRowId(data.id);
      }
      if (showToast) toast.success('Configuração visual salva!');
    } catch (e) {
      console.error('Error saving visual config:', e);
      toast.error('Erro ao salvar configuração visual');
    }
  }, [projectId, reportType, config, rowId, user?.id]);

  // Logo upload helper
  const handleLogoUpload = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    position: 'primary' | 'center' | 'secondary' = 'primary',
  ) => {
    if (!e.target.files?.[0] || !projectId) return;
    const file = e.target.files[0];
    try {
      const photoId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `reports/${projectId}/logos/${reportType}_${position}_${photoId}.${fileExt}`;
      const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error('Erro ao enviar logo'); return; }
      const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
      const key = position === 'secondary' ? 'logoSecondary' : position === 'center' ? 'logoCenter' : 'logo';
      updateConfig({ [key]: urlData.publicUrl });
      toast.success('Logo enviado com sucesso');
    } catch { toast.error('Erro ao processar logo'); }
  }, [projectId, reportType, updateConfig]);

  const handleBannerUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !projectId) return;
    const file = e.target.files[0];
    try {
      const photoId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `reports/${projectId}/logos/${reportType}_banner_${photoId}.${fileExt}`;
      const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error('Erro ao enviar banner'); return; }
      const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
      updateConfig({ headerBannerUrl: urlData.publicUrl });
      toast.success('Banner enviado com sucesso');
    } catch { toast.error('Erro ao processar banner'); }
  }, [projectId, reportType, updateConfig]);

  return {
    config,
    updateConfig,
    saveConfig,
    isLoading,
    handleLogoUpload,
    handleBannerUpload,
  };
};
