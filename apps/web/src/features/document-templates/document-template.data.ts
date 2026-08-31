import type { DocumentTemplate } from './document-template.types';

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'adr',
    name: 'Architecture Decision Record (ADR)',
    description:
      'Document significant technical or architectural choices, context, considered alternatives, and consequences.',
    titlePrefix: 'ADR-001: [Decision Title]',
    defaultTags: ['adr', 'decision', 'architecture'],
    sections: [
      'Status',
      'Context',
      'Problem Statement',
      'Considered Options',
      'Decision',
      'Consequences',
      'References',
    ],
    scaffoldContent: `# ADR: [Decision Title]

## Status
- [ ] Proposed
- [ ] Accepted
- [ ] Deprecated
- [ ] Superseded

## Context
Describe the technical, business, or operational context and drivers that lead to this decision.

## Problem Statement
What specific architectural challenge or problem needs to be solved?

## Considered Options
1. **Option 1**: [Short description & pros/cons]
2. **Option 2**: [Short description & pros/cons]

## Decision
Which option was chosen and why?

## Consequences
- **Positive**: [Benefits & positive impacts]
- **Negative**: [Trade-offs, risks, or technical debt introduced]

## References
- Related documents, technical links, or external specifications.
`,
  },
  {
    id: 'tech-spec',
    name: 'Technical Specification',
    description:
      'Detail the design, architecture, data models, APIs, and security strategy for a feature or component.',
    titlePrefix: 'Tech Spec: [Feature / Component Name]',
    defaultTags: ['spec', 'architecture', 'design'],
    sections: [
      'Overview',
      'Goals & Non-Goals',
      'Requirements',
      'Technical Design',
      'API & Data Model',
      'Security & Privacy',
      'Verification & Rollout Plan',
    ],
    scaffoldContent: `# Technical Specification: [Feature / Component Name]

## Overview
High-level summary of the feature, system change, or component design.

## Goals & Non-Goals
### Goals
- Goal 1
- Goal 2

### Non-Goals
- Explicitly out of scope item 1

## Requirements
- **Functional**: System behavior requirements
- **Non-Functional**: Performance, scalability, latency, availability

## Technical Design
- High-level architecture & sequence flow
- Detailed component interactions

## API & Data Model
- REST / RPC endpoints and data payloads
- Mongoose / SQL schema changes and index strategies

## Security & Privacy Considerations
- Authentication, authorization, data encryption, and audit requirements

## Verification & Rollout Plan
- Automated testing strategy (unit, integration, e2e)
- Deployment sequence and feature flags
`,
  },
  {
    id: 'runbook',
    name: 'Troubleshooting / Runbook',
    description:
      'Operational guide for diagnosing, mitigating, and verifying resolutions for service incidents or alerts.',
    titlePrefix: 'Runbook: [Service / Incident Name]',
    defaultTags: ['runbook', 'ops', 'troubleshooting'],
    sections: [
      'Purpose & Scope',
      'Symptoms & Triggering Alerts',
      'Preconditions & Access Requirements',
      'Step-by-Step Diagnosis',
      'Mitigation & Remediation',
      'Verification',
      'Rollback Procedures',
    ],
    scaffoldContent: `# Runbook: [Service / Incident Name]

## Purpose & Scope
Operational guide for handling alerts, incidents, or degradation in [Service Name].

## Symptoms & Triggering Alerts
- High error rate / 5xx responses
- High latency or queue depth alerts

## Preconditions & Access Requirements
- Required system access, environment variables, or administrative credentials needed before starting.

## Step-by-Step Diagnosis
1. Check service health endpoint (\`/health\`)
2. Inspect log aggregators and error metrics

## Mitigation & Remediation
- Immediate mitigation steps (restart worker, clear cache, scale instances)
- Permanent fix guidelines

## Verification
- How to confirm the system has returned to normal operation

## Rollback Procedures
- Safety measures and rollback commands if remediation fails
`,
  },
];
