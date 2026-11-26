(() => {
  'use strict';

  const GRID_SIZE = 8;
  const SAVE_KEY = 'bb_saved_session_v1';
  const THEME_KEY = 'bb_theme_v1';
  const LOW_FX_KEY = 'bb_low_fx_v1';
  const COLORS = ['#ff453a', '#ff9f0a', '#ffd60a', '#30d158', '#5ac8fa', '#0a84ff', '#bf5af2', '#ff375f'];

  const THEME_META = {
    lite:   { bg: '#11141d', pixelParticles: false },
    pixel:  { bg: '#161426', pixelParticles: true },
    amoled: { bg: '#000000', pixelParticles: false },
    wood:   { bg: '#1b120c', pixelParticles: false },
    liquid: { bg: '#06070c', pixelParticles: false }
  };

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
     SISTEM TEMA & MODE HEMAT PERFORMA
     ========================================================================= */
  let currentTheme = localStorage.getItem(THEME_KEY) || 'liquid';
  if (!THEME_META[currentTheme]) currentTheme = 'liquid';
  let lowFxMode = localStorage.getItem(LOW_FX_KEY) === '1';

  function applyTheme(themeName) {
    if (!THEME_META[themeName]) themeName = 'liquid';
    currentTheme = themeName;
    document.documentElement.dataset.theme = themeName;
    localStorage.setItem(THEME_KEY, themeName);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', THEME_META[themeName].bg);

    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeVal === themeName);
    });
  }

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
    tone(freq, endFreq, dur, type = 'sine', vol = 0.13, delay = 0) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = currentTheme === 'pixel' ? 'square' : type;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    pickup() { this.tone(360, 540, 0.06, 'sine', 0.09); },
    place() { this.tone(210, 95, 0.08, 'triangle', 0.15); },
    undo() { this.tone(480, 290, 0.09, 'sine', 0.11); },
    refresh() {
      this.tone(420, 620, 0.06, 'sine', 0.09, 0);
      this.tone(540, 760, 0.07, 'sine', 0.09, 0.05);
    },
    bomb() {
      this.tone(150, 38, 0.28, 'sawtooth', 0.2, 0);
      this.tone(95, 30, 0.32, 'triangle', 0.2, 0.02);
    },
    clear(combo) {
      const mult = Math.pow(2, Math.min(combo, 10) / 12);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this.tone(f * mult, f * mult * 1.03, 0.24, 'sine', 0.13, i * 0.032);
      });
    },
    over() {
      [392, 349.23, 329.63, 261.63].forEach((f, i) => {
        this.tone(f, f * 0.96, 0.2, 'triangle', 0.09, i * 0.11);
      });
    }
  };

  /* =========================================================================
     PARTICLE SYSTEM RINGAN (TANPA SHADOWBLUR, CAPPED DPR & PARTICLE POOL)
     ========================================================================= */
  const FX = (() => {
    const canvas = document.getElementById('fx-canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    const MAX_PARTICLES = 85;
    let particles = [];
    let rings = [];
    let active = false;
    let vw = window.innerWidth;
    let vh = window.innerHeight;

    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
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
      ctx.clearRect(0, 0, vw, vh);

      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.radius += (r.maxRadius - r.radius) * 0.16;
        r.alpha -= r.decay;
        if (r.alpha <= 0.02) {
          rings.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = r.alpha;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.lineWidth * r.alpha;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      const isPixel = THEME_META[currentTheme]?.pixelParticles;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.vx *= 0.95;
        p.a -= p.decay;
        if (p.a <= 0.02) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.color;
        const half = p.s * 0.5;
        if (isPixel) {
          ctx.fillRect((p.x - half) | 0, (p.y - half) | 0, p.s | 0, p.s | 0);
        } else {
          ctx.fillRect(p.x - half, p.y - half, p.s, p.s);
        }
      }

      ctx.globalAlpha = 1;
      if (particles.length || rings.length) requestAnimationFrame(loop);
      else active = false;
    };

    return {
      burst(x, y, color, count = 6) {
        const isLite = currentTheme === 'lite' || lowFxMode;
        const actualCount = isLite ? Math.max(2, Math.ceil(count * 0.35)) : count;
        const available = MAX_PARTICLES - particles.length;
        const spawnCount = Math.min(actualCount, Math.max(0, available));

        for (let i = 0; i < spawnCount; i++) {
          const ang = (Math.PI * 2 * i) / spawnCount + (Math.random() - 0.5) * 0.5;
          const spd = 2 + Math.random() * 3.8;
          particles.push({
            x, y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 1.2,
            s: currentTheme === 'pixel' ? 6 : 4 + Math.random() * 3,
            color,
            a: 0.95,
            decay: isLite ? 0.038 : 0.028 + Math.random() * 0.015
          });
        }
        if (spawnCount > 0) startLoop();
      },
      shockwave(x, y, color = '#ffd60a', maxRadius = 175) {
        if (currentTheme === 'lite' || lowFxMode) return;
        rings.push({
          x, y,
          radius: 14,
          maxRadius,
          color,
          lineWidth: 4,
          alpha: 0.85,
          decay: 0.038
        });
        startLoop();
      }
    };
  })();

  /* =========================================================================
     DOM REFERENCES, CACHED METRICS & GAME STATE
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
    themeModal: $('theme-modal'),
    toggleLowFx: $('toggle-low-fx'),
    btnUndo: $('btn-undo'),
    btnRefresh: $('btn-refresh'),
    btnBomb: $('btn-bomb'),
    btnRescue: $('btn-rescue'),
    cntUndo: $('count-undo'),
    cntRefresh: $('count-refresh'),
    cntBomb: $('count-bomb')
  };

  // Cache ukuran & posisi papan agar nol DOM reflow saat drag di HP
  const metrics = {
    cell: 40,
    gap: 4,
    pitch: 44,
    boardLeft: 0,
    boardTop: 0
  };

  let board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  let cellNodes = [];
  let cellClassCache = Array(GRID_SIZE * GRID_SIZE).fill('');
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
     AUTO-SAVE & LOAD SESSION
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
    } catch (_) {}
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

      if (isGameOver) showGameOverModal(true);
      else checkGameOver();
      return true;
    } catch (_) {
      return false;
    }
  }

  /* =========================================================================
     SIZING & INITIALIZATION
     ========================================================================= */
  function refreshBoardRect() {
    const rect = el.boardGrid.getBoundingClientRect();
    metrics.boardLeft = rect.left;
    metrics.boardTop = rect.top;
  }

  function updateSizing() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxH = vh - 275;
    const maxW = Math.min(vw - 32, 408);
    const size = Math.max(220, Math.min(maxW, maxH));
    const gap = size < 290 ? 3 : 4;
    const cell = Math.floor((size - 18 - gap * 7) / 8);

    metrics.cell = cell;
    metrics.gap = gap;
    metrics.pitch = cell + gap;

    document.documentElement.style.setProperty('--cell-size', `${cell}px`);
    document.documentElement.style.setProperty('--cell-gap', `${gap}px`);
    requestAnimationFrame(refreshBoardRect);
  }

  function initGrid() {
    el.boardGrid.innerHTML = '';
    cellNodes = [];
    cellClassCache.fill('');
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

  function setCellClass(r, c, cls) {
    const idx = r * GRID_SIZE + c;
    if (cellClassCache[idx] !== cls) {
      cellClassCache[idx] = cls;
      cellNodes[r][c].className = cls;
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
        if (br === 0 || simBoard[br - 1][bc] !== null) touches++;
        if (br === GRID_SIZE - 1 || simBoard[br + 1][bc] !== null) touches++;
        if (bc === 0 || simBoard[br][bc - 1] !== null) touches++;
        if (bc === GRID_SIZE - 1 || simBoard[br][bc + 1] !== null) touches++;
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
      let occupied = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) if (sim[r][c] !== null) occupied++;
      }
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
          const val = board[r][c];
          const base = val === null ? 'cell' : `cell block-tile color-${val}`;
          setCellClass(r, c, `${base} bomb-target`);
        }
      }
    }
  }

  function detonateBomb(centerR, centerC) {
    if (!bombMode || powerups.bomb <= 0) return;
    saveSnapshot();
    powerups.bomb--;
    setBombMode(false);

    refreshBoardRect();
    const { pitch, cell } = metrics;
    let destroyed = 0;
    let sumX = 0;
    let sumY = 0;

    for (let r = centerR - 1; r <= centerR + 1; r++) {
      for (let c = centerC - 1; c <= centerC + 1; c++) {
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
        const val = board[r][c];
        const cx = metrics.boardLeft + c * pitch + cell * 0.5;
        const cy = metrics.boardTop + r * pitch + cell * 0.5;

        if (val !== null) {
          FX.burst(cx, cy, COLORS[val], 8);
          board[r][c] = null;
          destroyed++;
          sumX += cx;
          sumY += cy;
        } else if (r === centerR && c === centerC) {
          FX.burst(cx, cy, '#ff453a', 6);
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
      FX.shockwave(midX, midY, '#ff453a', 165);
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
     RENDERING & FAST GHOST PREVIEW (ZERO CLONING)
     ========================================================================= */
  function renderBoard() {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = board[r][c];
        setCellClass(r, c, val === null ? 'cell' : `cell block-tile color-${val}`);
      }
    }
  }

  function clearHighlights() {
    renderBoard();
  }

  function updateGhostPreview(row, col) {
    if (drag.row === row && drag.col === col) return;
    drag.row = row;
    drag.col = col;
    clearHighlights();
    if (row === null || col === null || !drag.piece) return;

    const { m, color } = drag.piece;
    const pRows = m.length;
    const pCols = m[0].length;
    if (!canPlace(m, row, col)) return;

    const fullRows = new Uint8Array(GRID_SIZE);
    const fullCols = new Uint8Array(GRID_SIZE);

    for (let r = row; r < row + pRows; r++) {
      let full = true;
      for (let c = 0; c < GRID_SIZE; c++) {
        const covered = c >= col && c < col + pCols && m[r - row][c - col] === 1;
        if (board[r][c] === null && !covered) { full = false; break; }
      }
      if (full) fullRows[r] = 1;
    }

    for (let c = col; c < col + pCols; c++) {
      let full = true;
      for (let r = 0; r < GRID_SIZE; r++) {
        const covered = r >= row && r < row + pRows && m[r - row][c - col] === 1;
        if (board[r][c] === null && !covered) { full = false; break; }
      }
      if (full) fullCols[c] = 1;
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const isGhost = r >= row && r < row + pRows && c >= col && c < col + pCols && m[r - row][c - col] === 1;
        const willClear = fullRows[r] === 1 || fullCols[c] === 1;
        if (!isGhost && !willClear) continue;

        if (isGhost) {
          setCellClass(r, c, `cell block-tile color-${color} ghost${willClear ? ' will-clear' : ''}`);
        } else {
          const val = board[r][c];
          setCellClass(r, c, `cell block-tile color-${val} will-clear`);
        }
      }
    }
  }

  function renderDock(animate = false) {
    const mini = Math.max(14, Math.floor(metrics.cell * 0.5));

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
    refreshBoardRect();

    const { cell, gap } = metrics;
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

    const offsetY = drag.isTouch ? drag.h + 44 : drag.h * 0.5;
    const left = e.clientX - drag.w * 0.5;
    const top = e.clientY - offsetY;

    el.dragLayer.style.transform = `translate3d(${left}px, ${top}px, 0)`;

    const snap = findSnapCell(
      drag.piece.m,
      (top - metrics.boardTop) / metrics.pitch,
      (left - metrics.boardLeft) / metrics.pitch
    );
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
    const waveColor = combo >= 3 ? '#ffd60a' : (combo >= 2 ? '#5ac8fa' : accentColor);
    FX.shockwave(centerX, centerY, waveColor, 150 + Math.min(combo, 4) * 30);

    if (currentTheme === 'liquid' && (combo >= 2 || lines >= 2)) {
      el.comboFlash.classList.remove('trigger');
      void el.comboFlash.offsetWidth;
      el.comboFlash.classList.add('trigger');
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

    if (currentTheme !== 'lite') {
      for (let r = 0; r < piece.m.length; r++) {
        for (let c = 0; c < piece.m[0].length; c++) {
          if (piece.m[r][c]) cellNodes[sr + r][sc + c].classList.add('placed-pop');
        }
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
      refreshBoardRect();

      const clearedSet = new Set();
      fullR.forEach(r => { for (let c = 0; c < GRID_SIZE; c++) clearedSet.add(r * GRID_SIZE + c); });
      fullC.forEach(c => { for (let r = 0; r < GRID_SIZE; r++) clearedSet.add(r * GRID_SIZE + c); });

      const { pitch, cell } = metrics;
      let sx = 0, sy = 0, n = 0;
      clearedSet.forEach(idx => {
        const r = (idx / GRID_SIZE) | 0;
        const c = idx % GRID_SIZE;
        const cx = metrics.boardLeft + c * pitch + cell * 0.5;
        const cy = metrics.boardTop + r * pitch + cell * 0.5;
        sx += cx; sy += cy; n++;
        FX.burst(cx, cy, COLORS[board[r][c] ?? piece.color], 6);
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

    updateStreakUI();
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
    if (currentTheme === 'lite') return;
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
    div.style.top = `${Math.max(95, Math.min(window.innerHeight - 140, y))}px`;
    div.innerHTML =
      (word ? `<div class="float-word">${word}</div>` : '') +
      (combo >= 2 ? `<div class="float-combo">COMBO ×${combo}</div>` : '') +
      `<div class="float-points">+${points}</div>`;

    el.floats.appendChild(div);
    setTimeout(() => div.remove(), 850);
  }

  function addScore(amount) {
    score += amount;

    while (score >= nextMilestone) {
      nextMilestone += 1000;
      const keys = ['undo', 'refresh', 'bomb'];
      keys.sort((a, b) => powerups[a] - powerups[b]);
      if (powerups[keys[0]] < 5) {
        powerups[keys[0]]++;
        const names = { undo: '+1 Undo', refresh: '+1 Refresh', bomb: '+1 Bom' };
        spawnCallout(window.innerWidth / 2, 115, 0, 0, 0, names[keys[0]]);
      }
    }

    if (score > highScore) {
      highScore = score;
      localStorage.setItem('bb_highscore', String(highScore));
      el.highScore.textContent = highScore.toLocaleString('id-ID');
    }

    el.score.classList.add('pulse');
    setTimeout(() => el.score.classList.remove('pulse'), 150);

    if (scoreAnimId) cancelAnimationFrame(scoreAnimId);
    const step = () => {
      const diff = score - shownScore;
      if (diff <= 0) {
        shownScore = score;
        el.score.textContent = shownScore.toLocaleString('id-ID');
        scoreAnimId = null;
        return;
      }
      shownScore += Math.max(1, Math.ceil(diff * 0.28));
      el.score.textContent = shownScore.toLocaleString('id-ID');
      scoreAnimId = requestAnimationFrame(step);
    };
    scoreAnimId = requestAnimationFrame(step);
  }

  function updateStreakUI() {
    const active = comboStreak >= 2;
    el.streak.textContent = comboStreak >= 4 ? `FEVER ×${comboStreak}` : `COMBO ×${comboStreak}`;
    el.streak.classList.toggle('active', active);
    el.boardShell.classList.toggle('combo-glow', active);
    document.body.classList.toggle('has-combo', active);
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
    else setTimeout(present, 320);
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
     EVENT LISTENERS & PEMILIH TEMA
     ========================================================================= */
  el.dockSlots.forEach((slot, idx) => {
    slot.addEventListener('pointerdown', e => startPieceDrag(e, idx));
  });

  window.addEventListener('pointermove', movePieceDrag, { passive: false });
  window.addEventListener('pointerup', endPieceDrag);
  window.addEventListener('pointercancel', endPieceDrag);
  window.addEventListener('blur', endPieceDrag);

  window.addEventListener('pagehide', saveGameState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGameState();
  });

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

  // Modal Tema
  $('btn-theme').addEventListener('click', () => {
    SFX.pickup();
    el.themeModal.hidden = false;
  });

  $('btn-close-theme').addEventListener('click', () => {
    el.themeModal.hidden = true;
  });

  el.themeModal.addEventListener('pointerdown', e => {
    if (e.target === el.themeModal) el.themeModal.hidden = true;
  });

  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      SFX.pickup();
      applyTheme(btn.dataset.themeVal);
      renderBoard();
      renderDock(false);
    });
  });

  el.toggleLowFx.checked = lowFxMode;
  el.toggleLowFx.addEventListener('change', () => {
    lowFxMode = el.toggleLowFx.checked;
    localStorage.setItem(LOW_FX_KEY, lowFxMode ? '1' : '0');
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

  window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (key === 'z') applyUndo();
    else if (key === 'r') applyRefresh();
    else if (key === 'b') setBombMode(!bombMode);
    else if (key === 't') el.themeModal.hidden = !el.themeModal.hidden;
    else if (key === 'escape') {
      if (!el.themeModal.hidden) el.themeModal.hidden = true;
      else if (bombMode) setBombMode(false);
    }
  });

  window.addEventListener('resize', () => {
    updateSizing();
    renderDock(false);
  });

  // Inisialisasi
  applyTheme(currentTheme);
  $('icon-sound-on').hidden = SFX.muted;
  $('icon-sound-off').hidden = !SFX.muted;
  updateSizing();
  initGrid();
  if (!loadGameState()) {
    resetGame();
  }
})();