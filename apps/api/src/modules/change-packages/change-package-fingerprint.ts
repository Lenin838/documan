/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import { Types } from 'mongoose';
import { DocumentChangePackage } from './change-package.model.js';
import { DocumentChangeProposal } from '../change-proposals/change-proposal.model.js';
import { computeSimulationStateFingerprint } from '../change-proposals/change-proposal-fingerprint.js';
import { Document } from '../documents/document.model.js';
import { DocumentationBaseline } from '../governance/documentation-baseline.model.js';

export interface PackageStalenessResult {
  isStale: boolean;
  packageFingerprint: string;
  proposalStaleness: Array<{
    proposalId: string;
    proposalNumber: string;
    targetDocumentId: string;
    isStale: boolean;
    reason?: string;
  }>;
}

export async function computePackageStateFingerprint(
  packageId: string | Types.ObjectId,
): Promise<{ fingerprint: string; stalenessResult: PackageStalenessResult }> {
  const pkgObjId = new Types.ObjectId(packageId.toString());
  const pkg = await DocumentChangePackage.findById(pkgObjId).populate('proposals');

  if (!pkg) {
    return {
      fingerprint: 'INVALID_PACKAGE',
      stalenessResult: {
        isStale: true,
        packageFingerprint: 'INVALID_PACKAGE',
        proposalStaleness: [],
      },
    };
  }

  // 1. Package tuple
  const pkgTuple = `PKG:${pkg._id.toString()}:${pkg.title}`;

  // 2. Fetch and evaluate constituent proposals
  const proposalIds = pkg.proposals.map((p: any) => p._id || p);
  const proposals = await DocumentChangeProposal.find({ _id: { $in: proposalIds } });

  const proposalTuples: string[] = [];
  const proposalStaleness: PackageStalenessResult['proposalStaleness'] = [];
  let isAnyProposalStale = false;

  const targetDocIdsSet = new Set<string>();
  const projIdsSet = new Set<string>();
  projIdsSet.add(pkg.projectId.toString());

  for (const prop of proposals) {
    targetDocIdsSet.add(prop.targetDocumentId.toString());
    projIdsSet.add(prop.projectId.toString());

    const doc = await Document.findOne({ _id: prop.targetDocumentId, isDeleted: false });
    let propStale = false;
    let staleReason: string | undefined;

    if (!doc) {
      propStale = true;
      staleReason = 'Target document was deleted or not found';
    } else {
      const currentFingerprint = await computeSimulationStateFingerprint(prop.targetDocumentId, prop.projectId);

      if (prop.simulationStateFingerprint && prop.simulationStateFingerprint !== currentFingerprint) {
        propStale = true;
        staleReason = 'Authoritative document state or relationships diverged from stored proposal fingerprint';
      }
    }

    if (propStale) {
      isAnyProposalStale = true;
    }

    proposalStaleness.push({
      proposalId: prop._id.toString(),
      proposalNumber: prop.proposalNumber,
      targetDocumentId: prop.targetDocumentId.toString(),
      isStale: propStale,
      ...(staleReason ? { reason: staleReason } : {}),
    });

    proposalTuples.push(`PROP:${prop._id.toString()}:${prop.simulationStateFingerprint || 'NO_FINGERPRINT'}`);
  }

  proposalTuples.sort();

  // 3. Document tuples for all target docs
  const docTuples: string[] = [];
  for (const docIdStr of Array.from(targetDocIdsSet).sort()) {
    const doc = await Document.findById(docIdStr);
    if (doc) {
      docTuples.push(`DOC:${doc._id.toString()}:${doc.version || 1}:${doc.updatedAt ? doc.updatedAt.getTime() : 0}`);
    }
  }

  // 4. Baseline tuples for all projects
  const baselineTuples: string[] = [];
  for (const projIdStr of Array.from(projIdsSet).sort()) {
    const b = await DocumentationBaseline.findOne({ projectId: new Types.ObjectId(projIdStr), isActive: true });
    if (b) {
      baselineTuples.push(`BASELINE:${b._id.toString()}:${b.updatedAt ? b.updatedAt.getTime() : 0}`);
    }
  }

  // Canonical serialization
  const canonicalSerialized = [pkgTuple, ...proposalTuples, ...docTuples, ...baselineTuples].join('\n');
  const fingerprint = crypto.createHash('sha256').update(canonicalSerialized, 'utf8').digest('hex');

  const isPackageStale = isAnyProposalStale || (pkg.packageStateFingerprint ? pkg.packageStateFingerprint !== fingerprint : false);

  return {
    fingerprint,
    stalenessResult: {
      isStale: isPackageStale,
      packageFingerprint: fingerprint,
      proposalStaleness,
    },
  };
}
