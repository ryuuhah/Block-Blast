(() => {
  'use strict';

  const GRID_SIZE = 8;
  const SAVE_KEY = 'bb_saved_session_v1';
  const COLORS = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#bf5af2', '#ff375f'];

  // 45 Variasi Bentuk Klasik + Bobot Ramah Pemain
  const SHAPES = [
    { m: [[1]], w: 9 },
    { m: [[1, 1]], w: 12 }, { m: [[1], [1]], w: 12 },
    { m: [[1, 1, 1]], w: 13 }, { m: [[1], [1], [1]], w: 13 },
    { m: [[1, 1, 1, 1]], w: 8 }, { m: [[1], [1], [1], [1]], w: 8 },
    { m: [[1, 1, 1, 1, 1]], w: 4 }, { m: [[1], [1], [1], [1], [1]], w: 4 },
    { m: [[1, 0], [0, 1]], w: 7 }, { m: [[0, 1], [1, 0]], w: 7 },
    { m: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], w: 4 }, { m: [[0, 0, 1], [0, 1, 0], [1, 0, 0]], w: 4 },
    { m: [[1, 1], [1, 1]], w: 14 },
    { m: [[1, 1, 1], [1, 1, 1]], w: 6 }, { m: [[1, 1], [1, 1], [1, 1]], w: 6 },
    { m: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], w: 3 },
    { m: [[1, 0], [1, 1]], w: 10 }, { m: [[0, 1], [1, 1]], w: 10 },
    { m: [[1, 1], [1, 0]], w: 10 }, { m: [[1, 1], [0, 1]], w: 10 },
    { m: [[1, 0], [1, 0], [1, 1]], w: 7 }, { m: [[0, 1], [0, 1], [1, 1]], w: 7 },
    { m: [[1, 1], [1, 0], [1, 0]], w: 7 }, { m: [[1, 1], [0, 1], [0, 1]], w: 7 },
    { m: [[1, 1, 1], [1, 0, 0]], w: 7 }, { m: [[1, 1, 1], [0, 0, 1]], w: 7 },
    { m: [[1, 0, 0], [1, 1, 1]], w: 7 }, { m: [[0, 0, 1], [1, 1, 1]], w: 7 },
    { m: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], w: 3 }, { m: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], w: 3 },
    { m: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], w: 3 }, { m: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], w: 3 },
    { m: [[1, 1, 1], [0, 1, 0]], w: 7 }, { m: [[0, 1, 0], [1, 1, 1]], w: 7 },
    { m: [[1, 0], [1, 1], [1, 0]], w: 7 }, { m: [[0, 1], [1, 1], [0, 1]], w: 7 },
    { m: [[1, 1, 0], [0, 1, 1]], w: 6 }, { m: [[0, 1, 1], [1, 1, 0]], w: 6 },
    { m: [[0, 1], [1, 1], [1, 0]], w: 6 }, { m: [[1, 0], [1, 1], [0, 1]], w: 6 },
    { m: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], w: 3 },
    { m: [[1, 0, 1], [1, 1, 1]], w: 4 }, { m: [[1, 1, 1], [1, 0, 1]], w: 4 },
    { m: [[1, 1], [1, 0], [1, 1]], w: 4 }, { m: [[1, 1], [0, 1], [1, 1]], w: 4 }
  ].map(s => ({ ...s, cells: s.m.flat().reduce((a, b) => a + b, 0) }));

  /* =========================================================================
     AUDIO ENGINE (WEB AUDIO API)
     ========================================================================= */
  const SFX = {
    ctx: null,
    muted: localStorage.getItem('bb_muted') === '1',
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx?.state === 'suspended') this.ctx.resume();
    },
    tone(freq, endFreq, dur, type = 'sine', vol = 0.14, delay = 0) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    pickup() { this.tone(360, 540, 0.07, 'sine', 0.1); },
    place() { this.tone(210, 95, 0.085, 'triangle', 0.16); },
    undo() { this.tone(480, 290, 0.1, 'sine', 0.12); },
    refresh() {
      this.tone(420, 620, 0.07, 'sine', 0.1, 0);
      this.tone(540, 760, 0.08, 'sine', 0.1, 0.06);
    },
    bomb() {
      this.tone(150, 38, 0.32, 'sawtooth', 0.22, 0);
      this.tone(95, 30, 0.36, 'triangle', 0.24, 0.02);
    },
    clear(combo) {
      const mult = Math.pow(2, Math.min(combo, 10) / 12);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this.tone(f * mult, f * mult * 1.03, 0.28, 'sine', 0.14, i * 0.036);
      });
      // Tambahan kilau harmonik tinggi saat combo >= 2
      if (combo >= 2) {
        this.tone(1318.5 * mult, 1567.98 * mult, 0.34, 'triangle', 0.09, 0.1);
      }
    },
    over() {
      [392, 349.23, 329.63, 261.63].forEach((f, i) => {
        this.tone(f, f * 0.96, 0.22, 'triangle', 0.1, i * 0.12);
      });
    }
  };

  /* =========================================================================
     PARTICLE & SHOCKWAVE SYSTEM (60FPS)
     ========================================================================= */
  const FX = (() => {
    const canvas = document.getElementById('fx-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let rings = [];
    let active = false;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', resize);
    resize();

    const startLoop = () => {
      if (!active) {
        active = true;
        requestAnimationFrame(loop);
      }
    };

    const loop = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Gambar gelombang kejut (shockwave rings) saat combo / multi-clear
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.radius += (r.maxRadius - r.radius) * 0.14;
        r.alpha -= r.decay;
        if (r.alpha <= 0.01) {
          rings.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = r.alpha;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.lineWidth * r.alpha;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Gambar partikel pecahan kaca cair
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.16;
        p.vx *= 0.96;
        p.a -= p.decay;
        if (p.a <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.roundRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s, p.s * 0.35);
        ctx.fill();
        ctx.restore();
      }

      if (particles.length || rings.length) requestAnimationFrame(loop);
      else active = false;
    };

    return {
      burst(x, y, color, count = 8, glow = false) {
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
          const spd = 2.2 + Math.random() * (glow ? 5.2 : 4.2);
          particles.push({
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 1.3,
            s: (glow ? 4.8 : 4) + Math.random() * 3.5,
            color,
            glow,
            a: 0.96,
            decay: 0.024 + Math.random() * 0.015
          });
        }
        startLoop();
      },
      shockwave(x, y, color = '#ffd60a', maxRadius = 190) {
        rings.push({
          x,
          y,
          radius: 14,
          maxRadius,
          color,
          lineWidth: 5,
          alpha: 0.9,
          decay: 0.032
        });
        startLoop();
      }
    };
  })();

  /* =========================================================================
     DOM REFERENCES & GAME STATE
     ========================================================================= */
  const $ = id => document.getElementById(id);
  const el = {
    boardShell: $('board-shell'),
    boardGrid: $('board-grid'),
    dockSlots: Array.from(document.querySelectorAll('.dock-slot')),
    dragLayer: $('drag-layer'),
    dragGrid: $('drag-grid'),
    score: $('current-score'),
    highScore: $('high-score'),
    streak: $('streak-badge'),
    comboFlash: $('combo-flash'),
    floats: $('floating-texts'),
    modal: $('gameover-modal'),
    btnUndo: $('btn-undo'),
    btnRefresh: $('btn-refresh'),
    btnBomb: $('btn-bomb'),
    btnRescue: $('btn-rescue'),
    cntUndo: $('count-undo'),
    cntRefresh: $('count-refresh'),
    cntBomb: $('count-bomb')
  };

  let board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  let cellNodes = [];
  let dockPieces = [null, null, null];
  let historyStack = [];

  let score = 0;
  let shownScore = 0;
  let scoreAnimId = null;
  let highScore = parseInt(localStorage.getItem('bb_highscore') || '0', 10);
  let prevBest = parseInt(localStorage.getItem('bb_prev_best') || String(highScore), 10);
  let nextMilestone = 1000;
  let comboStreak = 0;
  let turnsNoClear = 0;
  let isGameOver = false;
  let bombMode = false;

  let powerups = { undo: 3, refresh: 3, bomb: 2 };

  let drag = {
    active: false,
    slot: -1,
    piece: null,
    isTouch: false,
    w: 0,
    h: 0,
    row: null,
    col: null
  };

  /* =========================================================================
     PERSISTENCE (AUTO-SAVE & RESUME KETIKA BROWSER DITUTUP)
     ========================================================================= */
  function saveGameState() {
    try {
      const payload = {
        board,
        dockPieces,
        score,
        prevBest,
        nextMilestone,
        comboStreak,
        turnsNoClear,
        powerups,
        historyStack: historyStack.slice(-10),
        isGameOver
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (_) {
      // Abaikan jika storage penuh / mode privat ketat
    }
  }

  function loadGameState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      if (
        !data ||
        !Array.isArray(data.board) ||
        data.board.length !== GRID_SIZE ||
        !Array.isArray(data.dockPieces) ||
        data.dockPieces.length !== 3 ||
        typeof data.score !== 'number' ||
        !data.powerups
      ) {
        return false;
      }

      board = data.board.map(row =>
        Array.isArray(row) && row.length === GRID_SIZE ? row.map(v => (typeof v === 'number' ? v : null)) : Array(GRID_SIZE).fill(null)
      );
      dockPieces = data.dockPieces.map(p =>
        p && Array.isArray(p.m) && typeof p.color === 'number' ? { m: p.m, color: p.color } : null
      );
      score = data.score;
      shownScore = score;
      prevBest = typeof data.prevBest === 'number' ? data.prevBest : highScore;
      nextMilestone = typeof data.nextMilestone === 'number' ? data.nextMilestone : Math.floor(score / 1000 + 1) * 1000;
      comboStreak = data.comboStreak || 0;
      turnsNoClear = data.turnsNoClear || 0;
      powerups = {
        undo: Number.isFinite(data.powerups.undo) ? data.powerups.undo : 3,
        refresh: Number.isFinite(data.powerups.refresh) ? data.powerups.refresh : 3,
        bomb: Number.isFinite(data.powerups.bomb) ? data.powerups.bomb : 2
      };
      historyStack = Array.isArray(data.historyStack) ? data.historyStack : [];
      isGameOver = Boolean(data.isGameOver);

      if (score > highScore) {
        highScore = score;
        localStorage.setItem('bb_highscore', String(highScore));
      }

      setBombMode(false);
      el.score.textContent = score.toLocaleString('id-ID');
      el.highScore.textContent = highScore.toLocaleString('id-ID');
      el.modal.hidden = true;

      updateStreakUI();
      renderBoard();
      renderDock(false);
      refreshDockState();
      updatePowerupUI();

      if (isGameOver) {
        showGameOverModal(true);
      } else {
        checkGameOver();
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /* =========================================================================
     RESPONSIVE LAYOUT & INITIALIZATION
     ========================================================================= */
  function updateSizing() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxH = vh - 295;
    const maxW = Math.min(vw - 36, 408);
    const size = Math.max(220, Math.min(maxW, maxH));
    const gap = size < 290 ? 3 : 4;
    const cell = Math.floor((size - 20 - gap * 7) / 8);

    document.documentElement.style.setProperty('--cell-size', `${cell}px`);
    document.documentElement.style.setProperty('--cell-gap', `${gap}px`);
  }

  function initGrid() {
    el.boardGrid.innerHTML = '';
    cellNodes = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const div = document.createElement('div');
        div.className = 'cell';
        div.dataset.r = r;
        div.dataset.c = c;
        el.boardGrid.appendChild(div);
        row.push(div);
      }
      cellNodes.push(row);
    }
  }

  /* =========================================================================
     BOARD-AWARE SMART PIECE GENERATOR
     ========================================================================= */
  function canPlace(matrix, sr, sc, target = board) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    if (sr < 0 || sc < 0 || sr + rows > GRID_SIZE || sc + cols > GRID_SIZE) return false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] && target[sr + r][sc + c] !== null) return false;
      }
    }
    return true;
  }

  function canPlaceAnywhere(matrix, target = board) {
    for (let r = 0; r <= GRID_SIZE - matrix.length; r++) {
      for (let c = 0; c <= GRID_SIZE - matrix[0].length; c++) {
        if (canPlace(matrix, r, c, target)) return true;
      }
    }
    return false;
  }

  function simulateMove(simBoard, matrix, sr, sc) {
    const next = simBoard.map(r => [...r]);
    let touches = 0;

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[0].length; c++) {
        if (!matrix[r][c]) continue;
        const br = sr + r;
        const bc = sc + c;
        next[br][bc] = 1;
        for (const [nr, nc] of [[br - 1, bc], [br + 1, bc], [br, bc - 1], [br, bc + 1]]) {
          if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || simBoard[nr][nc] !== null) {
            touches++;
          }
        }
      }
    }

    const fullR = [];
    const fullC = [];
    for (let r = 0; r < GRID_SIZE; r++) if (next[r].every(v => v !== null)) fullR.push(r);
    for (let c = 0; c < GRID_SIZE; c++) if (next.every(row => row[c] !== null)) fullC.push(c);

    fullR.forEach(r => next[r].fill(null));
    fullC.forEach(c => next.forEach(row => (row[c] = null)));

    return { board: next, cleared: fullR.length + fullC.length, touches };
  }

  function generateSynchronizedPieces(count) {
    let sim = board.map(r => [...r]);
    const result = [];

    for (let step = 0; step < count; step++) {
      const occupied = sim.flat().filter(v => v !== null).length;
      const fillRatio = occupied / 64;
      const candidates = [];

      for (const shape of SHAPES) {
        let bestScore = -1;
        let bestSim = null;

        for (let r = 0; r <= GRID_SIZE - shape.m.length; r++) {
          for (let c = 0; c <= GRID_SIZE - shape.m[0].length; c++) {
            if (!canPlace(shape.m, r, c, sim)) continue;
            const s = simulateMove(sim, shape.m, r, c);
            const val = s.cleared * 100 + s.touches * 3;
            if (val > bestScore) {
              bestScore = val;
              bestSim = s;
            }
          }
        }

        if (!bestSim) continue;
        let weight = shape.w;
        if (fillRatio > 0.5) {
          weight *= shape.cells <= 3 ? 2.5 : shape.cells >= 6 ? 0.25 : 1;
        }
        if (bestSim.cleared > 0) weight *= 3 + bestSim.cleared * 1.5;
        else if (bestSim.touches >= shape.cells * 2) weight *= 1.5;

        candidates.push({ shape, weight, sim: bestSim });
      }

      if (candidates.length) {
        const sum = candidates.reduce((a, b) => a + b.weight, 0);
        let rnd = Math.random() * sum;
        let chosen = candidates[0];
        for (const item of candidates) {
          if (rnd < item.weight) { chosen = item; break; }
          rnd -= item.weight;
        }
        result.push({ m: chosen.shape.m, color: Math.floor(Math.random() * COLORS.length) });
        sim = chosen.sim.board;
      } else {
        const fb = SHAPES[Math.floor(Math.random() * 5)];
        result.push({ m: fb.m, color: Math.floor(Math.random() * COLORS.length) });
      }
    }

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /* =========================================================================
     HISTORY (UNDO) & POWER-UPS (REFRESH & BOMB 3x3)
     ========================================================================= */
  function saveSnapshot() {
    historyStack.push({
      board: board.map(r => [...r]),
      dock: dockPieces.map(p => (p ? { m: p.m, color: p.color } : null)),
      score,
      comboStreak,
      turnsNoClear
    });
    if (historyStack.length > 15) historyStack.shift();
    updatePowerupUI();
  }

  function applyUndo() {
    if (!historyStack.length || powerups.undo <= 0) return;
    setBombMode(false);
    const snap = historyStack.pop();
    powerups.undo--;

    board = snap.board;
    dockPieces = snap.dock;
    score = snap.score;
    shownScore = score;
    comboStreak = snap.comboStreak;
    turnsNoClear = snap.turnsNoClear;
    isGameOver = false;

    el.modal.hidden = true;
    el.score.textContent = score.toLocaleString('id-ID');
    updateStreakUI();
    renderBoard();
    renderDock(true);
    refreshDockState();
    updatePowerupUI();
    saveGameState();
    SFX.undo();
  }

  function applyRefresh() {
    if (powerups.refresh <= 0 || isGameOver) return;
    setBombMode(false);
    saveSnapshot();
    powerups.refresh--;

    const activeIndices = dockPieces.map((p, i) => (p ? i : -1)).filter(i => i !== -1);
    const fresh = generateSynchronizedPieces(activeIndices.length || 3);

    if (activeIndices.length) {
      activeIndices.forEach((slotIdx, idx) => (dockPieces[slotIdx] = fresh[idx]));
    } else {
      dockPieces = fresh;
    }

    renderDock(true);
    refreshDockState();
    updatePowerupUI();
    SFX.refresh();
    checkGameOver();
    saveGameState();
  }

  function setBombMode(active) {
    if (active && (powerups.bomb <= 0 || isGameOver)) return;
    bombMode = active;
    el.boardShell.classList.toggle('bomb-active', bombMode);
    el.btnBomb.classList.toggle('active-mode', bombMode);
    if (!bombMode) clearHighlights();
  }

  function highlightBombArea(centerR, centerC) {
    clearHighlights();
    if (!bombMode || centerR === null || centerC === null) return;
    for (let r = centerR - 1; r <= centerR + 1; r++) {
      for (let c = centerC - 1; c <= centerC + 1; c++) {
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          cellNodes[r][c].classList.add('bomb-target');
        }
      }
    }
  }

  function detonateBomb(centerR, centerC) {
    if (!bombMode || powerups.bomb <= 0) return;
    saveSnapshot();
    powerups.bomb--;
    setBombMode(false);

    let destroyed = 0;
    let sumX = 0;
    let sumY = 0;

    for (let r = centerR - 1; r <= centerR + 1; r++) {
      for (let c = centerC - 1; c <= centerC + 1; c++) {
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
        const val = board[r][c];
        const rect = cellNodes[r][c].getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        if (val !== null) {
          FX.burst(cx, cy, COLORS[val], 11, true);
          board[r][c] = null;
          destroyed++;
          sumX += cx;
          sumY += cy;
        } else if (r === centerR && c === centerC) {
          FX.burst(cx, cy, '#ff453a', 9, true);
          sumX += cx;
          sumY += cy;
        }
      }
    }

    SFX.bomb();
    shakeBoard();
    renderBoard();

    if (destroyed > 0) {
      const pts = destroyed * 15;
      const midX = sumX / destroyed;
      const midY = sumY / destroyed;
      FX.shockwave(midX, midY, '#ff453a', 175);
      addScore(pts);
      spawnCallout(midX, midY, 0, 0, pts, 'BOOM!');
    }

    refreshDockState();
    updatePowerupUI();
    checkGameOver();
    saveGameState();
  }

  function updatePowerupUI() {
    el.cntUndo.textContent = powerups.undo;
    el.cntRefresh.textContent = powerups.refresh;
    el.cntBomb.textContent = powerups.bomb;

    el.btnUndo.disabled = powerups.undo <= 0 || historyStack.length === 0;
    el.btnRefresh.disabled = powerups.refresh <= 0 || isGameOver;
    el.btnBomb.disabled = powerups.bomb <= 0 || isGameOver;
  }

  /* =========================================================================
     RENDERING & INTERAKSI DRAG / BOMB
     ========================================================================= */
  function renderBoard() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = board[r][c];
        cellNodes[r][c].className = val === null ? 'cell' : `cell block-tile color-${val}`;
      }
    }
  }

  function clearHighlights() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = board[r][c];
        cellNodes[r][c].className = val === null ? 'cell' : `cell block-tile color-${val}`;
      }
    }
  }

  function updateGhostPreview(row, col) {
    if (drag.row === row && drag.col === col) return;
    drag.row = row;
    drag.col = col;
    clearHighlights();
    if (row === null || col === null || !drag.piece) return;

    const { m, color } = drag.piece;
    if (!canPlace(m, row, col)) return;

    const temp = board.map(r => [...r]);
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[0].length; c++) {
        if (m[r][c]) {
          temp[row + r][col + c] = color;
          cellNodes[row + r][col + c].classList.add('block-tile', `color-${color}`, 'ghost');
        }
      }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      if (temp[r].every(v => v !== null)) {
        for (let c = 0; c < GRID_SIZE; c++) cellNodes[r][c].classList.add('will-clear');
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (temp.every(rowArr => rowArr[c] !== null)) {
        for (let r = 0; r < GRID_SIZE; r++) cellNodes[r][c].classList.add('will-clear');
      }
    }
  }

  function renderDock(animate = false) {
    const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size')) || 40;
    const mini = Math.max(14, Math.floor(cell * 0.5));

    el.dockSlots.forEach((slot, idx) => {
      slot.innerHTML = '';
      const p = dockPieces[idx];
      if (!p) return;

      const wrap = document.createElement('div');
      wrap.className = 'piece-preview' + (animate ? ' spawn-anim' : '');
      wrap.style.gridTemplateColumns = `repeat(${p.m[0].length}, ${mini}px)`;
      wrap.style.gridTemplateRows = `repeat(${p.m.length}, ${mini}px)`;

      p.m.forEach(row => {
        row.forEach(v => {
          const d = document.createElement('div');
          d.className = v ? `mini-cell block-tile color-${p.color}` : 'mini-cell empty';
          d.style.width = `${mini}px`;
          d.style.height = `${mini}px`;
          wrap.appendChild(d);
        });
      });
      slot.appendChild(wrap);
    });
  }

  function refreshDockState() {
    el.dockSlots.forEach((slot, idx) => {
      const p = dockPieces[idx];
      slot.classList.toggle('unplaceable', Boolean(p && !canPlaceAnywhere(p.m)));
    });
  }

  function findSnapCell(matrix, exactR, exactC) {
    const br = Math.round(exactR);
    const bc = Math.round(exactC);
    if (canPlace(matrix, br, bc)) return { r: br, c: bc };

    let best = null;
    let minD = 0.48 * 0.48;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = br + dr;
        const nc = bc + dc;
        if (!canPlace(matrix, nr, nc)) continue;
        const d = (exactR - nr) ** 2 + (exactC - nc) ** 2;
        if (d <= minD) { minD = d; best = { r: nr, c: nc }; }
      }
    }
    return best;
  }

  function startPieceDrag(e, slotIdx) {
    if (isGameOver) return;
    if (bombMode) setBombMode(false);
    const piece = dockPieces[slotIdx];
    if (!piece) return;

    e.preventDefault();
    SFX.init();

    const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-gap'));

    el.dragGrid.innerHTML = '';
    el.dragGrid.style.gridTemplateColumns = `repeat(${piece.m[0].length}, ${cell}px)`;
    el.dragGrid.style.gridTemplateRows = `repeat(${piece.m.length}, ${cell}px)`;

    piece.m.forEach(row => {
      row.forEach(v => {
        const d = document.createElement('div');
        d.className = v ? `drag-cell block-tile color-${piece.color}` : 'drag-cell empty';
        el.dragGrid.appendChild(d);
      });
    });

    drag = {
      active: true,
      slot: slotIdx,
      piece,
      isTouch: e.pointerType === 'touch',
      w: piece.m[0].length * cell + (piece.m[0].length - 1) * gap,
      h: piece.m.length * cell + (piece.m.length - 1) * gap,
      row: null,
      col: null
    };

    const preview = el.dockSlots[slotIdx].querySelector('.piece-preview');
    if (preview) preview.style.opacity = '0';

    el.dragLayer.style.display = 'block';
    movePieceDrag(e);
    SFX.pickup();
  }

  function movePieceDrag(e) {
    if (!drag.active) return;
    e.preventDefault();

    const offsetY = drag.isTouch ? drag.h + 46 : drag.h / 2;
    const left = e.clientX - drag.w / 2;
    const top = e.clientY - offsetY;

    el.dragLayer.style.transform = `translate3d(${left}px, ${top}px, 0)`;

    const rect = el.boardGrid.getBoundingClientRect();
    const cell = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
    const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cell-gap'));
    const pitch = cell + gap;

    const snap = findSnapCell(drag.piece.m, (top - rect.top) / pitch, (left - rect.left) / pitch);
    updateGhostPreview(snap ? snap.r : null, snap ? snap.c : null);
  }

  function endPieceDrag() {
    if (!drag.active) return;
    const { slot, piece, row, col } = drag;

    el.dragLayer.style.display = 'none';
    clearHighlights();
    drag.active = false;
    drag.row = null;
    drag.col = null;

    if (row !== null && col !== null && canPlace(piece.m, row, col)) {
      placePiece(slot, piece, row, col);
    } else {
      const preview = el.dockSlots[slot].querySelector('.piece-preview');
      if (preview) preview.style.opacity = '1';
    }
  }

  /* =========================================================================
     PENEMPATAN BALOK, LINE CLEAR, EFEK COMBO & SKOR
     ========================================================================= */
  function triggerComboEffects(centerX, centerY, lines, combo, accentColor) {
    // 1. Gelombang kejut (shockwave) bercahaya pada canvas efek
    const waveColor = combo >= 3 ? '#ffd60a' : (combo >= 2 ? '#64d2ff' : accentColor);
    FX.shockwave(centerX, centerY, waveColor, 150 + Math.min(combo, 5) * 35);

    if (combo >= 2 || lines >= 2) {
      FX.shockwave(centerX, centerY, '#ffffff', 110 + lines * 25);

      // 2. Kilatan aura layar penuh & denyut cahaya papan
      el.comboFlash.classList.remove('trigger');
      void el.comboFlash.offsetWidth;
      el.comboFlash.classList.add('trigger');

      el.boardShell.classList.remove('combo-surge');
      void el.boardShell.offsetWidth;
      el.boardShell.classList.add('combo-surge');
    }
  }

  function placePiece(slotIdx, piece, sr, sc) {
    saveSnapshot();

    let count = 0;
    for (let r = 0; r < piece.m.length; r++) {
      for (let c = 0; c < piece.m[0].length; c++) {
        if (piece.m[r][c]) {
          board[sr + r][sc + c] = piece.color;
          count++;
        }
      }
    }

    dockPieces[slotIdx] = null;
    el.dockSlots[slotIdx].innerHTML = '';
    renderBoard();

    for (let r = 0; r < piece.m.length; r++) {
      for (let c = 0; c < piece.m[0].length; c++) {
        if (piece.m[r][c]) cellNodes[sr + r][sc + c].classList.add('placed-pop');
      }
    }

    SFX.place();
    let points = count * 10;

    const fullR = [];
    const fullC = [];
    for (let r = 0; r < GRID_SIZE; r++) if (board[r].every(v => v !== null)) fullR.push(r);
    for (let c = 0; c < GRID_SIZE; c++) if (board.every(row => row[c] !== null)) fullC.push(c);

    const lines = fullR.length + fullC.length;
    if (lines > 0) {
      turnsNoClear = 0;
      comboStreak++;

      const clearedSet = new Set();
      fullR.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) clearedSet.add(`${r},${c}`); });
      fullC.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) clearedSet.add(`${r},${c}`); });

      const isHighCombo = comboStreak >= 2 || lines >= 2;
      let sx = 0, sy = 0, n = 0;
      clearedSet.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const rect = cellNodes[r][c].getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        sx += cx; sy += cy; n++;
        FX.burst(cx, cy, COLORS[board[r][c] ?? piece.color], isHighCombo ? 12 : 8, isHighCombo);
        board[r][c] = null;
      });

      const midX = sx / n;
      const midY = sy / n;

      renderBoard();
      const base = [0, 100, 300, 600, 1000, 1500][Math.min(lines, 5)] + Math.max(0, lines - 5) * 500;
      const bonus = Math.round(base * (1 + (comboStreak - 1) * 0.5));
      points += bonus;

      SFX.clear(comboStreak);
      shakeBoard();
      triggerComboEffects(midX, midY, lines, comboStreak, COLORS[piece.color]);
      spawnCallout(midX, midY, lines, comboStreak, bonus);
    } else {
      turnsNoClear++;
      if (turnsNoClear >= 4) comboStreak = 0;
    }

    updateStreakUI(lines > 0 && comboStreak >= 2);
    addScore(points);

    if (dockPieces.every(p => p === null)) {
      dockPieces = generateSynchronizedPieces(3);
      renderDock(true);
    }

    refreshDockState();
    updatePowerupUI();
    checkGameOver();
    saveGameState();
  }

  function shakeBoard() {
    el.boardShell.classList.remove('shake');
    void el.boardShell.offsetWidth;
    el.boardShell.classList.add('shake');
  }

  function spawnCallout(x, y, lines, combo, points, customWord = '') {
    const words = ['', 'Bagus!', 'Hebat!', 'Luar Biasa!'];
    const word = customWord || (lines >= 4 ? 'Sempurna!' : (lines > 1 || combo >= 2 ? words[Math.min(lines, 3)] : ''));

    const div = document.createElement('div');
    div.className = 'float-callout';
    div.style.left = `${Math.max(85, Math.min(window.innerWidth - 85, x))}px`;
    div.style.top = `${Math.max(100, Math.min(window.innerHeight - 150, y))}px`;
    div.innerHTML =
      (word ? `<div class="float-word">${word}</div>` : '') +
      (combo >= 2 ? `<div class="float-combo">COMBO ×${combo}</div>` : '') +
      `<div class="float-points">+${points}</div>`;

    el.floats.appendChild(div);
    setTimeout(() => div.remove(), 900);
  }

  function addScore(amount) {
    score += amount;

    // Hadiah +1 bantuan setiap kelipatan 1.000 poin
    while (score >= nextMilestone) {
      nextMilestone += 1000;
      const keys = ['undo', 'refresh', 'bomb'];
      keys.sort((a, b) => powerups[a] - powerups[b]);
      if (powerups[keys[0]] < 5) {
        powerups[keys[0]]++;
        const names = { undo: '+1 Undo', refresh: '+1 Refresh', bomb: '+1 Bom' };
        spawnCallout(window.innerWidth / 2, 120, 0, 0, 0, names[keys[0]]);
      }
    }

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('bb_highscore', String(highScore));
      el.highScore.textContent = highScore.toLocaleString('id-ID');
    }

    el.score.classList.add('pulse');
    setTimeout(() => el.score.classList.remove('pulse'), 160);

    if (scoreAnimId) cancelAnimationFrame(scoreAnimId);
    const step = () => {
      const diff = score - shownScore;
      if (diff <= 0) {
        shownScore = score;
        el.score.textContent = shownScore.toLocaleString('id-ID');
        scoreAnimId = null;
        return;
      }
      shownScore += Math.max(1, Math.ceil(diff * 0.25));
      el.score.textContent = shownScore.toLocaleString('id-ID');
      scoreAnimId = requestAnimationFrame(step);
    };
    scoreAnimId = requestAnimationFrame(step);
  }

  function updateStreakUI(justIncremented = false) {
    const active = comboStreak >= 2;
    el.streak.textContent = comboStreak >= 4 ? `FEVER ×${comboStreak}` : `COMBO ×${comboStreak}`;
    el.streak.classList.toggle('active', active);
    el.boardShell.classList.toggle('combo-glow', active);

    document.body.classList.toggle('has-combo', active);
    document.body.classList.toggle('combo-high', comboStreak >= 4);

    if (justIncremented && active) {
      el.streak.classList.remove('pop');
      void el.streak.offsetWidth;
      el.streak.classList.add('pop');
    }
  }

  /* =========================================================================
     GAME OVER & RESET
     ========================================================================= */
  function showGameOverModal(immediate = false) {
    const present = () => {
      const isNew = score > 0 && score >= highScore && score > prevBest;
      localStorage.setItem('bb_prev_best', String(highScore));

      $('final-score').textContent = score.toLocaleString('id-ID');
      $('final-best').textContent = highScore.toLocaleString('id-ID');
      $('new-best-pill').hidden = !isNew;

      const canRescue = (powerups.undo > 0 && historyStack.length > 0) || powerups.refresh > 0 || powerups.bomb > 0;
      el.btnRescue.hidden = !canRescue;
      el.modal.hidden = false;
    };

    if (immediate) present();
    else setTimeout(present, 360);
  }

  function checkGameOver() {
    const active = dockPieces.filter(Boolean);
    if (!active.length || active.some(p => canPlaceAnywhere(p.m))) return;

    isGameOver = true;
    setBombMode(false);
    updatePowerupUI();
    saveGameState();
    SFX.over();
    showGameOverModal(false);
  }

  function resetGame() {
    board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
    historyStack = [];
    score = 0;
    shownScore = 0;
    prevBest = highScore;
    nextMilestone = 1000;
    comboStreak = 0;
    turnsNoClear = 0;
    isGameOver = false;
    powerups = { undo: 3, refresh: 3, bomb: 2 };

    setBombMode(false);
    localStorage.setItem('bb_prev_best', String(highScore));
    el.score.textContent = '0';
    el.highScore.textContent = highScore.toLocaleString('id-ID');
    el.modal.hidden = true;

    updateStreakUI();
    renderBoard();
    dockPieces = generateSynchronizedPieces(3);
    renderDock(true);
    refreshDockState();
    updatePowerupUI();
    saveGameState();
  }

  /* =========================================================================
     EVENT DELEGATION & KEYBOARD SHORTCUTS (DESKTOP & MOBILE)
     ========================================================================= */
  el.dockSlots.forEach((slot, idx) => {
    slot.addEventListener('pointerdown', e => startPieceDrag(e, idx));
  });

  window.addEventListener('pointermove', movePieceDrag, { passive: false });
  window.addEventListener('pointerup', endPieceDrag);
  window.addEventListener('pointercancel', endPieceDrag);
  window.addEventListener('blur', endPieceDrag);

  // Simpan otomatis saat aplikasi pindah latar belakang / ditutup
  window.addEventListener('pagehide', saveGameState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGameState();
  });

  // Interaksi Bom pada Papan 8x8 (Hover Preview & Tap Detonate)
  el.boardGrid.addEventListener('pointermove', e => {
    if (!bombMode) return;
    const cell = e.target.closest('.cell');
    if (cell) highlightBombArea(Number(cell.dataset.r), Number(cell.dataset.c));
    else clearHighlights();
  });

  el.boardGrid.addEventListener('pointerleave', () => {
    if (bombMode) clearHighlights();
  });

  el.boardGrid.addEventListener('pointerdown', e => {
    if (!bombMode) return;
    const cell = e.target.closest('.cell');
    if (cell) detonateBomb(Number(cell.dataset.r), Number(cell.dataset.c));
  });

  // Tombol Kontrol & Power-Ups
  el.btnUndo.addEventListener('click', applyUndo);
  el.btnRefresh.addEventListener('click', applyRefresh);
  el.btnBomb.addEventListener('click', () => setBombMode(!bombMode));
  $('btn-restart').addEventListener('click', () => { SFX.pickup(); resetGame(); });
  $('btn-play-again').addEventListener('click', () => { SFX.pickup(); resetGame(); });

  el.btnRescue.addEventListener('click', () => {
    el.modal.hidden = true;
    isGameOver = false;
    updatePowerupUI();
    saveGameState();
    if (powerups.bomb > 0) setBombMode(true);
    else if (powerups.refresh > 0) applyRefresh();
    else if (powerups.undo > 0 && historyStack.length > 0) applyUndo();
  });

  $('btn-mute').addEventListener('click', () => {
    SFX.muted = !SFX.muted;
    localStorage.setItem('bb_muted', SFX.muted ? '1' : '0');
    $('icon-sound-on').hidden = SFX.muted;
    $('icon-sound-off').hidden = !SFX.muted;
  });

  // Shortcut Keyboard untuk Desktop
  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'z') applyUndo();
    else if (key === 'r') applyRefresh();
    else if (key === 'b') setBombMode(!bombMode);
    else if (key === 'escape' && bombMode) setBombMode(false);
  });

  window.addEventListener('resize', () => {
    updateSizing();
    renderDock(false);
  });

  // Start & Pulihkan Sesi Terakhir Jika Ada
  $('icon-sound-on').hidden = SFX.muted;
  $('icon-sound-off').hidden = !SFX.muted;
  updateSizing();
  initGrid();
  if (!loadGameState()) {
    resetGame();
  }
})();