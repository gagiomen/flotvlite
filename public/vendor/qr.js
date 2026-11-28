/* Pure ISO/IEC 18004 QR Code canvas renderer (Byte mode, ECC Level L, Versions 1..6) */
(function (global) {
  const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172];
  const EC_CODEWORDS_L = [0, 7, 10, 15, 20, 26, 36];
  const NUM_BLOCKS_L = [0, 1, 1, 1, 1, 1, 2];
  const ALIGN = { 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];

  function gfMul(a, b) {
    return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsCompute(data, ecLen) {
    const gen = new Uint8Array(ecLen + 1);
    gen[0] = 1;
    for (let i = 0; i < ecLen; i++) {
      const root = GF_EXP[i];
      for (let j = i + 1; j >= 1; j--) gen[j] ^= gfMul(gen[j - 1], root);
    }
    const rem = new Uint8Array(ecLen);
    for (const b of data) {
      const factor = b ^ rem[0];
      for (let j = 0; j < ecLen - 1; j++) rem[j] = rem[j + 1];
      rem[ecLen - 1] = 0;
      for (let j = 0; j < ecLen; j++) rem[j] ^= gfMul(gen[j + 1], factor);
    }
    return rem;
  }

  function encodeDataAndEc(bytes, version) {
    const totalCw = TOTAL_CODEWORDS[version];
    const ecTotal = EC_CODEWORDS_L[version];
    const dataCwCount = totalCw - ecTotal;
    const bits = [];
    const pushBits = (val, len) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };
    pushBits(0b0100, 4);
    pushBits(bytes.length, 8);
    for (const b of bytes) pushBits(b, 8);
    const term = Math.min(4, dataCwCount * 8 - bits.length);
    pushBits(0, term);
    while (bits.length % 8 !== 0) bits.push(0);

    const dataCw = new Uint8Array(dataCwCount);
    for (let i = 0; i < bits.length / 8; i++) {
      let v = 0;
      for (let b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b];
      dataCw[i] = v;
    }
    for (let i = bits.length / 8, pad = 0; i < dataCwCount; i++, pad++) {
      dataCw[i] = pad % 2 === 0 ? 0xec : 0x11;
    }

    const numBlocks = NUM_BLOCKS_L[version];
    const bDataLen = dataCwCount / numBlocks;
    const bEcLen = ecTotal / numBlocks;
    const dBlocks = [];
    const eBlocks = [];
    for (let b = 0; b < numBlocks; b++) {
      const slice = dataCw.slice(b * bDataLen, (b + 1) * bDataLen);
      dBlocks.push(slice);
      eBlocks.push(rsCompute(slice, bEcLen));
    }
    const out = new Uint8Array(totalCw);
    let idx = 0;
    for (let i = 0; i < bDataLen; i++) for (let b = 0; b < numBlocks; b++) out[idx++] = dBlocks[b][i];
    for (let i = 0; i < bEcLen; i++) for (let b = 0; b < numBlocks; b++) out[idx++] = eBlocks[b][i];
    return out;
  }

  function makeMatrix(dim) {
    return Array.from({ length: dim }, () => new Uint8Array(dim));
  }

  function buildQrGrid(text) {
    const data = new TextEncoder().encode(text);
    let version = -1;
    for (let v = 1; v <= 6; v++) {
      if (data.length + 2 <= TOTAL_CODEWORDS[v] - EC_CODEWORDS_L[v]) { version = v; break; }
    }
    if (version < 0) return null;

    const dim = version * 4 + 17;
    const allCw = encodeDataAndEc(data, version);
    const mod = makeMatrix(dim);
    const fn = makeMatrix(dim);
    const setF = (r, c, v) => { mod[r][c] = v ? 1 : 0; fn[r][c] = 1; };

    const finder = (r0, c0) => {
      for (let dr = 0; dr < 7; dr++) {
        for (let dc = 0; dc < 7; dc++) {
          const dark = dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
          setF(r0 + dr, c0 + dc, dark);
        }
      }
    };
    finder(0, 0); finder(dim - 7, 0); finder(0, dim - 7);
    for (let i = 0; i < 8; i++) {
      fn[7][i] = fn[i][7] = fn[7][dim - 1 - i] = fn[i][dim - 8] = fn[dim - 8][i] = fn[dim - 1 - i][7] = 1;
    }
    for (let i = 8; i < dim - 8; i++) {
      if (!fn[6][i]) setF(6, i, i % 2 === 0);
      if (!fn[i][6]) setF(i, 6, i % 2 === 0);
    }
    if (ALIGN[version]) {
      for (const r of ALIGN[version]) {
        for (const c of ALIGN[version]) {
          if (fn[r][c]) continue;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) setF(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
          }
        }
      }
    }
    for (let i = 0; i <= 8; i++) if (i !== 6) fn[8][i] = fn[i][8] = 1;
    for (let i = 0; i < 8; i++) { fn[8][dim - 1 - i] = 1; if (i < 7) fn[dim - 1 - i][8] = 1; }
    setF(dim - 8, 8, 1);

    let bitIdx = 0;
    const totalBits = allCw.length * 8;
    let dir = -1;
    for (let right = dim - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < dim; step++) {
        const r = dir === -1 ? dim - 1 - step : step;
        for (let off = 0; off < 2; off++) {
          const c = right - off;
          if (!fn[r][c]) {
            let bit = 0;
            if (bitIdx < totalBits) {
              bit = (allCw[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
              bitIdx++;
            }
            mod[r][c] = bit;
          }
        }
      }
      dir = -dir;
    }

    const maskFns = [
      (r, c) => (r + c) % 2 === 0,
      (r) => r % 2 === 0,
      (_, c) => c % 3 === 0,
      (r, c) => (r + c) % 3 === 0,
      (r, c) => ((r >> 1) + Math.floor(c / 3)) % 2 === 0,
      (r, c) => (r * c) % 2 + ((r * c) % 3) === 0,
      (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
      (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
    ];

    let bestGrid = null;
    let bestPen = 1e9;
    for (let mask = 0; mask < 8; mask++) {
      const g = mod.map((row) => new Uint8Array(row));
      const mFn = maskFns[mask];
      for (let r = 0; r < dim; r++) for (let c = 0; c < dim; c++) if (!fn[r][c] && mFn(r, c)) g[r][c] ^= 1;

      const fData = (0b01 << 3) | mask;
      let rem = fData;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >> 9) & 1) * 0x537);
      const fmt = ((fData << 10) | rem) ^ 0x5412;
      for (let i = 0; i <= 5; i++) g[i][8] = (fmt >> i) & 1;
      g[7][8] = (fmt >> 6) & 1; g[8][8] = (fmt >> 7) & 1; g[8][7] = (fmt >> 8) & 1;
      for (let i = 9; i < 15; i++) g[8][14 - i] = (fmt >> i) & 1;
      for (let i = 0; i < 8; i++) g[8][dim - 1 - i] = (fmt >> i) & 1;
      for (let i = 8; i < 15; i++) g[dim - 15 + i][8] = (fmt >> i) & 1;

      let pen = 0;
      for (let r = 0; r < dim; r++) {
        let run = 1;
        for (let c = 1; c < dim; c++) {
          if (g[r][c] === g[r][c - 1]) { run++; if (run === 5) pen += 3; else if (run > 5) pen += 1; } else run = 1;
        }
      }
      for (let c = 0; c < dim; c++) {
        let run = 1;
        for (let r = 1; r < dim; r++) {
          if (g[r][c] === g[r - 1][c]) { run++; if (run === 5) pen += 3; else if (run > 5) pen += 1; } else run = 1;
        }
      }
      for (let r = 0; r < dim - 1; r++) {
        for (let c = 0; c < dim - 1; c++) {
          const v = g[r][c];
          if (g[r][c + 1] === v && g[r + 1][c] === v && g[r + 1][c + 1] === v) pen += 3;
        }
      }
      if (pen < bestPen) { bestPen = pen; bestGrid = g; }
    }
    return bestGrid;
  }

  global.renderFloQr = function (canvas, text) {
    if (!canvas || !text) return false;
    const grid = buildQrGrid(String(text));
    if (!grid) return false;
    const dim = grid.length;
    const quiet = 4;
    const total = dim + quiet * 2;
    const size = Math.max(180, canvas.width || 220);
    const scale = Math.max(3, Math.floor(size / total));
    const px = total * scale;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        if (grid[r][c]) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
      }
    }
    return true;
  };
})(window);
