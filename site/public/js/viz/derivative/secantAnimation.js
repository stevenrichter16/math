export function bootSecantAnimation() {
  var canvas = document.getElementById('secantCanvas');
  var animBtn = document.getElementById('animBtn');
  if (!canvas || !animBtn) {
    return;
  }

  var ctx = canvas.getContext('2d');
  canvas.width = Math.min(640, window.innerWidth - 64);
  canvas.height = 260;

  var W = canvas.width;
  var H = canvas.height;
  var cx = W * 0.5;
  var cy = H * 0.6;
  var scaleX = W / 10;
  var scaleY = H / 14;
  var fx0 = 1.5;

  function toCanvas(x, y) {
    return [cx + x * scaleX, cy - y * scaleY];
  }

  function drawScene(h) {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();

    ctx.strokeStyle = '#7c6af7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var px = 0; px < W; px++) {
      var xv = (px - cx) / scaleX;
      var yv = xv * xv;
      var pt = toCanvas(xv, yv);
      if (px === 0) {
        ctx.moveTo(pt[0], pt[1]);
      } else {
        ctx.lineTo(pt[0], pt[1]);
      }
    }
    ctx.stroke();

    var x1 = fx0;
    var y1 = x1 * x1;
    var x2 = fx0 + h;
    var y2 = x2 * x2;
    var slope = h < 0.001 ? 2 * fx0 : (y2 - y1) / (x2 - x1);

    ctx.strokeStyle = h < 0.001 ? '#a78bfa' : '#f97316';
    ctx.lineWidth = 2;
    ctx.setLineDash(h < 0.001 ? [] : [6, 4]);
    ctx.beginPath();
    var s1 = toCanvas(-3, y1 + slope * (-3 - x1));
    var s2 = toCanvas(5, y1 + slope * (5 - x1));
    ctx.moveTo(s1[0], s1[1]);
    ctx.lineTo(s2[0], s2[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    var p1 = toCanvas(x1, y1);
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(p1[0], p1[1], 5, 0, Math.PI * 2);
    ctx.fill();

    if (h > 0.01) {
      var p2 = toCanvas(x2, y2);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(p2[0], p2[1], 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = Math.round(W * 0.022) + "px 'Courier New', monospace";
    ctx.fillStyle = h < 0.01 ? '#a78bfa' : '#f97316';
    var label = h < 0.001
      ? 'tangent slope = ' + slope.toFixed(2)
      : 'secant slope = ' + slope.toFixed(2) + '  (h = ' + h.toFixed(2) + ')';
    ctx.fillText(label, 14, 22);
  }

  drawScene(2.5);

  var animating = false;
  var animH = 2.5;

  animBtn.addEventListener('click', function() {
    if (animating) {
      return;
    }
    animating = true;
    animH = 2.5;
    animBtn.disabled = true;
    animBtn.textContent = 'animating...';

    function step() {
      animH *= 0.92;
      drawScene(animH);
      if (animH > 0.001) {
        requestAnimationFrame(step);
      } else {
        drawScene(0);
        animating = false;
        animBtn.disabled = false;
        animBtn.textContent = 'Animate again';
      }
    }
    requestAnimationFrame(step);
  });
}
