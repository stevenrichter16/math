import { bootDesmosIntro } from './desmosIntro.js';
import { bootSecantAnimation } from './secantAnimation.js';

export function bootDerivativeViz(options) {
  bootDesmosIntro(options || {});
  bootSecantAnimation();
}
