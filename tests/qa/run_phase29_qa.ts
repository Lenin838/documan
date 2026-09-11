import { runPhase29QASuite } from '../../apps/api/src/modules/governance/run_phase29_qa.js';

console.log('=== Running Phase 29 Dynamic QA Suite (56 Scenarios) ===\n');

const results = runPhase29QASuite();
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

results.forEach((r) => {
  const icon = r.passed ? '✓' : '✗';
  console.log(`[${icon}] Scenario ${r.scenarioId} (${r.category}): ${r.name} -> ${r.message}`);
});

console.log('\n==================================================');
console.log(`Phase 29 QA Results: ${passed}/${total} PASSED (${failed} FAILED)`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
