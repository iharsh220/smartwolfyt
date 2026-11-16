import { $, $$, esc, num, full, pct, clock, flag, countryName, cssVar } from '../core/utils.js';
import { api } from '../core/api.js';
import { reveal, countUp } from '../effects/reveal.js';

const FORMATS = { num, full: (v) => full(v), pct, clock };
const CHART_JS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

function tile(label, value, fmt = 'num', delta = '') {
  return `<div class="tile reveal"><small>${esc(label)}</small><b data-count="${value}" data-fmt="${fmt}">0</b>${delta}</div>`;
}

function animateTiles(root) {
  for (const el of $$('[data-count]', root)) countUp(el, Number(el.dataset.count), FORMATS[el.dataset.fmt] || num);
}

function delta(cur, prev) {
  if (!prev) return '';
  const d = (cur - prev) / Math.abs(prev);
  const up = d >= 0;
  return `<span class="delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(d * 100).toFixed(0)}% vs previous 30 days</span>`;
}

/* ---------------------------------------------------- always-on stats */

export function renderPower(data, ch) {
  const { totals, averages } = data;
  const root = $('#power');
  root.innerHTML = [
    tile('Subscribers', ch.subscribers),
    tile('Channel views', ch.views),
    tile('Hours streamed', totals.streamHours, 'full'),
    tile('Live streams', totals.count.stream, 'full'),
    tile('Avg views / stream', averages.stream.views),
    tile('Avg views / Short', averages.short.views),
    tile('Total likes', totals.likes),
    tile('Avg engagement', totals.avgEngagement, 'pct'),
  ].join('');
  reveal(root);
  animateTiles(root);
}

/* ------------------------------------------------ analytics (OAuth) */

let chart;
let chartLoader;

function loadChartJs() {
  chartLoader ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHART_JS;
    s.onload = () => resolve(window.Chart);
    s.onerror = reject;
    document.head.append(s);
  });
  return chartLoader;
}

function drawChart(a) {
  const accent = cssVar('--accent');
  const accent2 = cssVar('--accent-2');
  const muted = cssVar('--muted');
  const line = cssVar('--line');
  chart?.destroy();
  chart = new window.Chart($('#viewsChart'), {
    data: {
      labels: a.daily.map((d) => new Date(d.day).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          type: 'line',
          label: 'Views',
          data: a.daily.map((d) => d.views),
          borderColor: accent,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: true,
          backgroundColor: ({ chart: c }) => {
            if (!c.chartArea) return 'transparent';
            const g = c.ctx.createLinearGradient(0, c.chartArea.top, 0, c.chartArea.bottom);
            g.addColorStop(0, `${accent}55`);
            g.addColorStop(1, `${accent}00`);
            return g;
          },
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'New subscribers',
          data: a.daily.map((d) => d.subscribersGained),
          backgroundColor: accent2,
          borderRadius: 4,
          maxBarThickness: 10,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: muted, boxWidth: 12, usePointStyle: true } },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${full(c.raw)}` } },
      },
      scales: {
        x: { ticks: { color: muted, maxTicksLimit: 8 }, grid: { display: false } },
        y: { ticks: { color: muted, callback: (v) => num(v) }, grid: { color: line }, beginAtZero: true },
        y1: { position: 'right', ticks: { color: muted }, grid: { display: false }, beginAtZero: true },
      },
    },
  });
}

function bars(rows, total, labelFn) {
  return rows
    .map((r) => {
      const share = total ? r.views / total : 0;
      return `<li><div class="row"><span>${labelFn(r)}</span><span>${num(r.views)} · ${(share * 100).toFixed(0)}%</span></div>
        <div class="bar-track"><div class="bar-fill" data-w="${(share * 100).toFixed(1)}"></div></div></li>`;
    })
    .join('');
}

const titleCase = (s) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export async function loadAnalytics() {
  const a = await api.analytics().catch(() => null);
  if (!a?.available) return;

  $('#analytics').hidden = false;
  $('#anRange').textContent = `${a.range.startDate} → ${a.range.endDate} · YouTube Analytics`;

  const t = a.totals;
  const net = t.subscribersGained - t.subscribersLost;
  const kpis = $('#kpis');
  kpis.innerHTML = [
    tile('Views', t.views, 'num', delta(t.views, a.previous.views)),
    tile('Watch hours', t.watchHours, 'full', delta(t.watchHours, a.previous.watchHours)),
    tile('Net subscribers', net, 'full', delta(net, a.previous.netSubs)),
    tile('Avg view duration', t.avgViewDuration, 'clock'),
  ].join('');
  reveal(kpis);
  animateTiles(kpis);

  const countryTotal = a.totals.views;
  $('#countries').innerHTML = bars(a.countries, countryTotal, (r) => `${flag(r.country)} ${esc(countryName(r.country))}`);
  const deviceTotal = a.devices.reduce((s, d) => s + d.views, 0);
  $('#devices').innerHTML = bars(a.devices, deviceTotal, (r) => esc(titleCase(r.deviceType)));
  requestAnimationFrame(() => {
    for (const el of $$('.bar-fill')) el.style.width = `${el.dataset.w}%`;
  });

  try {
    await loadChartJs();
    drawChart(a);
    window.addEventListener('themechange', () => drawChart(a));
  } catch {
    $('#viewsChart').closest('.card').hidden = true;
  }
}
