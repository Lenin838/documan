import { runPhase28QA } from '../../apps/api/src/modules/governance/run_phase28_qa.js';

runPhase28QA()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
