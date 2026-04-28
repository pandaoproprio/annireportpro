import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { VolunteerTermPdf } from './VolunteerTermPdf';
import type { OrgLegalSettings, VolunteerData } from './types';

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchClientIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return '';
    const j = await res.json();
    return j.ip || '';
  } catch {
    return '';
  }
}

interface BuildOptions {
  org: OrgLegalSettings;
  volunteer: VolunteerData;
  metodo: 'canvas' | 'digitado';
  signatureImage?: string;
  signatureText?: string;
  termoId: string;
  cidadeEntidadeFallback: string;
}

export interface BuiltTerm {
  blob: Blob;
  base64: string;
  hash: string;
  ip: string;
  assinadoEm: string;
}

/**
 * Gera o PDF do termo, calcula o hash SHA-256 do PDF resultante
 * e retorna blob + base64 + metadados para upload e gravação.
 *
 * O hash é calculado APÓS a inclusão da assinatura — conforme regra inviolável.
 */
export async function buildSignedTerm(opts: BuildOptions): Promise<BuiltTerm> {
  const ip = await fetchClientIp();
  const assinadoEm = new Date().toISOString();

  // 1ª passada: gera o PDF SEM hash visível (placeholder no rodapé) — a partir
  // dele calculamos o SHA-256 que será o "hash de integridade" do documento.
  const docFirst = (
    <VolunteerTermPdf
      org={opts.org}
      volunteer={opts.volunteer}
      metodo={opts.metodo}
      signatureImage={opts.signatureImage}
      signatureText={opts.signatureText}
      termoId={opts.termoId}
      cidadeEntidade={opts.cidadeEntidadeFallback}
      ip={ip}
      assinadoEm={assinadoEm}
    />
  );

  const blobFirst = await pdf(docFirst).toBlob();
  const arrayFirst = await blobFirst.arrayBuffer();
  const hash = await sha256Hex(arrayFirst);

  // 2ª passada: regenera o PDF com o hash agora estampado no rodapé.
  // O hash gravado no banco é sempre o da PRIMEIRA passada (o documento
  // sem o próprio hash impresso), para que a verificação de integridade
  // futura recompute exatamente o mesmo valor.
  const docFinal = (
    <VolunteerTermPdf
      org={opts.org}
      volunteer={opts.volunteer}
      metodo={opts.metodo}
      signatureImage={opts.signatureImage}
      signatureText={opts.signatureText}
      termoId={opts.termoId}
      cidadeEntidade={opts.cidadeEntidadeFallback}
      ip={ip}
      assinadoEm={assinadoEm}
      hash={hash}
    />
  );

  const blobFinal = await pdf(docFinal).toBlob();
  const base64 = await blobToBase64(blobFinal);

  return { blob: blobFinal, base64, hash, ip, assinadoEm };
}

/** Recomputa o hash de um PDF baixado, para verificação de integridade. */
export async function recomputeHash(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return sha256Hex(buf);
}
