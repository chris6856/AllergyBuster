import {ProductRecord, SOURCE_LABELS} from '../types/product';
import {Finding, InsightSection} from './types';

function tagLabel(tag: string): string {
  const t = tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * PFAS & Packaging. A barcode or ingredient list can't establish whether a
 * product or its packaging contains PFAS, so the PFAS finding is always
 * "insufficient information" until verified packaging data exists (2.0, M8).
 */
export function analyzePackaging(p: ProductRecord): InsightSection {
  const findings: Finding[] = [];
  if (p.packaging.length) {
    findings.push({
      id: 'packaging-materials',
      level: 'info',
      title: `Packaging: ${p.packaging.map(tagLabel).join(', ')}`,
      source: {name: SOURCE_LABELS[p.source]},
    });
  }
  findings.push({
    id: 'packaging-pfas',
    level: 'info',
    title: 'PFAS: insufficient information',
    detail: p.packaging.length
      ? "Packaging materials alone can't show whether PFAS are present or absent."
      : "Packaging information is unavailable. Ingredient data alone can't show whether PFAS are present or absent.",
  });
  return {
    id: 'packaging',
    title: 'PFAS & Packaging',
    summary: p.packaging.length ? 'Packaging listed · PFAS not determinable' : 'Packaging information unavailable',
    status: 'insufficient_information',
    level: 'info',
    findings,
  };
}
