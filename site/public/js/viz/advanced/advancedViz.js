import { bootPartialFreezeFrameViz } from './partialFreezeFrame.js';
import { bootIntegralLedgerViz } from './integralLedger.js';
import { bootDifferentialFlowViz } from './differentialFlow.js';

export function bootAdvancedViz() {
  bootPartialFreezeFrameViz();
  bootIntegralLedgerViz();
  bootDifferentialFlowViz();
}
