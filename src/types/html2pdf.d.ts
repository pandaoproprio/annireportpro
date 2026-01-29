declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      letterRendering?: boolean;
      logging?: boolean;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
    };
    pagebreak?: {
      mode?: string[];
    };
  }

  interface JsPDFInstance {
    internal: {
      getNumberOfPages(): number;
      pageSize: {
        getWidth(): number;
        getHeight(): number;
      };
    };
    setPage(pageNumber: number): void;
    setFontSize(size: number): void;
    setTextColor(r: number, g: number, b: number): void;
    text(text: string, x: number, y: number): void;
    getTextWidth(text: string): number;
    save(filename: string): void;
  }

  interface Html2PdfInstance {
    set(opt: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement): Html2PdfInstance;
    save(): Promise<void>;
    toPdf(): Html2PdfInstance;
    get(type: 'pdf'): Promise<JsPDFInstance>;
    outputPdf(type?: string): Promise<Blob | string>;
  }

  function html2pdf(): Html2PdfInstance;
  export default html2pdf;
}
