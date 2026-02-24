import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ReportType = 'report_object' | 'report_team' | 'justification';

export interface LogoConfig {
  visible: boolean;
  widthMm: number; // width in mm for PDF (default 12)
}

export interface ReportVisualConfig {
  // Header
  headerBannerUrl: string;
  headerBannerHeightMm: number; // banner height in mm (default 25)
  headerBannerFit: 'contain' | 'cover' | 'fill'; // object-fit (default contain)
  headerBannerVisible: boolean;
  headerLeftText: string;
  headerRightText: string;
  logo: string;
  logoCenter: string;
  logoSecondary: string;
  // Cover logo (dedicated)
  coverLogo: string;
  coverLogoVisible: boolean;
  // Logo controls
  logoConfig: LogoConfig;
  logoCenterConfig: LogoConfig;
  logoSecondaryConfig: LogoConfig;
  // Header layout
  headerLogoAlignment: 'left' | 'center' | 'right' | 'space-between' | 'space-around';
  headerLogoGap: number; // gap between logos in mm (default 0)
  headerTopPadding: number; // distance from top in mm (default 5)
  headerHeight: number; // total header height in mm (default 20)
  // Cover
  coverTitle: string;
  coverSubtitle: string;
  // Cover layout
  coverLogoWidthMm: number; // logo width on cover (default 40)
  coverLogoTopMm: number; // distance from top (default 30)
  coverLogoCenterV: boolean; // vertical center toggle
  coverTitleFontSize: number; // pt (default 16)
  coverTitleBold: boolean;
  coverTitleItalic: boolean;
  coverTitleAlignment: 'left' | 'center' | 'right';
  coverSubtitleFontSize: number; // pt (default 12)
  coverSubtitleAlignment: 'left' | 'center' | 'right';
  coverOrgAlignment: 'left' | 'center' | 'right';
  coverFomentoAlignment: 'left' | 'center' | 'right';
  coverSpacingLogoTitle: number; // mm (default 10)
  coverSpacingTitleSubtitle: number; // mm (default 8)
  coverSpacingSubtitleBottom: number; // mm (default 20)
  coverLineSpacing: number; // multiplier (default 1.5)
  coverHideSubtitle: boolean;
  coverHideFomento: boolean;
  coverHideOrg: boolean;
  // Footer
  footerText: string;
  footerShowAddress: boolean;
  footerShowContact: boolean;
  footerAlignment: 'left' | 'center' | 'right';
  // Institutional footer (per-line controls)
  footerInstitutionalEnabled: boolean;
  footerLine1Text: string;
  footerLine1FontSize: number; // pt (default 9)
  footerLine2Text: string;
  footerLine2FontSize: number; // pt (default 7)
  footerLine3Text: string;
  footerLine3FontSize: number; // pt (default 7)
  footerLineSpacing: number; // mm between lines (default 3)
  footerTopSpacing: number; // mm above footer (default 4)
}

const DEFAULT_CONFIG: ReportVisualConfig = {
  headerBannerUrl: '',
  headerBannerHeightMm: 25,
  headerBannerFit: 'contain',
  headerBannerVisible: true,
  headerLeftText: '',
  headerRightText: '',
  logo: '',
  logoCenter: '',
  logoSecondary: '',
  coverLogo: '',
  coverLogoVisible: true,
  logoConfig: { visible: true, widthMm: 12 },
  logoCenterConfig: { visible: true, widthMm: 12 },
  logoSecondaryConfig: { visible: true, widthMm: 12 },
  headerLogoAlignment: 'space-between',
  headerLogoGap: 0,
  headerTopPadding: 5,
  headerHeight: 20,
  coverTitle: '',
  coverSubtitle: '',
  coverLogoWidthMm: 40,
  coverLogoTopMm: 30,
  coverLogoCenterV: false,
  coverTitleFontSize: 16,
  coverTitleBold: true,
  coverTitleItalic: false,
  coverTitleAlignment: 'center',
  coverSubtitleFontSize: 12,
  coverSubtitleAlignment: 'center',
  coverOrgAlignment: 'center',
  coverFomentoAlignment: 'center',
  coverSpacingLogoTitle: 10,
  coverSpacingTitleSubtitle: 8,
  coverSpacingSubtitleBottom: 20,
  coverLineSpacing: 1.5,
  coverHideSubtitle: false,
  coverHideFomento: false,
  coverHideOrg: false,
  footerText: '',
  footerShowAddress: true,
  footerShowContact: true,
  footerAlignment: 'center',
  footerInstitutionalEnabled: true,
  footerLine1Text: '',
  footerLine1FontSize: 9,
  footerLine2Text: '',
  footerLine2FontSize: 7,
  footerLine3Text: '',
  footerLine3FontSize: 7,
  footerLineSpacing: 3,
  footerTopSpacing: 4,
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
            ...DEFAULT_CONFIG,
            ...rd,
            logoConfig: { ...DEFAULT_CONFIG.logoConfig, ...(rd.logoConfig || {}) },
            logoCenterConfig: { ...DEFAULT_CONFIG.logoCenterConfig, ...(rd.logoCenterConfig || {}) },
            logoSecondaryConfig: { ...DEFAULT_CONFIG.logoSecondaryConfig, ...(rd.logoSecondaryConfig || {}) },
            footerShowAddress: rd.footerShowAddress !== false,
            footerShowContact: rd.footerShowContact !== false,
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
    position: 'primary' | 'center' | 'secondary' | 'cover' = 'primary',
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
      const key = position === 'cover' ? 'coverLogo' : position === 'secondary' ? 'logoSecondary' : position === 'center' ? 'logoCenter' : 'logo';
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
