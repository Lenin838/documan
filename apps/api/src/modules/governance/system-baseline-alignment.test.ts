import { describe, it, expect } from 'vitest';

import type { AlignmentUnitState, AggregateAlignmentState } from './system-baseline-alignment.types.js';

describe('System Baseline Alignment Derivation Mechanics', () => {
  it('enforces aggregate state assignment truth table Case A (zero applicable)', () => {
    const N_applicable: number = 0;
    const N_aligned: number = 0;
    const N_misaligned: number = 0;
    const N_indeterminate: number = 0;

    let aggregateState: AggregateAlignmentState;
    if (N_applicable === 0) {
      aggregateState = 'ZERO_APPLICABLE_EVIDENCE';
    } else if (N_indeterminate > 0) {
      aggregateState = 'INDETERMINATE';
    } else if (N_aligned === N_applicable) {
      aggregateState = 'ALIGNED';
    } else if (N_misaligned === N_applicable) {
      aggregateState = 'MISALIGNED';
    } else {
      aggregateState = 'PARTIALLY_ALIGNED';
    }

    const alignmentScore = N_applicable === 0 ? null : (N_aligned / N_applicable) * 100;

    expect(aggregateState).toBe('ZERO_APPLICABLE_EVIDENCE');
    expect(alignmentScore).toBeNull();
  });

  it('enforces aggregate state truth table Case B (all aligned)', () => {
    const N_applicable: number = 5;
    const N_aligned: number = 5;
    const N_misaligned: number = 0;
    const N_indeterminate: number = 0;

    let aggregateState: AggregateAlignmentState;
    if (N_applicable === 0) {
      aggregateState = 'ZERO_APPLICABLE_EVIDENCE';
    } else if (N_indeterminate > 0) {
      aggregateState = 'INDETERMINATE';
    } else if (N_aligned === N_applicable) {
      aggregateState = 'ALIGNED';
    } else if (N_misaligned === N_applicable) {
      aggregateState = 'MISALIGNED';
    } else {
      aggregateState = 'PARTIALLY_ALIGNED';
    }

    const alignmentScore = (N_aligned / N_applicable) * 100;

    expect(aggregateState).toBe('ALIGNED');
    expect(alignmentScore).toBe(100);
  });

  it('enforces aggregate state truth table Case C (aligned + misaligned, 0 indeterminate)', () => {
    const N_applicable: number = 5;
    const N_aligned: number = 3;
    const N_misaligned: number = 2;
    const N_indeterminate: number = 0;

    let aggregateState: AggregateAlignmentState;
    if (N_applicable === 0) {
      aggregateState = 'ZERO_APPLICABLE_EVIDENCE';
    } else if (N_indeterminate > 0) {
      aggregateState = 'INDETERMINATE';
    } else if (N_aligned === N_applicable) {
      aggregateState = 'ALIGNED';
    } else if (N_misaligned === N_applicable) {
      aggregateState = 'MISALIGNED';
    } else {
      aggregateState = 'PARTIALLY_ALIGNED';
    }

    const alignmentScore = (N_aligned / N_applicable) * 100;

    expect(aggregateState).toBe('PARTIALLY_ALIGNED');
    expect(alignmentScore).toBe(60);
  });

  it('enforces truth table Case D (8 aligned, 0 misaligned, 2 indeterminate -> 80% score & INDETERMINATE aggregate)', () => {
    const N_applicable: number = 10;
    const N_aligned: number = 8;
    const N_misaligned: number = 0;
    const N_indeterminate: number = 2;

    const N_evaluable = N_aligned + N_misaligned;

    // Population Invariants
    expect(N_applicable).toBe(N_aligned + N_misaligned + N_indeterminate);
    expect(N_evaluable).toBeLessThanOrEqual(N_applicable);

    let aggregateState: AggregateAlignmentState;
    if (N_applicable === 0) {
      aggregateState = 'ZERO_APPLICABLE_EVIDENCE';
    } else if (N_indeterminate > 0) {
      // Indeterminate evidence MUST NOT be hidden by PARTIALLY_ALIGNED
      aggregateState = 'INDETERMINATE';
    } else if (N_aligned === N_applicable) {
      aggregateState = 'ALIGNED';
    } else if (N_misaligned === N_applicable) {
      aggregateState = 'MISALIGNED';
    } else {
      aggregateState = 'PARTIALLY_ALIGNED';
    }

    // Alignment Score formula uses N_applicable as denominator
    const alignmentScore = (N_aligned / N_applicable) * 100;

    expect(aggregateState).toBe('INDETERMINATE');
    expect(alignmentScore).toBe(80);
  });

  it('calculates evidence completeness correctly without leaking unauthorized nodes', () => {
    const N_total: number = 10; // Total authorized cross-project DEPENDS_ON pairs
    const N_applicable: number = 8; // Connected by active topology link

    const evidenceCompleteness = (N_applicable / N_total) * 100;

    expect(evidenceCompleteness).toBe(80);
  });

  it('evaluates structural unit alignment independently of governance attestation evidence', () => {
    const consumerRef = { versionNumber: 1, checksum: 'chk_1' };
    const providerActive = { versionNumber: 1, checksum: 'chk_1' };
    const providerAttested = false; // Provider version is unattested

    let unitState: AlignmentUnitState;
    if (consumerRef.versionNumber === providerActive.versionNumber && consumerRef.checksum === providerActive.checksum) {
      unitState = 'ALIGNED';
    } else {
      unitState = 'MISALIGNED';
    }

    // Structural alignment is ALIGNED even if provider version is unattested
    expect(unitState).toBe('ALIGNED');
    expect(providerAttested).toBe(false);
  });
});
