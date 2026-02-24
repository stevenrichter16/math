import { bootTwinCurvesViz } from './twinCurves.js';
import { bootVelocityGhostViz } from './velocityGhost.js';
import { bootTemperatureMapViz } from './temperatureMap.js';
import { bootMusicSlopeViz } from './musicSlope.js';

export function bootRulesViz() {
  bootTwinCurvesViz();
  bootVelocityGhostViz();
  bootTemperatureMapViz();
  bootMusicSlopeViz();
}
