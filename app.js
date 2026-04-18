/* ── State ── */
let loadedFiles = {};
let activeTab = null;
let chartInstances = {};

/* ── DOM refs ── */
const dropZone   = document.getElementById('dropZone');
const fileInput  = document.getElementById('fileIn');
const fileList   = document.getElementById('fileList');
const runBtn     = document.getElementById('runBtn');
const uploadSec  = document.getElementById('uploadSection');
const resultsSec = document.getElementById('resultsSection');

/* ── Drag & Drop ── */
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => handleFiles(e.target.files));

/* ── File Handling ── */
function handleFiles(files) {
  [...files].forEach(file => {
    if (!file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const parsed = Papa.parse(e.target.result, {
        header: true, dynamicTyping: true, skipEmptyLines: true
      });
      const key = file.name;
      loadedFiles[key] = {
        key,
        name: file.name.replace(/\.csv$/i, ''),
        size: file.size,
        data: parsed.data,
        fields: parsed.meta.fields || []
      };
      renderFileList();
    };
    reader.readAsText(file);
  });
}

function renderFileList() {
  fileList.innerHTML = Object.values(loadedFiles).map(f => `
    <div class="file-item" id="fi_${CSS.escape(f.key)}">
      <div class="file-dot"></div>
      <span class="file-name">${f.name}</span>
      <span class="file-rows">${f.data.length} rows</span>
      <button class="file-rm" onclick="removeFile('${f.key.replace(/'/g,"\\'")}')">×</button>
    </div>
  `).join('');
  runBtn.disabled = Object.keys(loadedFiles).length === 0;
}

function removeFile(key) {
  delete loadedFiles[key];
  renderFileList();
}

/* ── Reset ── */
function resetAll() {
  destroyCharts();
  loadedFiles = {};
  activeTab = null;
  fileList.innerHTML = '';
  runBtn.disabled = true;
  fileInput.value = '';
  resultsSec.style.display = 'none';
  uploadSec.style.display = '';
}

/* ── Run Analysis ── */
runBtn.addEventListener('click', runAnalysis);

function runAnalysis() {
  const files = Object.values(loadedFiles);
  if (!files.length) return;

  destroyCharts();
  uploadSec.style.display = 'none';
  resultsSec.style.display = '';

  renderSummaryCards(files);
  renderTabs(files);
  activeTab = files[0].key;
  renderTabContent(files[0].key);
}

/* ── Summary Cards ── */
function renderSummaryCards(files) {
  const totalRows  = files.reduce((s, f) => s + f.data.length, 0);
  const totalCols  = files.reduce((s, f) => s + f.fields.length, 0);
  const totalMiss  = files.reduce((s, f) => s + countMissing(f.data, f.fields), 0);
  const totalCells = files.reduce((s, f) => s + f.data.length * f.fields.length, 0);
  const missRate   = totalCells > 0 ? (totalMiss / totalCells * 100).toFixed(1) : 0;

  document.getElementById('summaryCards').innerHTML = `
    <div class="summary-card">
      <div class="summary-card-label">数据文件</div>
      <div class="summary-card-value">${files.length}</div>
      <div class="summary-card-sub">已加载</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">总行数</div>
      <div class="summary-card-value">${totalRows.toLocaleString()}</div>
      <div class="summary-card-sub">条记录</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">总列数</div>
      <div class="summary-card-value">${totalCols}</div>
      <div class="summary-card-sub">跨所有文件</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">缺失率</div>
      <div class="summary-card-value">${missRate}%</div>
      <div class="summary-card-sub">${totalMiss} 个空值</div>
    </div>
  `;
}

/* ── Tabs ── */
function renderTabs(files) {
  document.getElementById('fileTabs').innerHTML = files.map(f =>
    `<button class="file-tab" id="tab_${CSS.escape(f.key)}" onclick="switchTab('${f.key.replace(/'/g,"\\'")}')">
      ${f.name}
    </button>`
  ).join('');
}

function switchTab(key) {
  destroyCharts();
  activeTab = key;
  document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tab_' + CSS.escape(key));
  if (tabEl) tabEl.classList.add('active');
  renderTabContent(key);
}

