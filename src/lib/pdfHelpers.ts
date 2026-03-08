// ══════════════════════════════════════════════════════════════
// pdfHelpers.ts — Backward-compatible barrel re-export
// All logic has been decomposed into src/lib/pdf/ modules:
//   - constants.ts    — ABNT constants, types, sanitize
//   - pageLayout.ts   — PdfContext, page management, signature
//   - textRendering.ts — paragraphs, bullets, rich text, HTML parser
//   - imageHelpers.ts  — image loading, grids, photo layout
//   - headerFooter.ts  — header/footer config, rendering, post-pass
// ══════════════════════════════════════════════════════════════

export * from './pdf/constants';
export * from './pdf/pageLayout';
export * from './pdf/textRendering';
export * from './pdf/imageHelpers';
export * from './pdf/headerFooter';
