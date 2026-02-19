// =====================================================================
// scenes.js — Synthetic sample image generators
// =====================================================================

const COLORS = [
  '#e63946','#2a9d8f','#e9c46a','#457b9d','#a8dadc',
  '#f4a261','#264653','#e76f51','#06d6a0','#118ab2',
  '#ffd166','#9b5de5'
];

const SAMPLES = [
  { name: 'TABLE',  fn: genTable },
  { name: 'MUSEUM', fn: genMuseum },
  { name: 'SHELF',  fn: genShelf },
  { name: 'SCENE',  fn: genScene },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath(); ctx.fill();
}

function genTable(ctx, w, h) {
  const wall = ctx.createLinearGradient(0,0,0,h*0.6);
  wall.addColorStop(0, '#b8c5d6'); wall.addColorStop(1, '#8fa3b8');
  ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h*0.62);

  const tbl = ctx.createLinearGradient(0,h*0.6,0,h);
  tbl.addColorStop(0,'#c8a96e'); tbl.addColorStop(1,'#8a6530');
  ctx.fillStyle = tbl; ctx.fillRect(0, h*0.6, w, h*0.4);
  ctx.fillStyle = '#6b4a20'; ctx.fillRect(0, h*0.6, w, 4);

  ctx.fillStyle = '#d62828'; roundRect(ctx, w*0.15, h*0.38, 60, 80, 6);
  ctx.fillStyle = '#8b0000'; ctx.fillRect(w*0.15, h*0.38, 60, 8);
  ctx.fillStyle = '#3d6b4f'; roundRect(ctx, w*0.45, h*0.42, 90, 20, 2);
  ctx.fillStyle = '#2a4d38'; roundRect(ctx, w*0.47, h*0.44, 86, 18, 2);
  ctx.fillStyle = '#5a8a6a'; roundRect(ctx, w*0.43, h*0.40, 94, 20, 2);
  ctx.fillStyle = '#4a7fb5';
  ctx.beginPath(); ctx.ellipse(w*0.78, h*0.48, 22, 30, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#6699cc';
  ctx.beginPath(); ctx.ellipse(w*0.78, h*0.35, 8, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath(); ctx.ellipse(w*0.2,  h*0.62, 35, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w*0.5,  h*0.62, 50, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w*0.78, h*0.62, 25, 5, 0, 0, Math.PI*2); ctx.fill();
}

function genMuseum(ctx, w, h) {
  const floor = ctx.createLinearGradient(0,h*0.7,0,h);
  floor.addColorStop(0,'#e8e0d4'); floor.addColorStop(1,'#c8bfb0');
  ctx.fillStyle = floor; ctx.fillRect(0,h*0.7,w,h*0.3);
  ctx.fillStyle = '#f5f0e8'; ctx.fillRect(0,0,w,h*0.72);
  ctx.fillStyle = '#c8bfb0'; ctx.fillRect(0,h*0.7,w,8);

  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(w*0.05, h*0.05, 140, 5);
  ctx.fillRect(w*0.05, h*0.5,  140, 5);
  ctx.fillRect(w*0.05, h*0.05, 5, h*0.45+5);
  ctx.fillRect(w*0.05+135, h*0.05, 5, h*0.45+5);
  const pg = ctx.createLinearGradient(w*0.06, h*0.06, w*0.05+130, h*0.49);
  pg.addColorStop(0,'#e8a87c'); pg.addColorStop(0.5,'#c4704a'); pg.addColorStop(1,'#7a4520');
  ctx.fillStyle = pg; ctx.fillRect(w*0.06, h*0.07, 130, h*0.43);

  ctx.fillStyle = '#d4cfc8'; ctx.fillRect(w*0.6, h*0.45, 100, h*0.25);
  ctx.fillStyle = '#bfb8b0'; ctx.fillRect(w*0.58, h*0.68, 104, 10);
  ctx.fillStyle = '#e8e0d8';
  ctx.beginPath(); ctx.ellipse(w*0.71, h*0.35, 18, 28, 0.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#d0c8c0';
  ctx.beginPath(); ctx.ellipse(w*0.68, h*0.3, 10, 14, -0.3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,180,0.08)';
  ctx.beginPath(); ctx.moveTo(w*0.71,0); ctx.lineTo(w*0.55,h*0.7); ctx.lineTo(w*0.87,h*0.7); ctx.closePath(); ctx.fill();
}

function genShelf(ctx, w, h) {
  ctx.fillStyle = '#2d2416'; ctx.fillRect(0,0,w,h);
  const shelves = [h*0.18, h*0.42, h*0.65, h*0.88];
  shelves.forEach(sy => {
    ctx.fillStyle = '#8B6914'; ctx.fillRect(0, sy, w, 14);
    ctx.fillStyle = '#6b4f0e'; ctx.fillRect(0, sy+14, w, 3);
  });
  const bookColors = ['#c84b2f','#457b9d','#2a8c4a','#9b5de5','#f4a261','#e63946','#2a9d8f','#e9c46a'];
  let bx = 8;
  for (let i = 0; i < 8; i++) {
    const bw = 18 + Math.random()*14;
    const bh = (shelves[1]-shelves[0]-14) * (0.5+Math.random()*0.5);
    ctx.fillStyle = bookColors[i % bookColors.length];
    ctx.fillRect(bx, shelves[0]-bh, bw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(bx+bw-2, shelves[0]-bh, 2, bh);
    bx += bw + 2;
  }
  bx = 6;
  for (let i = 0; i < 9; i++) {
    const bw = 16 + Math.random()*16;
    const bh = (shelves[2]-shelves[1]-14) * (0.4+Math.random()*0.55);
    ctx.fillStyle = bookColors[(i+3) % bookColors.length];
    ctx.fillRect(bx, shelves[1]-bh, bw, bh);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(bx+bw-2, shelves[1]-bh, 2, bh);
    bx += bw + 3;
  }
  ctx.fillStyle = '#5a3a1a';
  ctx.beginPath(); ctx.ellipse(w*0.82, shelves[0], 14, 9, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#2d7a2a';
  for (let i = 0; i < 5; i++) {
    const a = (i/5)*Math.PI*2;
    ctx.beginPath(); ctx.ellipse(w*0.82+Math.cos(a)*16, shelves[0]-Math.sin(a)*16-10, 10, 5, a, 0, Math.PI*2); ctx.fill();
  }
}

function genScene(ctx, w, h) {
  const sky = ctx.createLinearGradient(0,0,0,h*0.5);
  sky.addColorStop(0,'#87ceeb'); sky.addColorStop(1,'#b0d8f0');
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,h*0.5);
  const gnd = ctx.createLinearGradient(0,h*0.5,0,h);
  gnd.addColorStop(0,'#6aaa4a'); gnd.addColorStop(1,'#3d7a20');
  ctx.fillStyle = gnd; ctx.fillRect(0,h*0.5,w,h*0.5);
  ctx.fillStyle = '#c8b88a';
  ctx.beginPath(); ctx.moveTo(w*0.35,h*0.5); ctx.lineTo(w*0.65,h*0.5); ctx.lineTo(w*0.85,h); ctx.lineTo(w*0.15,h); ctx.closePath(); ctx.fill();
  [[0.1,0.4],[0.25,0.45],[0.75,0.42],[0.88,0.38]].forEach(([fx,fy]) => {
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(fx*w-4, fy*h, 8, h*(0.5-fy)+10);
    ctx.fillStyle = '#2d7a2a';
    ctx.beginPath(); ctx.arc(fx*w, fy*h-10, 25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1a5c1a';
    ctx.beginPath(); ctx.arc(fx*w-8, fy*h-5, 18, 0, Math.PI*2); ctx.fill();
  });
  ctx.fillStyle = '#c8a87a'; ctx.fillRect(w*0.4, h*0.2, w*0.2, h*0.3);
  ctx.fillStyle = '#a88460'; ctx.fillRect(w*0.38, h*0.18, w*0.24, 10);
  ctx.fillStyle = '#6b4a20'; ctx.fillRect(w*0.46, h*0.36, 28, h*0.14+2);
  [[0.43,0.24],[0.54,0.24],[0.43,0.32],[0.54,0.32]].forEach(([fx,fy]) => {
    ctx.fillStyle = '#87ceeb'; ctx.fillRect(fx*w, fy*h, 18, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(fx*w,fy*h,9,22);
  });
}
