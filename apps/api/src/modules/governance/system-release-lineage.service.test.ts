import { describe, it, expect } from 'vitest';
import {
  compareReleaseCertificates,
  getCertificateLineageGraph,
} from './system-release-lineage.service.js';

describe('system-release-lineage.service', () => {
  it('exports compareReleaseCertificates and getCertificateLineageGraph methods', () => {
    expect(typeof compareReleaseCertificates).toBe('function');
    expect(typeof getCertificateLineageGraph).toBe('function');
  });
});
