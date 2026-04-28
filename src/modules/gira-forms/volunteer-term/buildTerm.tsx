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

  // Gera o PDF JÁ com a assinatura embutida. O rodapé carrega um placeholder
  // de hash ('—') que faz parte do bytes do arquivo. O SHA-256 é calculado
  // sobre exatamente esses bytes — assim a verificação futura recomputa
  // o mesmo valor a partir do PDF salvo.
  const doc = (
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

  const blob = await pdf(doc).toBlob();
  const arr = await blob.arrayBuffer();
  const hash = await sha256Hex(arr);
  const base64 = await blobToBase64(blob);

  return { blob, base64, hash, ip, assinadoEm };
}

/** Recomputa o hash de um PDF baixado, para verificação de integridade. */
export async function recomputeHash(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  return sha256Hex(buf);
}