/* ── Tab Content ── */
function renderTabContent(key) {
  const f = loadedFiles[key];
  if (!f) return;

  const numCols = f.fields.filter(col => f.data.some(r => typeof r[col] === 'number' && !isNaN(r[col])));
  const catCols = f.fields.filter(col => f.data.some(r => typeof r[col] === 'string'));
  const stats   = computeStats(f.data, numCols);
  const missing = countMissing(f.data, f.fields);

  // set active tab
  document.querySelectorAll('.file-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tab_' + CSS.escape(key));
  if (tabEl) tabEl.classList.add('active');

  let html = '';

  // metric row
  html += `<div class="metric-row">
    <div class="metric-card"><div class="metric-card-label">总行数</div><div class="metric-card-value">${f.data.length}</div></div>
    <div class="metric-card"><div class="metric-card-label">总列数</div><div class="metric-card-value">${f.fields.length}</div></div>
    <div class="metric-card"><div class="metric-card-label">数值列</div><div class="metric-card-value">${numCols.length}</div></div>
    <div class="metric-card"><div class="metric-card-label">类别列</div><div class="metric-card-value">${catCols.length}</div></div>
    <div class="metric-card"><div class="metric-card-label">缺失值</div><div class="metric-card-value">${missing}</div></div>
  </div>`;

  // stats table
  if (stats.length) {
    html += `<div class="content-section">
      <div class="content-section-title">数值列统计摘要</div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>列名</th><th>有效值</th><th>均值</th><th>中位数</th>
          <th>标准差</th><th>最小值</th><th>最大值</th><th>缺失</th>
        </tr></thead>
        <tbody>
          ${stats.map(s => {
            const missCount = f.data.filter(r => r[s.col] === null || r[s.col] === undefined || r[s.col] === '').length;
            const missRate  = ((missCount / f.data.length) * 100).toFixed(1);
            const badge = missCount === 0 ? `<span class="badge-ok">0</span>`
              : missCount / f.data.length < 0.1 ? `<span class="badge-warn">${missCount}</span>`
              : `<span class="badge-danger">${missCount}</span>`;
            return `<tr>
              <td class="td-col">${s.col}</td>
              <td>${s.n}</td>
              <td>${s.mean.toFixed(2)}</td>
              <td>${s.median.toFixed(2)}</td>
              <td>${s.std.toFixed(2)}</td>
              <td>${s.min.toFixed(2)}</td>
              <td>${s.max.toFixed(2)}</td>
              <td>${badge}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  }

  // distribution charts
  if (numCols.length) {
    html += `<div class="content-section">
      <div class="content-section-title">数值列分布图</div>
      <div class="chart-grid" id="histGrid_${key}">
        ${numCols.slice(0, 8).map(col =>
          `<div class="chart-card">
            <div class="chart-card-title">${col}</div>
            <div class="chart-wrap"><canvas id="hist_${key}_${safeId(col)}" role="img" aria-label="${col} 分布直方图"></canvas></div>
          </div>`
        ).join('')}
      </div>
    </div>`;
  }

  // categorical charts
  const plotCats = catCols.filter(c => {
    const u = [...new Set(f.data.map(r => r[c]).filter(v => v !== null && v !== undefined && v !== ''))];
    return u.length >= 2 && u.length <= 20;
  }).slice(0, 4);

  if (plotCats.length) {
    html += `<div class="content-section">
      <div class="content-section-title">类别列分布</div>
      <div class="chart-grid">
        ${plotCats.map(col =>
          `<div class="chart-card">
            <div class="chart-card-title">${col}</div>
            <div class="chart-wrap" style="height:${Math.min(180, 40 + [...new Set(f.data.map(r=>r[col]).filter(Boolean))].length * 24)}px">
              <canvas id="cat_${key}_${safeId(col)}" role="img" aria-label="${col} 类别分布"></canvas>
            </div>
          </div>`
        ).join('')}
      </div>
    </div>`;
  }

  // correlation
  if (numCols.length >= 2) {
    html += `<div class="content-section">
      <div class="content-section-title">相关系数矩阵</div>
      <div class="corr-container" id="corrContainer_${key}">
        <div id="corrMap_${key}"></div>
        <div class="corr-legend">
          <span>-1.0</span>
          <div class="corr-legend-bar"></div>
          <span>+1.0</span>
          <span style="margin-left:12px;color:#999">红色=负相关 · 蓝色=正相关</span>
        </div>
      </div>
    </div>`;
  }

  document.getElementById('tabContent').innerHTML = html;

  // draw charts after DOM update
  requestAnimationFrame(() => {
    if (numCols.length) drawHistograms(key, f.data, numCols);
    if (plotCats.length) drawCatCharts(key, f.data, plotCats);
    if (numCols.length >= 2) drawCorrMatrix(key, f.data, numCols.slice(0, 10));
  });
}

/* ── Chart Helpers ── */
const PALETTE = ['#1a4a6b','#c44b2e','#2a6b4a','#8b5e00','#5b3f8a','#0f6b6b','#8a3f4a','#4a6b2a'];

