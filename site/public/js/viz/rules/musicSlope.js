import { setupCanvas, VIZ_FNS, vizDeriv, slopeColor } from '../shared/vizShared.js';

export function bootMusicSlopeViz() {
  var c = setupCanvas('musicCanvas');
  if (!c) return;
  var ctx = c.getContext('2d');
  c.height = 120;
  var W = c.width, H = 120;
  var f = VIZ_FNS.sin;

  var audioCtx = null, osc = null, gainNode = null;
  var playing = false;

  var xSlider = document.getElementById('musicXSlider');
  var xValEl = document.getElementById('musicXVal');
  var info = document.getElementById('musicInfo');
  var playBtn = document.getElementById('musicBtn');

  var btnMap = {
    sin: document.getElementById('musicFnSin'),
    pow2: document.getElementById('musicFnPow2'),
    pow3: document.getElementById('musicFnPow3')
  };

  if (!xSlider || !xValEl || !info || !playBtn || !btnMap.sin || !btnMap.pow2 || !btnMap.pow3) {
    return;
  }

  function setFn(name) {
    f = VIZ_FNS[name];
    Object.keys(btnMap).forEach(function(k) { btnMap[k].classList.remove('active'); });
    btnMap[name].classList.add('active');
    updateMusic();
    drawWave();
  }

  Object.keys(btnMap).forEach(function(k) {
    btnMap[k].addEventListener('click', function() { setFn(k); });
  });
  btnMap.sin.classList.add('active');

  function slopeToFreq(d) {
    var raw = 261.63 * Math.pow(2, d / 4);
    return Math.max(65, Math.min(1047, raw));
  }

  function updateMusic() {
    var x = parseFloat(xSlider.value);
    var d = vizDeriv(f, x);
    var freq = slopeToFreq(d);
    info.textContent = 'slope = ' + d.toFixed(3) + '   |   freq = ' + freq.toFixed(1) + ' Hz';
    if (playing && osc) {
      osc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
    }
    drawWave(d);
  }

  function drawWave(d) {
    ctx.clearRect(0, 0, W, H);
    var cy = H / 2;

    ctx.fillStyle = '#12141e';
    ctx.fillRect(0, 0, W, H);

    if (!playing) {
      ctx.font = "13px 'Courier New', monospace";
      ctx.fillStyle = '#8892a4';
      ctx.textAlign = 'center';
      ctx.fillText('Press Play to hear the slope', W / 2, cy + 5);
      ctx.textAlign = 'left';
      return;
    }

    var x = parseFloat(xSlider.value);
    var slope = (d !== undefined) ? d : vizDeriv(f, x);
    var freq = slopeToFreq(slope);
    var cycles = freq / 80;
    var col = slopeColor(slope);

    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var px = 0; px < W; px++) {
      var angle = (px / W) * Math.PI * 2 * cycles;
      var y = cy - Math.sin(angle) * (cy * 0.7);
      px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
    }
    ctx.stroke();

    ctx.font = "12px 'Courier New', monospace";
    ctx.fillStyle = col;
    ctx.fillText(freq.toFixed(0) + ' Hz', 10, 18);
  }

  playBtn.addEventListener('click', function() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.18;
      gainNode.connect(audioCtx.destination);
    }

    if (playing) {
      osc.stop();
      osc = null;
      playing = false;
      playBtn.textContent = '▶ Play';
      drawWave();
      return;
    }

    var x = parseFloat(xSlider.value);
    var d = vizDeriv(f, x);
    osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = slopeToFreq(d);
    osc.connect(gainNode);
    osc.start();
    playing = true;
    playBtn.textContent = '⏹ Stop';
    drawWave(d);
  });

  xSlider.addEventListener('input', function() {
    xValEl.textContent = parseFloat(xSlider.value).toFixed(1);
    updateMusic();
  });

  drawWave();
}
