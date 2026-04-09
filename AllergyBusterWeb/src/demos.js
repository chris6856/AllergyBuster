// AllergyBuster — Interactive App Demos
// Canvas-based looping animations for each how-to feature

(function () {
  'use strict';

  // ─── Palette ────────────────────────────────────────────────────
  const C = {
    bg:         '#070f0a',
    screenBg:   '#0a1a10',
    phoneBod:   '#0f2318',
    phoneDark:  '#0a1510',
    headerBg:   '#1a3a2a',
    greenMid:   '#2d5c40',
    greenLight: '#4a8c62',
    amber:      '#e8a020',
    amberL:     '#f5c060',
    cream:      '#f7f2e8',
    muted:      'rgba(247,242,232,0.50)',
    dim:        'rgba(247,242,232,0.25)',
    border:     'rgba(138,171,138,0.35)',
    amberBorder:'rgba(232,160,32,0.35)',
    amberFill:  'rgba(232,160,32,0.12)',
  };

  // ─── Math helpers ────────────────────────────────────────────────
  function eo3(t)        { return 1 - Math.pow(1 - t, 3); }
  function clamp(v,a,b)  { return Math.max(a, Math.min(b, v)); }
  function prog(t,s,e)   { return clamp((t - s) / (e - s), 0, 1); }
  function lerp(a,b,t)   { return a + (b - a) * t; }

  // ─── Canvas helpers ──────────────────────────────────────────────
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }

  function fillRR(ctx, x, y, w, h, r, color) {
    ctx.fillStyle = color; rr(ctx, x, y, w, h, r); ctx.fill();
  }

  function strokeRR(ctx, x, y, w, h, r, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw || 1; rr(ctx, x, y, w, h, r); ctx.stroke();
  }

  // Draw phone shell, return { sx, sy, sw, sh } = inner screen area
  function phone(ctx, cx, cy, W, H, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur   = 36;
    fillRR(ctx, cx - W/2, cy - H/2, W, H, 22, C.phoneBod);
    ctx.shadowBlur = 0;
    strokeRR(ctx, cx - W/2, cy - H/2, W, H, 22, C.border, 2);
    // inner screen background
    fillRR(ctx, cx - W/2 + 5, cy - H/2 + 5, W - 10, H - 10, 18, C.screenBg);
    // notch
    fillRR(ctx, cx - 28, cy - H/2 + 10, 56, 16, 8, C.phoneBod);
    ctx.restore();
    return { sx: cx - W/2 + 5, sy: cy - H/2 + 32, sw: W - 10, sh: H - 42 };
  }

  function clipToScreen(ctx, sc) {
    rr(ctx, sc.sx, sc.sy, sc.sw, sc.sh, 4);
    ctx.clip();
  }

  function screenHeader(ctx, sc, text) {
    fillRR(ctx, sc.sx, sc.sy, sc.sw, 26, 0, C.headerBg);
    ctx.fillStyle = C.cream;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, sc.sx + sc.sw / 2, sc.sy + 17);
    ctx.textAlign = 'left';
  }

  function searchBar(ctx, sc, text, cursor) {
    const x = sc.sx + 7, y = sc.sy + 30, w = sc.sw - 14, h = 21;
    fillRR(ctx, x, y, w, h, 6, 'rgba(247,242,232,0.07)');
    strokeRR(ctx, x, y, w, h, 6, 'rgba(247,242,232,0.18)', 1);
    ctx.fillStyle = C.muted;
    ctx.font = '11px sans-serif';
    ctx.fillText('🔍', x + 5, y + 15);
    ctx.fillStyle = C.cream;
    ctx.font = '500 9px sans-serif';
    ctx.fillText(text + (cursor ? '|' : ''), x + 20, y + 14);
  }

  function spinner(ctx, sc, t) {
    ctx.save();
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(sc.sx + sc.sw / 2, sc.sy + sc.sh / 2, 13, t * 5, t * 5 + Math.PI * 1.4);
    ctx.stroke();
    ctx.restore();
  }

  function allergenPanel(ctx, sc, title, tags, resultPhase) {
    const px = sc.sx + 7, py = sc.sy + 38, pw = sc.sw - 14, ph2 = sc.sh - 48;
    fillRR(ctx, px, py, pw, ph2, 8, C.amberFill);
    strokeRR(ctx, px, py, pw, ph2, 8, C.amberBorder, 1);
    ctx.fillStyle = C.amberL;
    ctx.font = 'bold 8px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(title, sc.sx + sc.sw / 2, py + 14);
    ctx.textAlign = 'left';

    let tx = px + 8, ty = py + 26;
    tags.forEach((tag, i) => {
      const ta = eo3(prog(resultPhase, i * 0.1, i * 0.1 + 0.2));
      if (ta < 0.01) return;
      ctx.save();
      ctx.globalAlpha *= ta;
      ctx.font = 'bold 8px Courier New';
      const tw = ctx.measureText(tag).width + 10;
      if (tx + tw > sc.sx + sc.sw - 10) { tx = px + 8; ty += 18; }
      fillRR(ctx, tx, ty, tw, 14, 3, C.amber);
      ctx.fillStyle = C.phoneBod;
      ctx.fillText(tag, tx + 5, ty + 10);
      tx += tw + 5;
      ctx.restore();
    });
  }

  // ─── Demo 1 — Barcode Scan ───────────────────────────────────────
  function demo1(ctx, t) {
    const W = 640, H = 360;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    const alpha = Math.min(eo3(prog(t, 0, 0.5)), 1 - eo3(prog(t, 8.5, 9.5)));
    if (alpha < 0.02) return;

    const sc = phone(ctx, W / 2, H / 2, 156, 278, alpha);

    ctx.save();
    ctx.globalAlpha = alpha;
    clipToScreen(ctx, sc);
    ctx.fillStyle = C.phoneDark; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);

    // —— Scan view (0.5 – 4.0s) ——
    const scanV = Math.min(eo3(prog(t, 0.5, 1.2)), 1 - eo3(prog(t, 4.0, 4.5)));
    if (scanV > 0.01) {
      ctx.save(); ctx.globalAlpha *= scanV;
      ctx.fillStyle = C.muted; ctx.font = '600 7px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('POINT CAMERA AT BARCODE', sc.sx + sc.sw / 2, sc.sy + 16);
      ctx.textAlign = 'left';

      // Viewfinder
      const vx = sc.sx + 14, vy = sc.sy + 22, vw = sc.sw - 28, vh = sc.sh - 80;

      // Barcode document
      const bx = sc.sx + sc.sw / 2 - 32, by = vy + vh / 2 - 24, bw = 64, bh = 48;
      ctx.fillStyle = '#eee8d8'; ctx.fillRect(bx, by, bw, bh);
      const bars = [3,1,2,1,3,2,1,2,1,3,1,2,3,1,2,1,3,2,1];
      let xi = bx + 2;
      bars.forEach((w2, i) => {
        if (i % 2 === 0) { ctx.fillStyle = '#181818'; ctx.fillRect(xi, by + 3, w2 * 2, bh - 6); }
        xi += w2 * 2;
      });
      ctx.fillStyle = '#555'; ctx.font = '600 6px Courier New';
      ctx.textAlign = 'center'; ctx.fillText('0 12345 67890', sc.sx + sc.sw / 2, by + bh - 2);
      ctx.textAlign = 'left';

      // Scan line
      const sl = vy + 8 + (Math.sin(t * Math.PI * 1.3) * 0.5 + 0.5) * (vh - 16);
      const slg = ctx.createLinearGradient(vx, 0, vx + vw, 0);
      slg.addColorStop(0, 'transparent'); slg.addColorStop(0.5, C.amber); slg.addColorStop(1, 'transparent');
      ctx.fillStyle = slg; ctx.globalAlpha *= 0.9; ctx.fillRect(vx, sl, vw, 2);
      ctx.globalAlpha = alpha * scanV;

      // Corner brackets
      const cL = 13;
      ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.lineCap = 'round';
      [[vx, vy, 1, 1], [vx + vw, vy, -1, 1], [vx, vy + vh, 1, -1], [vx + vw, vy + vh, -1, -1]].forEach(([cx2, cy2, sx2, sy2]) => {
        ctx.beginPath(); ctx.moveTo(cx2, cy2 + sy2 * cL); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2 + sx2 * cL, cy2); ctx.stroke();
      });
      ctx.restore();
    }

    // —— Flash (4.0 – 4.6s) ——
    const fp = prog(t, 4.0, 4.6);
    if (fp > 0) {
      const fa = Math.sin(fp * Math.PI) * 0.75;
      ctx.fillStyle = `rgba(74,140,98,${fa})`; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);
      if (fp > 0.2 && fp < 0.85) {
        ctx.save();
        ctx.globalAlpha = alpha * Math.sin((fp - 0.2) / 0.65 * Math.PI);
        ctx.strokeStyle = C.cream; ctx.lineWidth = 3; ctx.lineCap = 'round';
        const cx2 = sc.sx + sc.sw / 2, cy2 = sc.sy + sc.sh / 2;
        ctx.beginPath(); ctx.moveTo(cx2 - 14, cy2); ctx.lineTo(cx2 - 4, cy2 + 11); ctx.lineTo(cx2 + 17, cy2 - 13); ctx.stroke();
        ctx.restore();
      }
    }

    // —— Results (4.6 – 8.5s) ——
    const rp = prog(t, 4.6, 8.5);
    if (rp > 0) {
      const slideY = lerp(sc.sh, 0, eo3(Math.min(rp * 2.5, 1)));
      ctx.save(); ctx.translate(0, slideY);
      ctx.fillStyle = C.phoneDark; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);
      ctx.fillStyle = C.muted; ctx.font = '600 7px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('SCAN COMPLETE', sc.sx + sc.sw / 2, sc.sy + 14);
      ctx.fillStyle = C.cream; ctx.font = '500 9px sans-serif';
      ctx.fillText('Organic Granola Bar 32g', sc.sx + sc.sw / 2, sc.sy + 27);
      ctx.textAlign = 'left';
      allergenPanel(ctx, sc, 'ALLERGENS DETECTED', ['MILK','WHEAT','SOY','EGGS','TREE NUTS'], rp);
      ctx.restore();
    }

    ctx.restore();
  }

  // ─── Demo 2 — Photo Label Reading ───────────────────────────────
  function demo2(ctx, t) {
    const W = 640, H = 360;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    const alpha = Math.min(eo3(prog(t, 0, 0.5)), 1 - eo3(prog(t, 8.5, 9.5)));
    if (alpha < 0.02) return;

    const sc = phone(ctx, W / 2, H / 2, 156, 278, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    clipToScreen(ctx, sc);
    ctx.fillStyle = C.phoneDark; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);

    // —— Camera view (0.5 – 5.0s) ——
    const camV = Math.min(eo3(prog(t, 0.5, 1.1)), 1 - eo3(prog(t, 4.8, 5.3)));
    if (camV > 0.01) {
      ctx.save(); ctx.globalAlpha *= camV;
      ctx.fillStyle = '#101f14'; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);
      ctx.fillStyle = C.muted; ctx.font = '600 7px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('PHOTOGRAPH INGREDIENT LABEL', sc.sx + sc.sw / 2, sc.sy + 14);
      ctx.textAlign = 'left';

      // Label document
      const lx = sc.sx + 10, ly = sc.sy + 22, lw = sc.sw - 20, lh = sc.sh - 58;
      fillRR(ctx, lx, ly, lw, lh, 4, '#efe9d8');

      // Text lines with OCR highlights
      const lines = [
        { y: 16, w: 0.9, text: 'INGREDIENTS:', bold: true },
        { y: 28, w: 0.85, text: 'Rolled oats, honey, brown sugar,' },
        { y: 40, w: 0.72, text: 'palm oil, almonds, cashews,' },
        { y: 52, w: 0.8,  text: 'whole milk powder, soy lecithin,' },
        { y: 64, w: 0.62, text: 'wheat germ, egg whites,' },
        { y: 76, w: 0.75, text: 'vanilla extract, salt.' },
        { y: 92, w: 0.9,  text: 'CONTAINS: MILK, WHEAT,', bold: true },
        { y: 104,w: 0.7,  text: 'SOY, EGGS, TREE NUTS', bold: true },
      ];

      lines.forEach((ln, i) => {
        const lineY = ly + ln.y;
        if (lineY > ly + lh - 6) return;
        // OCR highlight sweep
        const hp = eo3(prog(t, 2.0 + i * 0.28, 2.0 + i * 0.28 + 0.4));
        if (hp > 0 && i > 0) {
          ctx.fillStyle = `rgba(232,160,32,${hp * 0.4})`;
          ctx.fillRect(lx + 6, lineY - 8, (lw - 12) * ln.w, 11);
        }
        ctx.fillStyle = ln.bold ? '#151515' : '#5a5040';
        ctx.font = ln.bold ? 'bold 7px sans-serif' : '400 7px sans-serif';
        ctx.fillText(ln.text, lx + 8, lineY);
      });

      // Focus ring
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.8);
      ctx.strokeStyle = `rgba(232,160,32,${0.45 + pulse * 0.45})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sc.sx + sc.sw / 2, ly + lh / 2, 36 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // —— "Analyzing" label (4.8 – 5.3s) ——
    const anaP = prog(t, 4.8, 5.3);
    if (anaP > 0 && anaP < 1) {
      ctx.save(); ctx.globalAlpha = alpha * Math.sin(anaP * Math.PI);
      ctx.fillStyle = C.muted; ctx.font = '600 8px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('ANALYZING LABEL…', sc.sx + sc.sw / 2, sc.sy + sc.sh / 2);
      ctx.textAlign = 'left'; ctx.restore();
    }

    // —— Results (5.3 – 8.5s) ——
    const rp = prog(t, 5.3, 8.5);
    if (rp > 0) {
      const slideY = lerp(sc.sh, 0, eo3(Math.min(rp * 2.5, 1)));
      ctx.save(); ctx.translate(0, slideY);
      ctx.fillStyle = C.phoneDark; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);
      ctx.fillStyle = C.muted; ctx.font = '600 7px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('LABEL ANALYZED', sc.sx + sc.sw / 2, sc.sy + 14);
      ctx.fillStyle = C.cream; ctx.font = '500 9px sans-serif';
      ctx.fillText('Organic Granola Bar · 32g', sc.sx + sc.sw / 2, sc.sy + 27);
      ctx.textAlign = 'left';

      // Individual allergen rows
      const allergens = [
        { icon: '🥛', name: 'Milk / Dairy' },
        { icon: '🌾', name: 'Wheat / Gluten' },
        { icon: '🌿', name: 'Soy' },
        { icon: '🥚', name: 'Eggs' },
        { icon: '🌰', name: 'Tree Nuts' },
      ];
      const panelX = sc.sx + 7, panelY = sc.sy + 36, panelW = sc.sw - 14;
      fillRR(ctx, panelX, panelY, panelW, sc.sh - 46, 8, C.amberFill);
      strokeRR(ctx, panelX, panelY, panelW, sc.sh - 46, 8, C.amberBorder, 1);
      ctx.fillStyle = C.amberL; ctx.font = 'bold 8px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('5 ALLERGENS FOUND', sc.sx + sc.sw / 2, panelY + 14);
      ctx.textAlign = 'left';

      allergens.forEach((a, i) => {
        const rowA = eo3(prog(rp, i * 0.1, i * 0.1 + 0.2));
        if (rowA < 0.01) return;
        const ry = panelY + 22 + i * 20;
        ctx.save(); ctx.globalAlpha *= rowA;
        fillRR(ctx, panelX + 6, ry, panelW - 12, 16, 3, 'rgba(247,242,232,0.06)');
        ctx.font = '500 9px sans-serif'; ctx.fillStyle = C.cream;
        ctx.fillText(`${a.icon} ${a.name}`, panelX + 12, ry + 11);
        ctx.restore();
      });
      ctx.restore();
    }

    ctx.restore();
  }

  // ─── Demo 3 — Product & Ingredient Search ───────────────────────
  function demo3(ctx, t) {
    const W = 640, H = 360;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    const alpha = Math.min(eo3(prog(t, 0, 0.5)), 1 - eo3(prog(t, 8.5, 9.5)));
    if (alpha < 0.02) return;

    const sc = phone(ctx, W / 2, H / 2, 156, 278, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    clipToScreen(ctx, sc);
    ctx.fillStyle = C.phoneDark; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);

    screenHeader(ctx, sc, 'Product Search');

    // Typing "Organic Granola Bar"
    const fullText = 'Organic Granola Bar';
    const charCount = Math.floor(eo3(prog(t, 0.5, 3.0)) * fullText.length);
    const cursor = t < 3.2 && Math.floor(t * 2) % 2 === 0;
    searchBar(ctx, sc, fullText.slice(0, charCount), cursor);

    // Spinner (3.0 – 3.6s)
    const spinP = prog(t, 3.0, 3.6);
    if (spinP > 0 && spinP < 1) { spinner(ctx, sc, t); }

    // Results (3.6 – 8.5s)
    const rp = prog(t, 3.6, 8.5);
    if (rp > 0) {
      const products = [
        { name: 'Organic Granola Bar', brand: "Nature's Valley · 32g", tags: ['MILK','WHEAT','NUTS'] },
        { name: 'Honey Oat Granola Bar',  brand: 'Quaker · 35g',          tags: ['MILK','WHEAT','SOY'] },
        { name: 'Dark Choc Protein Bar',  brand: 'KIND · 40g',             tags: ['TREE NUTS'] },
      ];
      products.forEach((p, i) => {
        const pa = eo3(prog(rp, i * 0.18, i * 0.18 + 0.35));
        if (pa < 0.01) return;
        const ry = sc.sy + 60 + i * 64;
        if (ry + 58 > sc.sy + sc.sh) return;

        ctx.save(); ctx.globalAlpha *= pa;
        fillRR(ctx, sc.sx + 7, ry, sc.sw - 14, 58, 7, 'rgba(247,242,232,0.055)');
        strokeRR(ctx, sc.sx + 7, ry, sc.sw - 14, 58, 7, 'rgba(247,242,232,0.1)', 1);
        ctx.fillStyle = C.cream; ctx.font = 'bold 9px sans-serif';
        ctx.fillText(p.name, sc.sx + 14, ry + 16);
        ctx.fillStyle = C.muted; ctx.font = '400 8px sans-serif';
        ctx.fillText(p.brand, sc.sx + 14, ry + 28);

        let tx = sc.sx + 14;
        p.tags.forEach(tag => {
          ctx.font = 'bold 7px Courier New';
          const tw = ctx.measureText(tag).width + 10;
          fillRR(ctx, tx, ry + 36, tw, 14, 3, 'rgba(232,160,32,0.22)');
          ctx.fillStyle = C.amberL; ctx.fillText(tag, tx + 5, ry + 46);
          tx += tw + 5;
        });
        ctx.restore();
      });
    }

    ctx.restore();
  }

  // ─── Demo 4 — Ingredient Name Search ────────────────────────────
  function demo4(ctx, t) {
    const W = 640, H = 360;
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

    const alpha = Math.min(eo3(prog(t, 0, 0.5)), 1 - eo3(prog(t, 8.5, 9.5)));
    if (alpha < 0.02) return;

    const sc = phone(ctx, W / 2, H / 2, 156, 278, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    clipToScreen(ctx, sc);
    ctx.fillStyle = C.phoneDark; ctx.fillRect(sc.sx, sc.sy, sc.sw, sc.sh);

    screenHeader(ctx, sc, 'Ingredient Search');

    // Typing "casein"
    const fullText = 'casein';
    const charCount = Math.floor(eo3(prog(t, 0.5, 2.0)) * fullText.length);
    const cursor = t < 2.2 && Math.floor(t * 2) % 2 === 0;
    searchBar(ctx, sc, fullText.slice(0, charCount), cursor);

    // Spinner (2.0 – 2.6s)
    const spinP = prog(t, 2.0, 2.6);
    if (spinP > 0 && spinP < 1) { spinner(ctx, sc, t); }

    // Count badge (2.6 – 4.5s)
    const countP = prog(t, 2.6, 4.5);
    if (countP > 0) {
      const ba = eo3(Math.min(countP * 3, 1));
      ctx.save(); ctx.globalAlpha *= ba;
      const bx = sc.sx + 7, by = sc.sy + 58;
      fillRR(ctx, bx, by, sc.sw - 14, 28, 8, C.amberFill);
      strokeRR(ctx, bx, by, sc.sw - 14, 28, 8, C.amberBorder, 1);
      const count = Math.floor(eo3(clamp(countP, 0, 1)) * 127);
      ctx.fillStyle = C.amber; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`"casein" found in ${count} products`, sc.sx + sc.sw / 2, by + 17);
      ctx.textAlign = 'left'; ctx.restore();
    }

    // Product list (4.5 – 8.5s)
    const listP = prog(t, 4.5, 8.5);
    if (listP > 0) {
      const products = [
        { name: 'Kraft Singles Cheese', risk: 'HIGH — Direct source' },
        { name: 'Coffee-Mate Creamer',  risk: 'HIGH — Contains casein' },
        { name: 'Oscar Mayer Deli Ham', risk: 'MED — Caseinate additive' },
        { name: 'Land O\'Lakes Butter', risk: 'HIGH — Dairy protein' },
      ];
      products.forEach((p, i) => {
        const pa = eo3(prog(listP, i * 0.14, i * 0.14 + 0.28));
        if (pa < 0.01) return;
        const ry = sc.sy + 94 + i * 42;
        if (ry + 36 > sc.sy + sc.sh) return;

        ctx.save(); ctx.globalAlpha *= pa;
        fillRR(ctx, sc.sx + 7, ry, sc.sw - 14, 36, 5, 'rgba(247,242,232,0.05)');
        strokeRR(ctx, sc.sx + 7, ry, sc.sw - 14, 36, 5, 'rgba(247,242,232,0.08)', 1);
        ctx.fillStyle = C.cream; ctx.font = 'bold 9px sans-serif';
        ctx.fillText(p.name, sc.sx + 14, ry + 13);
        ctx.fillStyle = C.amber; ctx.font = '700 7px Courier New';
        ctx.fillText('⚠ ' + p.risk, sc.sx + 14, ry + 26);
        ctx.restore();
      });
    }

    ctx.restore();
  }

  // ─── Init ────────────────────────────────────────────────────────
  function initDemo(canvasId, drawFn, offsetSeconds) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.width  = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    const FPS = 60, DURATION = 10;
    let t = offsetSeconds || 0;
    let started = false;

    function tick() {
      t = (t + 1 / FPS) % DURATION;
      drawFn(ctx, t);
      requestAnimationFrame(tick);
    }

    // Only start animating when the canvas enters the viewport
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        tick();
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(canvas);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initDemo('demo1', demo1, 0.0);
    initDemo('demo2', demo2, 0.0);
    initDemo('demo3', demo3, 0.0);
    initDemo('demo4', demo4, 0.0);
  });
})();