function drawHistograms(key, data, numCols) {
  numCols.slice(0, 8).forEach((col, ci) => {
    const vals = data.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
    if (!vals.length) return;

    const min = Math.min(...vals), max = Math.max(...vals);
    const bins = 12, bw = (max - min) / bins || 1;
    const counts = Array(bins).fill(0);
    vals.forEach(v => { const i = Math.min(Math.floor((v - min) / bw), bins - 1); counts[i]++; });
    const labels = counts.map((_, i) => (min + i * bw).toFixed(1));

    const id  = `hist_${key}_${safeId(col)}`;
    const ctx = document.getElementById(id);
    if (!ctx) return;

    const color = PALETTE[ci % PALETTE.length];
    chartInstances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: col,
          data: counts,
          backgroundColor: color + '99',
          borderColor: color,
          borderWidth: 0.5,
          borderRadius: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9, family: 'DM Mono' }, maxRotation: 30, autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
          y: { ticks: { font: { size: 9, family: 'DM Mono' } }, grid: { color: '#e8e4dc' } }
        }
      }
    });
  });
}

function drawCatCharts(key, data, catCols) {
  catCols.forEach((col, ci) => {
    const vc = {};
    data.forEach(r => {
      const v = r[col];
      if (v !== null && v !== undefined && v !== '') vc[v] = (vc[v] || 0) + 1;
    });
    const sorted = Object.entries(vc).sort((a, b) => b[1] - a[1]).slice(0, 12);

    const id  = `cat_${key}_${safeId(col)}`;
    const ctx = document.getElementById(id);
    if (!ctx) return;

    const color = PALETTE[(ci + 2) % PALETTE.length];
    chartInstances[id] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(e => e[0]),
        datasets: [{ label: '频次', data: sorted.map(e => e[1]), backgroundColor: color + '99', borderColor: color, borderWidth: 0.5, borderRadius: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { size: 9, family: 'DM Mono' } }, grid: { color: '#e8e4dc' } },
          y: { ticks: { font: { size: 9, family: 'DM Mono' } }, grid: { display: false } }
        }
      }
    });
  });
}

function drawCorrMatrix(key, data, numCols) {
  const n = numCols.length;

  function pearson(colA, colB) {
    const pairs = [];
    data.forEach(r => {
      const a = r[colA], b = r[colB];
      if (typeof a === 'number' && !isNaN(a) && typeof b === 'number' && !isNaN(b)) pairs.push([a, b]);
    });
    if (pairs.length < 2) return 0;
    const ma = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
    const mb = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
    const num = pairs.reduce((s, p) => s + (p[0] - ma) * (p[1] - mb), 0);
    const da  = Math.sqrt(pairs.reduce((s, p) => s + (p[0] - ma) ** 2, 0));
    const db  = Math.sqrt(pairs.reduce((s, p) => s + (p[1] - mb) ** 2, 0));
    return da * db === 0 ? 0 : num / (da * db);
  }

  function cellStyle(v) {
    const abs = Math.abs(v);
    if (abs < 0.05) return { bg: '#f0ede7', txt: '#7a756c' };
    if (v > 0) {
      if (abs < 0.3)  return { bg: '#b5d4f4', txt: '#163d5a' };
      if (abs < 0.6)  return { bg: '#378add', txt: '#fff' };
      return { bg: '#1a4a6b', txt: '#fff' };
    } else {
      if (abs < 0.3)  return { bg: '#f7c1c1', txt: '#791f1f' };
      if (abs < 0.6)  return { bg: '#e24b4a', txt: '#fff' };
      return { bg: '#c44b2e', txt: '#fff' };
    }
  }

  let html = `<div class="corr-table">`;
  // header row
  html += `<div class="corr-row"><div class="corr-label-y"></div>`;
  numCols.forEach(c => { html += `<div class="corr-label-x">${c.substring(0, 6)}</div>`; });
  html += `</div>`;

  numCols.forEach(ca => {
    html += `<div class="corr-row"><div class="corr-label-y" title="${ca}">${ca.substring(0, 10)}</div>`;
    numCols.forEach(cb => {
      const v = pearson(ca, cb);
      const { bg, txt } = cellStyle(v);
      html += `<div class="corr-cell" title="${ca} × ${cb}: ${v.toFixed(3)}" style="background:${bg};color:${txt}">${v.toFixed(2)}</div>`;
    });
    html += `</div>`;
  });
  html += `</div>`;

  const el = document.getElementById(`corrMap_${key}`);
  if (el) el.innerHTML = html;
}

/* ── Stats Helpers ── */
function computeStats(data, numCols) {
  return numCols.map(col => {
    const vals = data.map(r => r[col]).filter(v => typeof v === 'number' && !isNaN(v));
    if (!vals.length) return null;
    const n    = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const sorted = [...vals].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
    const std  = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    return { col, n, mean, median, std, min: sorted[0], max: sorted[n-1] };
  }).filter(Boolean);
}

function countMissing(data, fields) {
  return fields.reduce((s, f) => s + data.filter(r => r[f] === null || r[f] === undefined || r[f] === '').length, 0);
}

function safeId(str) {
  return str.replace(/[^a-zA-Z0-9_]/g, '_');
}

function destroyCharts() {
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch(e) {} });
  chartInstances = {};
}
