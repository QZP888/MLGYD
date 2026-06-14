const rhoOil = 981;
const eta = 1.82e-5;
const correction = 6.17e-6;
const g = 9.80665;
const d = 5.0e-3;
const L = 1.8e-3;
const e = 1.602e-19;
const badDataThresholdRatio = 1.0;

const inputRows = document.querySelector("#input-rows");
const inputEmpty = document.querySelector("#input-empty");
const resultsBody = document.querySelector("#results-body");
const resultsEmpty = document.querySelector("#results-empty");
const sampleCount = document.querySelector("#sample-count");
const averageCharge = document.querySelector("#average-charge");
const badCount = document.querySelector("#bad-count");
const pointDetail = document.querySelector("#point-detail");
const chartElement = document.querySelector("#charge-chart");
const deleteBadDataButton = document.querySelector("#delete-bad-data");
const addBulkRowsButton = document.querySelector("#add-100-rows");

const dropRadius = document.querySelector("#drop-radius");
const dropMass = document.querySelector("#drop-mass");
const dropSpeed = document.querySelector("#drop-speed");
const resultQ = document.querySelector("#result-q");
const resultN = document.querySelector("#result-n");
const resultNearest = document.querySelector("#result-nearest");
const resultAverageE = document.querySelector("#result-average-e");
const resultError = document.querySelector("#result-error");
const reverseBody = document.querySelector("#reverse-body");
const reverseEmpty = document.querySelector("#reverse-empty");
const reverseValidCount = document.querySelector("#reverse-valid-count");
const reverseAverageE = document.querySelector("#reverse-average-e");
const reverseAverageError = document.querySelector("#reverse-average-error");
const leastChartElement = document.querySelector("#least-chart");
const leastBody = document.querySelector("#least-body");
const leastEmpty = document.querySelector("#least-empty");
const leastFitE = document.querySelector("#least-fit-e");
const leastFitError = document.querySelector("#least-fit-error");
const leastFitCount = document.querySelector("#least-fit-count");
const differenceBody = document.querySelector("#difference-body");
const differenceEmpty = document.querySelector("#difference-empty");
const secondDifferenceBody = document.querySelector("#second-difference-body");
const secondDifferenceEmpty = document.querySelector("#second-difference-empty");
const differenceValidCount = document.querySelector("#difference-valid-count");
const differenceEstimateE = document.querySelector("#difference-estimate-e");
const differenceError = document.querySelector("#difference-error");
const processDeleteBadDataButton = document.querySelector("#process-delete-bad-data");
const processTotalCount = document.querySelector("#process-total-count");
const processValidCount = document.querySelector("#process-valid-count");
const processOutlierCount = document.querySelector("#process-outlier-count");
const processRetentionRate = document.querySelector("#process-retention-rate");
const processComparisonBody = document.querySelector("#process-comparison-body");
const processEmpty = document.querySelector("#process-empty");
const processConclusionList = document.querySelector("#process-conclusion-list");
const processFinalConclusion = document.querySelector("#process-final-conclusion");
const outlierChartElement = document.querySelector("#outlier-chart");
const normalChartElement = document.querySelector("#normal-chart");
const monteCarloChartElement = document.querySelector("#monte-carlo-chart");
const monteCarloSourceChartElement = document.querySelector("#monte-carlo-source-chart");
const monteCarloSampleCount = document.querySelector("#monte-carlo-sample-count");
const monteCarloMeanError = document.querySelector("#monte-carlo-mean-error");
const monteCarloMedianError = document.querySelector("#monte-carlo-median-error");
const monteCarloStdError = document.querySelector("#monte-carlo-std-error");
const monteCarloBody = document.querySelector("#monte-carlo-body");
const monteCarloEmpty = document.querySelector("#monte-carlo-empty");

let rows = [];
let results = [];
let chart = null;
let leastChart = null;
let outlierChart = null;
let normalChart = null;
let monteCarloChart = null;
let monteCarloSourceChart = null;
let selectedResultId = null;

function getRowId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function calculateOilDrop(V, t) {
  const speed = L / t;
  const radius = Math.sqrt((9 * eta * speed) / (2 * rhoOil * g));
  const mass = (4 / 3) * Math.PI * Math.pow(radius, 3) * rhoOil;
  const q = mass * g * d / V;
  const n = q / e;
  const nearestN = Math.round(n);
  const averageElectronCharge = nearestN > 0 ? q / nearestN : 0;
  const relativeError = averageElectronCharge > 0
    ? Math.abs(averageElectronCharge - e) / e * 100
    : 0;

  return {
    speed,
    radius,
    mass,
    q,
    n,
    nearestN,
    averageElectronCharge,
    relativeError
  };
}

function formatScientific(value, digits = 4) {
  return Number(value).toExponential(digits).replace("e", "e");
}

function formatNumber(value, digits = 2) {
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  });
}

function switchView(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `${viewName}-view`);
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  if (viewName === "results") {
    renderResults();
  }

  if (viewName === "chart") {
    renderResults();
    renderChart({ animate: true });
    window.setTimeout(() => {
      if (chart) {
        chart.resize();
      }
    }, 80);
  }

  if (viewName === "reverse") {
    renderResults();
    renderReverseVerification();
  }

  if (viewName === "least") {
    renderResults();
    renderLeastSquares({ animate: true });
    window.setTimeout(() => {
      if (leastChart) {
        leastChart.resize();
      }
    }, 80);
  }

  if (viewName === "difference") {
    renderResults();
    renderSuccessiveDifference();
  }

  if (viewName === "process") {
    renderResults();
    renderProcessWorkflow({ animate: true });
    window.setTimeout(() => {
      if (outlierChart) {
        outlierChart.resize();
      }
      if (normalChart) {
        normalChart.resize();
      }
    }, 80);
  }

  if (viewName === "monte-carlo") {
    renderResults();
    renderMonteCarloAnalysis({ animate: true });
    window.setTimeout(() => {
      if (monteCarloChart) {
        monteCarloChart.resize();
      }
      if (monteCarloSourceChart) {
        monteCarloSourceChart.resize();
      }
    }, 80);
  }
}

function addRow(V = "", t = "") {
  rows.push({
    id: getRowId(),
    V,
    t
  });
  renderInputRows();
}

function isBlankRow(row) {
  return String(row.V).trim() === "" && String(row.t).trim() === "";
}

function calculateVoltageFromCharge(t, q) {
  const speed = L / t;
  const radius = Math.sqrt((9 * eta * speed) / (2 * rhoOil * g));
  const mass = (4 / 3) * Math.PI * Math.pow(radius, 3) * rhoOil;
  return mass * g * d / q;
}

function roundTo(value, digits) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function shuffleItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function getRowKey(V, t) {
  return `${Number(V).toFixed(2)}|${Number(t).toFixed(2)}`;
}

function createSyntheticExperimentRow(isOutlier, usedKeys) {
  const outlierChargeRatios = [1.72, 2.34, 2.58, 3.44, 3.5, 4.54];
  const maxAttempts = 300;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const chargeNumber = isOutlier
      ? outlierChargeRatios[Math.floor(Math.random() * outlierChargeRatios.length)]
      : 2 + Math.floor(Math.random() * 11);
    const t = isOutlier
      ? roundTo(14 + Math.random() * 18, 2)
      : roundTo(8 + Math.random() * 22, 2);
    const errorRatio = isOutlier
      ? (Math.random() - 0.5) * 0.012
      : (Math.random() - 0.5) * 0.045;
    const q = chargeNumber * e * (1 + errorRatio);
    const V = roundTo(calculateVoltageFromCharge(t, q), 2);
    const key = getRowKey(V, t);

    if (V >= 90 && V <= 520 && !usedKeys.has(key)) {
      usedKeys.add(key);
      return {
        id: getRowId(),
        V: V.toFixed(2),
        t: t.toFixed(2)
      };
    }
  }

  const fallbackT = roundTo(16 + usedKeys.size * 0.17, 2);
  const fallbackQ = (isOutlier ? 3.65 : 6.02) * e;
  const fallbackV = roundTo(calculateVoltageFromCharge(fallbackT, fallbackQ), 2);
  usedKeys.add(getRowKey(fallbackV, fallbackT));
  return {
    id: getRowId(),
    V: fallbackV.toFixed(2),
    t: fallbackT.toFixed(2)
  };
}

function generateSyntheticExperimentRows() {
  const usedKeys = new Set(rows
    .filter((row) => !isBlankRow(row))
    .map((row) => getRowKey(row.V, row.t)));
  const generated = [];

  for (let index = 0; index < 95; index += 1) {
    generated.push(createSyntheticExperimentRow(false, usedKeys));
  }
  for (let index = 0; index < 5; index += 1) {
    generated.push(createSyntheticExperimentRow(true, usedKeys));
  }

  return shuffleItems(generated);
}

function addSyntheticExperimentRows() {
  syncRowsFromInputs();
  rows = rows.filter((row) => !isBlankRow(row));
  rows.push(...generateSyntheticExperimentRows());
  renderInputRows();
}

function deleteInputRow(id) {
  rows = rows.filter((row) => row.id !== id);
  renderInputRows();
}

function syncRowsFromInputs() {
  rows = rows.map((row) => {
    const rowElement = inputRows.querySelector(`[data-row-id="${row.id}"]`);
    if (!rowElement) {
      return row;
    }

    return {
      ...row,
      V: rowElement.querySelector('[data-field="V"]').value,
      t: rowElement.querySelector('[data-field="t"]').value
    };
  });
}

function renderInputRows() {
  inputRows.innerHTML = "";
  inputEmpty.classList.toggle("is-hidden", rows.length > 0);

  rows.forEach((row, index) => {
    const rowElement = document.createElement("div");
    rowElement.className = "input-row";
    rowElement.dataset.rowId = row.id;
    rowElement.innerHTML = `
      <div class="row-topline">
        <span class="row-index">第 ${index + 1} 组</span>
        <button class="delete-button" type="button" aria-label="删除第${index + 1}组数据">删除</button>
      </div>
      <label>
        平衡电压 V（伏特）
        <input data-field="V" type="number" step="any" value="${row.V}" aria-label="第${index + 1}组平衡电压">
      </label>
      <label>
        下落时间 t（秒）
        <input data-field="t" type="number" step="any" value="${row.t}" aria-label="第${index + 1}组下落时间">
      </label>
    `;
    rowElement.querySelector(".delete-button").addEventListener("click", () => deleteInputRow(row.id));
    inputRows.appendChild(rowElement);
  });
}

function recalculateResults() {
  const calculated = rows.map((row, index) => {
    const V = Number(row.V);
    const t = Number(row.t);
    return {
      id: row.id,
      index: index + 1,
      V,
      t,
      ...calculateOilDrop(V, t)
    };
  });

  const average = calculated.length
    ? calculated.reduce((sum, item) => sum + item.q, 0) / calculated.length
    : 0;

  results = calculated.map((item) => ({
    ...item,
    isBad: calculated.length > 0 && Math.abs(item.q - average) > average * badDataThresholdRatio
  }));

  if (!results.some((item) => item.id === selectedResultId)) {
    selectedResultId = results[0]?.id || null;
  }
}

function calculateAll() {
  syncRowsFromInputs();
  recalculateResults();
  switchView("results");
}

function isChartViewActive() {
  return document.querySelector("#chart-view").classList.contains("is-active");
}

function isReverseViewActive() {
  return document.querySelector("#reverse-view").classList.contains("is-active");
}

function isLeastViewActive() {
  return document.querySelector("#least-view").classList.contains("is-active");
}

function isDifferenceViewActive() {
  return document.querySelector("#difference-view").classList.contains("is-active");
}

function isProcessViewActive() {
  return document.querySelector("#process-view").classList.contains("is-active");
}

function isMonteCarloViewActive() {
  return document.querySelector("#monte-carlo-view").classList.contains("is-active");
}

function selectResult(id) {
  selectedResultId = id;
  renderResults();
  if (isChartViewActive()) {
    renderChart({ animate: false });
  }
  if (isReverseViewActive()) {
    renderReverseVerification();
  }
  if (isLeastViewActive()) {
    renderLeastSquares({ animate: false });
  }
  if (isDifferenceViewActive()) {
    renderSuccessiveDifference();
  }
  if (isProcessViewActive()) {
    renderProcessWorkflow({ animate: false });
  }
  if (isMonteCarloViewActive()) {
    renderMonteCarloAnalysis({ animate: false });
  }
}

function deleteResultRow(id) {
  rows = rows.filter((row) => row.id !== id);
  recalculateResults();
  renderInputRows();
  renderResults();
  if (isChartViewActive()) {
    renderChart({ animate: true });
  }
  if (isReverseViewActive()) {
    renderReverseVerification();
  }
  if (isLeastViewActive()) {
    renderLeastSquares({ animate: true });
  }
  if (isDifferenceViewActive()) {
    renderSuccessiveDifference();
  }
  if (isProcessViewActive()) {
    renderProcessWorkflow({ animate: true });
  }
  if (isMonteCarloViewActive()) {
    renderMonteCarloAnalysis({ animate: true });
  }
}

function deleteAllBadRows() {
  const badIds = new Set(results.filter((item) => item.isBad).map((item) => item.id));
  rows = rows.filter((row) => !badIds.has(row.id));
  recalculateResults();
  renderInputRows();
  renderResults();
  if (isChartViewActive()) {
    renderChart({ animate: true });
  }
  if (isReverseViewActive()) {
    renderReverseVerification();
  }
  if (isLeastViewActive()) {
    renderLeastSquares({ animate: true });
  }
  if (isDifferenceViewActive()) {
    renderSuccessiveDifference();
  }
  if (isProcessViewActive()) {
    renderProcessWorkflow({ animate: true });
  }
  if (isMonteCarloViewActive()) {
    renderMonteCarloAnalysis({ animate: true });
  }
}

function resetSelectedCards() {
  dropRadius.textContent = "--";
  dropMass.textContent = "--";
  dropSpeed.textContent = "--";
  resultQ.textContent = "--";
  resultN.textContent = "--";
  resultNearest.textContent = "--";
  resultAverageE.textContent = "--";
  resultError.textContent = "--";
  pointDetail.innerHTML = `
    <span>选中点</span>
    <strong>--</strong>
    <p>点击散点查看对应数据</p>
  `;
}

function renderSelectedCards(item) {
  if (!item) {
    resetSelectedCards();
    return;
  }

  dropRadius.textContent = formatScientific(item.radius, 4);
  dropMass.textContent = formatScientific(item.mass, 4);
  dropSpeed.textContent = formatScientific(item.speed, 4);
  resultQ.textContent = formatScientific(item.q, 4);
  resultN.textContent = formatNumber(item.n, 2);
  resultNearest.textContent = String(item.nearestN);
  resultAverageE.textContent = formatScientific(item.averageElectronCharge, 4);
  resultError.textContent = formatNumber(item.relativeError, 2);

  pointDetail.innerHTML = `
    <span>选中点</span>
    <strong>#${item.index}${item.isBad ? " / 偏离" : " / 正常"}</strong>
    <p>V = ${formatNumber(item.V, 2)} V，t = ${formatNumber(item.t, 2)} s，q = ${formatScientific(item.q, 4)} C</p>
    ${item.isBad ? `<button class="danger-button detail-delete" type="button" data-id="${item.id}">删除该数据</button>` : ""}
  `;

  const detailDelete = pointDetail.querySelector(".detail-delete");
  if (detailDelete) {
    detailDelete.addEventListener("click", () => deleteResultRow(item.id));
  }
}

function renderResults() {
  resultsBody.innerHTML = "";
  const average = results.length
    ? results.reduce((sum, item) => sum + item.q, 0) / results.length
    : 0;
  const badItems = results.filter((item) => item.isBad);
  const selected = results.find((item) => item.id === selectedResultId) || results[0] || null;

  if (selected && selected.id !== selectedResultId) {
    selectedResultId = selected.id;
  }

  sampleCount.textContent = String(results.length);
  averageCharge.textContent = results.length ? `${formatScientific(average, 3)} C` : "--";
  badCount.textContent = String(badItems.length);
  deleteBadDataButton.disabled = badItems.length === 0;
  resultsEmpty.classList.toggle("is-hidden", results.length > 0);

  renderSelectedCards(selected);

  results.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = `${item.isBad ? "bad-row" : ""} ${item.id === selectedResultId ? "is-selected" : ""}`.trim();
    tr.innerHTML = `
      <td>#${item.index}</td>
      <td>${formatNumber(item.V, 2)}</td>
      <td>${formatNumber(item.t, 2)}</td>
      <td>${formatScientific(item.q, 3)}</td>
      <td>${formatNumber(item.n, 2)}</td>
      <td><span class="badge">${item.isBad ? "偏离" : "正常"}</span></td>
      <td>
        ${item.isBad
          ? `<button class="danger-button row-delete" type="button" data-id="${item.id}">删除</button>`
          : `<span class="muted-action">--</span>`}
      </td>
    `;

    tr.addEventListener("click", () => selectResult(item.id));

    const rowDelete = tr.querySelector(".row-delete");
    if (rowDelete) {
      rowDelete.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteResultRow(item.id);
      });
    }

    resultsBody.appendChild(tr);
  });
}

function getRankedAnimationDelays(items, scoreGetter, totalDuration = 4000, pointDuration = 560) {
  const ranks = new Map();
  const sorted = items
    .map((item, index) => ({
      index,
      score: scoreGetter(item)
    }))
    .sort((a, b) => a.score - b.score || a.index - b.index);
  const step = sorted.length > 1 ? Math.max(0, (totalDuration - pointDuration) / (sorted.length - 1)) : 0;

  sorted.forEach((item, rank) => {
    ranks.set(item.index, rank * step);
  });

  return {
    duration: pointDuration,
    delay(index) {
      return ranks.get(index) || 0;
    }
  };
}

function renderChart({ animate = false } = {}) {
  if (!chart) {
    chart = echarts.init(chartElement);
    chart.on("click", (params) => {
      const item = results[params.dataIndex];
      if (item) {
        selectResult(item.id);
      }
    });
  }

  const maxN = results.length
    ? Math.max(10, Math.ceil(Math.max(...results.map((item) => item.n))))
    : 10;
  const maxIndex = Math.max(10, results.length);
  const scatterAnimation = getRankedAnimationDelays(results, (item) => item.index + item.n, 4000, 560);

  if (animate && chart) {
    chart.clear();
  }

  chart.setOption({
    animation: true,
    animationDuration: animate ? scatterAnimation.duration : 180,
    animationDurationUpdate: 180,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    grid: {
      left: 82,
      right: 36,
      top: 28,
      bottom: 64
    },
    tooltip: {
      trigger: "item",
      formatter(params) {
        const item = results[params.dataIndex];
        return `#${item.index}<br>V: ${formatNumber(item.V, 2)} V<br>t: ${formatNumber(item.t, 2)} s<br>q: ${formatScientific(item.q, 4)} C<br>n: ${formatNumber(item.n, 2)}`;
      },
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#3da6e9",
      textStyle: {
        color: "#17324d"
      }
    },
    xAxis: {
      type: "value",
      name: "油滴序号 m",
      min: 0,
      max: maxIndex,
      interval: Math.max(1, Math.ceil(maxIndex / 10)),
      nameTextStyle: {
        color: "#6f7f8e",
        fontWeight: 800
      },
      axisLabel: {
        color: "#6f7f8e",
        fontWeight: 800
      },
      axisLine: {
        lineStyle: {
          color: "#4c4c4c",
          width: 2
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: "#4c4c4c"
        }
      }
    },
    yAxis: {
      type: "value",
      name: "油滴电荷 q / (1.602×10^-19 C)",
      min: 0,
      max: maxN,
      interval: 1,
      nameTextStyle: {
        color: "#6f7f8e",
        fontWeight: 800
      },
      axisLabel: {
        color: "#e33d55",
        fontSize: 18,
        fontWeight: 900,
        formatter(value) {
          return Number.isInteger(value) ? `${value}e` : "";
        }
      },
      axisLine: {
        lineStyle: {
          color: "#4c4c4c",
          width: 2
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: "#4c4c4c"
        }
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: "#d9d9d9",
          type: "dashed",
          width: 2
        }
      }
    },
    series: [
      {
        name: "电荷量",
        type: "scatter",
        animationDelay(index) {
          return animate ? scatterAnimation.delay(index) : 0;
        },
        animationDelayUpdate: 0,
        symbolSize(value, params) {
          const item = results[params.dataIndex];
          return item?.id === selectedResultId ? 14 : 8;
        },
        data: results.map((item) => ({
          value: [item.index, item.n],
          itemStyle: {
            color: item.isBad ? "#e75d73" : "#0b78a8",
            borderColor: item.id === selectedResultId ? "#17324d" : "#ffffff",
            borderWidth: item.id === selectedResultId ? 3 : 1,
            shadowBlur: item.id === selectedResultId ? 10 : 3,
            shadowColor: item.isBad ? "rgba(231, 93, 115, 0.32)" : "rgba(59, 159, 226, 0.32)"
          }
        }))
      }
    ]
  }, true);
}

function renderReverseVerification() {
  reverseBody.innerHTML = "";
  const validItems = results.filter((item) => item.nearestN > 0);
  const averageMeasuredE = validItems.length
    ? validItems.reduce((sum, item) => sum + item.averageElectronCharge, 0) / validItems.length
    : 0;
  const averageError = averageMeasuredE
    ? Math.abs(averageMeasuredE - e) / e * 100
    : 0;

  reverseValidCount.textContent = String(validItems.length);
  reverseAverageE.textContent = validItems.length ? `${formatScientific(averageMeasuredE, 4)} C` : "--";
  reverseAverageError.textContent = validItems.length ? `${formatNumber(averageError, 2)} %` : "--";
  reverseEmpty.classList.toggle("is-hidden", results.length > 0);

  results.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = `${item.isBad ? "bad-row" : ""} ${item.id === selectedResultId ? "is-selected" : ""}`.trim();
    tr.innerHTML = `
      <td>#${item.index}</td>
      <td>${formatScientific(item.q, 4)}</td>
      <td>${formatNumber(item.n, 3)}</td>
      <td>${item.nearestN}</td>
      <td>${formatScientific(item.averageElectronCharge, 4)}</td>
      <td>${formatNumber(item.relativeError, 2)} %</td>
      <td><span class="badge">${item.isBad ? "偏离" : "正常"}</span></td>
    `;
    tr.addEventListener("click", () => selectResult(item.id));
    reverseBody.appendChild(tr);
  });
}

function getLeastSquaresData() {
  const validItems = results.filter((item) => item.nearestN > 0);
  const denominator = validItems.reduce((sum, item) => sum + item.nearestN ** 2, 0);
  const numerator = validItems.reduce((sum, item) => sum + item.nearestN * item.q, 0);
  const fittedE = denominator > 0 ? numerator / denominator : 0;
  const fittedError = fittedE ? Math.abs(fittedE - e) / e * 100 : 0;
  const rowsWithFit = validItems.map((item) => ({
    ...item,
    fittedQ: fittedE * item.nearestN,
    residual: item.q - fittedE * item.nearestN
  }));

  return {
    validItems,
    rowsWithFit,
    fittedE,
    fittedError
  };
}

function renderLeastSquares({ animate = false } = {}) {
  const { validItems, rowsWithFit, fittedE, fittedError } = getLeastSquaresData();
  leastBody.innerHTML = "";

  leastFitE.textContent = fittedE ? `${formatScientific(fittedE, 4)} C` : "--";
  leastFitError.textContent = fittedE ? `${formatNumber(fittedError, 2)} %` : "--";
  leastFitCount.textContent = String(validItems.length);
  leastEmpty.classList.toggle("is-hidden", rowsWithFit.length > 0);

  rowsWithFit.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = `${item.isBad ? "bad-row" : ""} ${item.id === selectedResultId ? "is-selected" : ""}`.trim();
    tr.innerHTML = `
      <td>#${item.index}</td>
      <td>${item.nearestN}</td>
      <td>${formatScientific(item.q, 4)}</td>
      <td>${formatScientific(item.fittedQ, 4)}</td>
      <td>${formatScientific(item.residual, 4)}</td>
      <td><span class="badge">${item.isBad ? "偏离" : "正常"}</span></td>
    `;
    tr.addEventListener("click", () => selectResult(item.id));
    leastBody.appendChild(tr);
  });

  renderLeastChart(rowsWithFit, fittedE, { animate });
}

function renderLeastChart(rowsWithFit, fittedE, { animate = false } = {}) {
  if (!leastChart) {
    leastChart = echarts.init(leastChartElement);
    leastChart.on("click", (params) => {
      if (params.seriesType === "scatter") {
        const item = rowsWithFit[params.dataIndex];
        if (item) {
          selectResult(item.id);
        }
      }
    });
  }

  const maxN = rowsWithFit.length
    ? Math.max(10, Math.max(...rowsWithFit.map((item) => item.nearestN)) + 1)
    : 10;
  const maxQ = rowsWithFit.length
    ? Math.max(...rowsWithFit.map((item) => item.q / 1e-19), fittedE * maxN / 1e-19, 2)
    : 16;
  const fittedLine = fittedE
    ? [[0, 0], [maxN, fittedE * maxN / 1e-19]]
    : [];

  if (animate && leastChart) {
    leastChart.clear();
  }

  leastChart.setOption({
    animation: true,
    animationDuration: animate ? 4000 : 180,
    animationDurationUpdate: 180,
    animationEasing: "cubicOut",
    backgroundColor: "transparent",
    legend: {
      top: 4,
      left: 8,
      textStyle: {
        color: "#17324d",
        fontWeight: 800
      }
    },
    grid: {
      left: 72,
      right: 28,
      top: 54,
      bottom: 54
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "#3da6e9",
      textStyle: {
        color: "#17324d"
      },
      formatter(params) {
        if (params.seriesType === "line") {
          return fittedE ? `拟合直线<br>q = ${formatScientific(fittedE, 4)} · n` : "暂无拟合";
        }
        const item = rowsWithFit[params.dataIndex];
        return `#${item.index}<br>n: ${item.nearestN}<br>q: ${formatScientific(item.q, 4)} C<br>q_fit: ${formatScientific(item.fittedQ, 4)} C<br>残差: ${formatScientific(item.residual, 4)} C`;
      }
    },
    xAxis: {
      type: "value",
      name: "电荷数 n",
      min: 0,
      max: maxN,
      interval: 1,
      nameTextStyle: {
        color: "#6f7f8e",
        fontWeight: 800
      },
      axisLabel: {
        color: "#6f7f8e",
        fontWeight: 800
      },
      axisLine: {
        lineStyle: {
          color: "#4c4c4c",
          width: 2
        }
      },
      splitLine: {
        lineStyle: {
          color: "#e3edf5"
        }
      }
    },
    yAxis: {
      type: "value",
      name: "电荷量 q / 10^-19 C",
      min: 0,
      max: Math.ceil(maxQ),
      nameTextStyle: {
        color: "#6f7f8e",
        fontWeight: 800
      },
      axisLabel: {
        color: "#6f7f8e",
        fontWeight: 800
      },
      axisLine: {
        lineStyle: {
          color: "#4c4c4c",
          width: 2
        }
      },
      splitLine: {
        lineStyle: {
          color: "#e3edf5"
        }
      }
    },
    series: [
      {
        name: "实验散点",
        type: "scatter",
        animationDuration: animate ? 560 : 180,
        animationDelay(index) {
          return animate ? Math.min(index * 160, 1500) : 0;
        },
        animationDelayUpdate: 0,
        symbolSize(value, params) {
          const item = rowsWithFit[params.dataIndex];
          return item?.id === selectedResultId ? 14 : 9;
        },
        data: rowsWithFit.map((item) => ({
          value: [item.nearestN, item.q / 1e-19],
          itemStyle: {
            color: item.isBad ? "#e75d73" : "#163f8f",
            borderColor: item.id === selectedResultId ? "#17324d" : "#ffffff",
            borderWidth: item.id === selectedResultId ? 3 : 1
          }
        }))
      },
      {
        name: fittedE ? `拟合直线: q = ${formatScientific(fittedE, 3)} n` : "拟合直线",
        type: "line",
        clip: true,
        animationDuration: animate ? 4000 : 180,
        animationDelay: 0,
        animationEasing: "cubicOut",
        animationDurationUpdate: 180,
        showSymbol: false,
        data: fittedLine,
        lineStyle: {
          color: "#cf5e62",
          width: 3
        }
      }
    ]
  }, true);
}

function getMean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function getStandardDeviation(values) {
  if (values.length < 2) {
    return 0;
  }
  const mean = getMean(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function getProcessStats(items) {
  const validItems = items.filter((item) => Number.isFinite(item.averageElectronCharge) && item.averageElectronCharge > 0);
  const values = validItems.map((item) => item.averageElectronCharge);
  const mean = getMean(values);
  const standardDeviation = getStandardDeviation(values);
  const relativeUncertainty = mean ? standardDeviation / mean * 100 : 0;
  const theoryBias = mean ? Math.abs(mean - e) / e * 100 : 0;

  return {
    validItems,
    values,
    mean,
    standardDeviation,
    relativeUncertainty,
    theoryBias
  };
}

function getProcessWorkflowData() {
  const rawStats = getProcessStats(results);
  const rawValues = rawStats.values;
  const grubbsLimit = rawValues.length >= 3 ? 1.8 : Infinity;
  const processOutlierIds = new Set();

  rawStats.validItems.forEach((item) => {
    const zScore = rawStats.standardDeviation
      ? Math.abs(item.averageElectronCharge - rawStats.mean) / rawStats.standardDeviation
      : 0;
    const theoryError = Math.abs(item.averageElectronCharge - e) / e * 100;
    if (zScore > grubbsLimit || theoryError > 12) {
      processOutlierIds.add(item.id);
    }
  });

  const optimizedItems = rawStats.validItems.filter((item) => !processOutlierIds.has(item.id));
  const optimizedStats = getProcessStats(optimizedItems);

  return {
    rawStats,
    optimizedStats,
    processOutlierIds,
    outlierCount: processOutlierIds.size,
    retentionRate: rawStats.validItems.length
      ? optimizedStats.validItems.length / rawStats.validItems.length * 100
      : 0
  };
}

function formatPercentChange(before, after, lowerIsBetter = true) {
  if (!before || !Number.isFinite(before) || !Number.isFinite(after)) {
    return "--";
  }
  const change = (before - after) / before * 100;
  if (Math.abs(change) < 0.01) {
    return "基本不变";
  }
  const isBetter = lowerIsBetter ? change > 0 : change < 0;
  const direction = change > 0 ? "降低" : "升高";
  return `${isBetter ? "提升" : "变化"}: ${direction} ${formatNumber(Math.abs(change), 2)}%`;
}

function renderProcessComparison(data) {
  const { rawStats, optimizedStats } = data;
  processComparisonBody.innerHTML = "";
  const rowsData = [
    ["样本数", rawStats.validItems.length, optimizedStats.validItems.length, data.outlierCount ? `剔除 ${data.outlierCount} 组` : "未发现异常"],
    ["均值 μ / C", formatScientific(rawStats.mean, 4), formatScientific(optimizedStats.mean, 4), formatPercentChange(Math.abs(rawStats.mean - e), Math.abs(optimizedStats.mean - e))],
    ["标准差 σ / C", formatScientific(rawStats.standardDeviation, 4), formatScientific(optimizedStats.standardDeviation, 4), formatPercentChange(rawStats.standardDeviation, optimizedStats.standardDeviation)],
    ["相对标准不确定度", `${formatNumber(rawStats.relativeUncertainty, 2)} %`, `${formatNumber(optimizedStats.relativeUncertainty, 2)} %`, formatPercentChange(rawStats.relativeUncertainty, optimizedStats.relativeUncertainty)],
    ["与理论值偏差", `${formatNumber(rawStats.theoryBias, 2)} %`, `${formatNumber(optimizedStats.theoryBias, 2)} %`, formatPercentChange(rawStats.theoryBias, optimizedStats.theoryBias)]
  ];

  rowsData.forEach((rowData) => {
    const tr = document.createElement("tr");
    tr.innerHTML = rowData.map((cell) => `<td>${cell}</td>`).join("");
    processComparisonBody.appendChild(tr);
  });
}

function getNormalCurvePoints(mean, standardDeviation, minValue, maxValue) {
  if (!mean || !standardDeviation) {
    return [];
  }
  const points = [];
  const step = (maxValue - minValue) / 80;
  for (let value = minValue; value <= maxValue; value += step) {
    const exponent = -0.5 * ((value - mean) / standardDeviation) ** 2;
    const density = Math.exp(exponent) / (standardDeviation * Math.sqrt(2 * Math.PI));
    points.push([value / 1e-19, density * 1e-19]);
  }
  return points;
}

function getHistogram(values, binCount = 12) {
  if (!values.length) {
    return { bins: [], minValue: e * 0.8, maxValue: e * 1.2 };
  }
  const minValue = Math.min(...values, e * 0.85);
  const maxValue = Math.max(...values, e * 1.15);
  const width = (maxValue - minValue) / binCount || e * 0.02;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = minValue + index * width;
    return {
      start,
      end: start + width,
      center: start + width / 2,
      count: 0
    };
  });

  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - minValue) / width)));
    bins[index].count += 1;
  });

  return { bins, minValue, maxValue };
}

function renderOutlierChart(data, { animate = false } = {}) {
  if (!outlierChart) {
    outlierChart = echarts.init(outlierChartElement);
    outlierChart.on("click", (params) => {
      if (params.data?.id) {
        selectResult(params.data.id);
      }
    });
  }

  const values = data.rawStats.validItems.map((item) => item.averageElectronCharge / 1e-19);
  const maxIndex = Math.max(10, data.rawStats.validItems.length);
  const minY = values.length ? Math.max(0, Math.min(...values, 1.2) - 0.08) : 1.2;
  const maxY = values.length ? Math.max(...values, 2.0) + 0.08 : 2.0;

  if (animate) {
    outlierChart.clear();
  }

  outlierChart.setOption({
    animation: true,
    animationDuration: animate ? 900 : 180,
    backgroundColor: "transparent",
    grid: { left: 64, right: 28, top: 36, bottom: 52 },
    tooltip: {
      trigger: "item",
      formatter(params) {
        const item = data.rawStats.validItems[params.dataIndex];
        return `#${item.index}<br>e_i: ${formatScientific(item.averageElectronCharge, 4)} C<br>误差: ${formatNumber(item.relativeError, 2)} %`; 
      }
    },
    xAxis: { type: "value", name: "数据序号", min: 0, max: maxIndex, interval: Math.max(1, Math.ceil(maxIndex / 8)) },
    yAxis: { type: "value", name: "e_i / 10^-19 C", min: minY, max: maxY },
    series: [
      {
        name: "测量值",
        type: "scatter",
        symbolSize(value, params) {
          const item = data.rawStats.validItems[params.dataIndex];
          return item?.id === selectedResultId ? 15 : 9;
        },
        data: data.rawStats.validItems.map((item) => ({
          id: item.id,
          value: [item.index, item.averageElectronCharge / 1e-19],
          itemStyle: {
            color: data.processOutlierIds.has(item.id) ? "#e75d73" : "#0b78a8",
            borderColor: item.id === selectedResultId ? "#17324d" : "#ffffff",
            borderWidth: item.id === selectedResultId ? 3 : 1
          }
        })),
        markLine: {
          symbol: "none",
          lineStyle: { color: "#cf5e62", type: "dashed", width: 2 },
          data: [{ yAxis: e / 1e-19, name: "理论值" }]
        }
      }
    ]
  }, true);
}

function renderNormalChart(data, { animate = false } = {}) {
  if (!normalChart) {
    normalChart = echarts.init(normalChartElement);
  }

  const values = data.optimizedStats.values.length ? data.optimizedStats.values : data.rawStats.values;
  const stats = data.optimizedStats.values.length ? data.optimizedStats : data.rawStats;
  const histogram = getHistogram(values, 12);
  const normalCurve = getNormalCurvePoints(stats.mean, stats.standardDeviation, histogram.minValue, histogram.maxValue);

  if (animate) {
    normalChart.clear();
  }

  normalChart.setOption({
    animation: true,
    animationDuration: animate ? 1000 : 180,
    backgroundColor: "transparent",
    grid: { left: 64, right: 28, top: 36, bottom: 52 },
    tooltip: { trigger: "axis" },
    xAxis: { type: "value", name: "e_i / 10^-19 C", min: histogram.minValue / 1e-19, max: histogram.maxValue / 1e-19 },
    yAxis: { type: "value", name: "频数 / 密度" },
    series: [
      {
        name: "测量分布",
        type: "bar",
        barWidth: "80%",
        data: histogram.bins.map((bin) => [bin.center / 1e-19, bin.count]),
        itemStyle: { color: "rgba(59, 159, 226, 0.55)", borderColor: "#3b9fe2" },
        markLine: {
          symbol: "none",
          data: [
            { xAxis: e / 1e-19, name: "理论值", lineStyle: { color: "#cf5e62", type: "dashed", width: 2 } },
            { xAxis: stats.mean / 1e-19, name: "均值", lineStyle: { color: "#1f8a55", type: "dashed", width: 2 } }
          ]
        }
      },
      {
        name: "正态拟合曲线",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: normalCurve,
        lineStyle: { color: "#e75d73", width: 3 }
      }
    ]
  }, true);
}

function renderProcessConclusion(data) {
  const { rawStats, optimizedStats } = data;
  processConclusionList.innerHTML = "";
  const standardDeviationDrop = rawStats.standardDeviation
    ? (rawStats.standardDeviation - optimizedStats.standardDeviation) / rawStats.standardDeviation * 100
    : 0;
  const uncertaintyDrop = rawStats.relativeUncertainty
    ? (rawStats.relativeUncertainty - optimizedStats.relativeUncertainty) / rawStats.relativeUncertainty * 100
    : 0;
  const biasDrop = rawStats.theoryBias
    ? (rawStats.theoryBias - optimizedStats.theoryBias) / rawStats.theoryBias * 100
    : 0;
  const conclusionItems = [
    `识别异常数据 ${data.outlierCount} 组，保留 ${optimizedStats.validItems.length} 组有效数据。`,
    `处理后平均基本电荷为 ${formatScientific(optimizedStats.mean, 4)} C。`,
    `标准差${standardDeviationDrop >= 0 ? "降低" : "升高"} ${formatNumber(Math.abs(standardDeviationDrop), 2)}%。`,
    `相对标准不确定度${uncertaintyDrop >= 0 ? "降低" : "升高"} ${formatNumber(Math.abs(uncertaintyDrop), 2)}%。`,
    `与理论值偏差${biasDrop >= 0 ? "降低" : "升高"} ${formatNumber(Math.abs(biasDrop), 2)}%。`
  ];

  conclusionItems.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    processConclusionList.appendChild(li);
  });

  processFinalConclusion.textContent = optimizedStats.validItems.length
    ? "处理后数据质量提升，电荷量测量结果更接近基本电荷理论值。"
    : "有效数据不足，请补充实验数据后重新分析。";
}

function renderProcessWorkflow({ animate = false } = {}) {
  const data = getProcessWorkflowData();
  processTotalCount.textContent = String(results.length);
  processValidCount.textContent = String(data.optimizedStats.validItems.length);
  processOutlierCount.textContent = String(data.outlierCount);
  processRetentionRate.textContent = data.rawStats.validItems.length ? `${formatNumber(data.retentionRate, 1)} %` : "--";
  processDeleteBadDataButton.disabled = data.outlierCount === 0;
  processEmpty.classList.toggle("is-hidden", results.length > 0);

  renderProcessComparison(data);
  renderOutlierChart(data, { animate });
  renderNormalChart(data, { animate });
  renderProcessConclusion(data);
}

function deleteProcessOutlierRows() {
  const { processOutlierIds } = getProcessWorkflowData();
  rows = rows.filter((row) => !processOutlierIds.has(row.id));
  recalculateResults();
  renderInputRows();
  renderResults();
  renderProcessWorkflow({ animate: true });
}

function randomNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) {
    u = Math.random();
  }
  while (v === 0) {
    v = Math.random();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randomUniformHalfWidth(halfWidth) {
  return (Math.random() * 2 - 1) * halfWidth;
}

function calculateOilDropWithConstants(V, t, constants) {
  const speed = constants.L / t;
  const radius = Math.sqrt((9 * constants.eta * speed) / (2 * constants.rhoOil * g));
  const mass = (4 / 3) * Math.PI * Math.pow(radius, 3) * constants.rhoOil;
  return mass * g * constants.d / V;
}

function sampleMonteCarloConstants(activeSource = "all") {
  const use = (source) => activeSource === "all" || activeSource === source;
  return {
    rhoOil: rhoOil * (1 + (use("rhoOil") ? randomNormal() * 0.01 : 0)),
    eta: eta * (1 + (use("eta") ? randomNormal() * 0.015 : 0)),
    d: d + (use("d") ? randomNormal() * 0.02e-3 : 0),
    L: L + (use("L") ? randomNormal() * 0.01e-3 : 0)
  };
}

function sampleMonteCarloTrial(validItems, activeSource = "all") {
  const constants = sampleMonteCarloConstants(activeSource);
  const values = validItems.map((item) => {
    const shouldPerturbAll = activeSource === "all";
    const V = item.V + (shouldPerturbAll || activeSource === "V" ? randomUniformHalfWidth(0.5) : 0);
    const t = item.t + (shouldPerturbAll || activeSource === "t" ? randomNormal() * 0.05 : 0);
    const safeV = Math.max(1, V);
    const safeT = Math.max(0.1, t);
    const q = calculateOilDropWithConstants(safeV, safeT, constants);
    return item.nearestN > 0 ? q / item.nearestN : 0;
  }).filter((value) => Number.isFinite(value) && value > 0);

  return values.length ? getMean(values) - e : 0;
}

function getQuantile(sortedValues, quantile) {
  if (!sortedValues.length) {
    return 0;
  }
  const position = (sortedValues.length - 1) * quantile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) {
    return sortedValues[lower];
  }
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (position - lower);
}

function getValueHistogram(values, binCount = 34) {
  if (!values.length) {
    return { bins: [], minValue: -1e-21, maxValue: 1e-21 };
  }
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue || 1e-21) * 0.08;
  const startValue = minValue - padding;
  const endValue = maxValue + padding;
  const width = (endValue - startValue) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => {
    const start = startValue + index * width;
    return {
      start,
      end: start + width,
      center: start + width / 2,
      count: 0
    };
  });

  values.forEach((value) => {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - startValue) / width)));
    bins[index].count += 1;
  });

  return { bins, minValue: startValue, maxValue: endValue };
}

function getMonteCarloAnalysisData(trialCount = 8000) {
  const workflowData = getProcessWorkflowData();
  const validItems = workflowData.optimizedStats.validItems.length
    ? workflowData.optimizedStats.validItems
    : workflowData.rawStats.validItems;
  const errors = [];

  for (let index = 0; index < trialCount; index += 1) {
    const error = sampleMonteCarloTrial(validItems, "all");
    if (Number.isFinite(error)) {
      errors.push(error);
    }
  }

  const sortedErrors = [...errors].sort((a, b) => a - b);
  const mean = getMean(errors);
  const standardDeviation = getStandardDeviation(errors);
  const sourceNames = [
    ["V", "平衡电压 V"],
    ["t", "下落时间 t"],
    ["d", "板间距 d"],
    ["L", "运动距离 L"],
    ["rhoOil", "油滴密度"],
    ["eta", "空气粘滞系数"]
  ];
  const contributionTrialCount = Math.min(2200, trialCount);
  const sourceContributions = sourceNames.map(([key, label]) => {
    const sourceErrors = [];
    for (let index = 0; index < contributionTrialCount; index += 1) {
      sourceErrors.push(sampleMonteCarloTrial(validItems, key));
    }
    return {
      key,
      label,
      standardDeviation: getStandardDeviation(sourceErrors)
    };
  });
  sourceContributions.sort((a, b) => b.standardDeviation - a.standardDeviation);

  return {
    trialCount: errors.length,
    validCount: validItems.length,
    errors,
    mean,
    median: getQuantile(sortedErrors, 0.5),
    standardDeviation,
    lower68: getQuantile(sortedErrors, 0.1587),
    upper68: getQuantile(sortedErrors, 0.8413),
    lower95: getQuantile(sortedErrors, 0.025),
    upper95: getQuantile(sortedErrors, 0.975),
    sourceContributions
  };
}

function formatErrorRange(lower, upper) {
  return `${formatScientific(lower, 3)} ~ ${formatScientific(upper, 3)}`;
}

function renderMonteCarloTable(data) {
  monteCarloBody.innerHTML = "";
  const rowsData = data.validCount ? [
    ["68.3% 区间", formatErrorRange(data.lower68, data.upper68), `${formatNumber(data.lower68 / 1e-21, 2)} ~ ${formatNumber(data.upper68 / 1e-21, 2)}`, "约等于 1σ 的总误差范围"],
    ["95% 区间", formatErrorRange(data.lower95, data.upper95), `${formatNumber(data.lower95 / 1e-21, 2)} ~ ${formatNumber(data.upper95 / 1e-21, 2)}`, "多数重复实验会落入的误差带"],
    ["最大贡献项", `${data.sourceContributions[0]?.label || "--"}`, `${formatNumber((data.sourceContributions[0]?.standardDeviation || 0) / 1e-21, 2)}`, "按单独扰动时的标准差排序"]
  ] : [];

  rowsData.forEach((rowData) => {
    const tr = document.createElement("tr");
    tr.innerHTML = rowData.map((cell) => `<td>${cell}</td>`).join("");
    monteCarloBody.appendChild(tr);
  });
}

function renderMonteCarloDistributionChart(data, { animate = false } = {}) {
  if (!monteCarloChart) {
    monteCarloChart = echarts.init(monteCarloChartElement);
  }

  const histogram = getValueHistogram(data.errors, 36);
  if (animate) {
    monteCarloChart.clear();
  }

  monteCarloChart.setOption({
    animation: true,
    animationDuration: animate ? 1000 : 180,
    backgroundColor: "transparent",
    grid: { left: 72, right: 32, top: 42, bottom: 58 },
    tooltip: {
      trigger: "axis",
      formatter(params) {
        const item = params[0];
        return `误差: ${formatNumber(item.value[0], 2)} ×10^-21 C<br>频数: ${item.value[1]}`;
      }
    },
    xAxis: {
      type: "value",
      name: "总系统误差 / 10^-21 C",
      min: histogram.minValue / 1e-21,
      max: histogram.maxValue / 1e-21,
      splitLine: { lineStyle: { color: "#e3edf5" } }
    },
    yAxis: { type: "value", name: "频数" },
    series: [
      {
        name: "蒙特卡洛误差分布",
        type: "bar",
        barWidth: "92%",
        data: histogram.bins.map((bin) => [bin.center / 1e-21, bin.count]),
        itemStyle: { color: "rgba(22, 63, 143, 0.76)", borderColor: "#163f8f" },
        markLine: {
          symbol: "none",
          data: [
            { xAxis: 0, name: "理论零误差", lineStyle: { color: "#cf5e62", type: "dashed", width: 2 } },
            { xAxis: data.mean / 1e-21, name: "均值", lineStyle: { color: "#1f8a55", type: "dashed", width: 2 } },
            { xAxis: data.lower68 / 1e-21, name: "68.3% 下限", lineStyle: { color: "#6f7f8e", type: "dotted", width: 2 } },
            { xAxis: data.upper68 / 1e-21, name: "68.3% 上限", lineStyle: { color: "#6f7f8e", type: "dotted", width: 2 } }
          ]
        }
      }
    ]
  }, true);
}

function renderMonteCarloSourceChart(data, { animate = false } = {}) {
  if (!monteCarloSourceChart) {
    monteCarloSourceChart = echarts.init(monteCarloSourceChartElement);
  }

  const sorted = [...data.sourceContributions].sort((a, b) => b.standardDeviation - a.standardDeviation);

  if (animate) {
    monteCarloSourceChart.clear();
  }

  monteCarloSourceChart.setOption({
    animation: true,
    animationDuration: animate ? 900 : 180,
    backgroundColor: "transparent",
    grid: { left: 108, right: 28, top: 28, bottom: 42 },
    tooltip: {
      trigger: "axis",
      formatter(params) {
        const item = params[0];
        return `${item.name}<br>单项标准差: ${formatScientific(item.value * 1e-21, 3)} C`; 
      }
    },
    xAxis: { type: "value", name: "单项标准差 / 10^-21 C" },
    yAxis: { type: "category", data: sorted.map((item) => item.label) },
    series: [
      {
        name: "误差来源贡献",
        type: "bar",
        data: sorted.map((item) => item.standardDeviation / 1e-21),
        itemStyle: { color: "#3b9fe2", borderRadius: [0, 6, 6, 0] }
      }
    ]
  }, true);
}

function renderMonteCarloAnalysis({ animate = false } = {}) {
  const data = getMonteCarloAnalysisData();
  monteCarloSampleCount.textContent = data.validCount ? formatNumber(data.trialCount, 0) : "--";
  monteCarloMeanError.textContent = data.validCount ? `${formatNumber(data.mean / 1e-21, 2)}×10^-21 C` : "--";
  monteCarloMedianError.textContent = data.validCount ? `${formatNumber(data.median / 1e-21, 2)}×10^-21 C` : "--";
  monteCarloStdError.textContent = data.validCount ? `${formatNumber(data.standardDeviation / 1e-21, 2)}×10^-21 C` : "--";
  monteCarloEmpty.classList.toggle("is-hidden", data.validCount > 0);
  renderMonteCarloTable(data);
  renderMonteCarloSourceChart(data, { animate });
  renderMonteCarloDistributionChart(data, { animate });
}

function estimateElementaryChargeFromDelta(delta) {
  const k = delta > 0 ? Math.round(delta / e) : 0;
  const estimatedE = k > 0 ? delta / k : 0;
  const error = estimatedE > 0 ? Math.abs(estimatedE - e) / e * 100 : 0;

  return {
    k,
    estimatedE,
    error
  };
}

function getSuccessiveDifferenceData() {
  const sorted = [...results].sort((a, b) => a.q - b.q);
  const firstRows = sorted.map((item, index) => {
    const delta = index > 0 ? item.q - sorted[index - 1].q : 0;
    const estimate = estimateElementaryChargeFromDelta(delta);

    return {
      ...item,
      sortedIndex: index + 1,
      delta,
      ...estimate
    };
  });

  const firstDifferences = firstRows
    .filter((item) => item.delta > 0)
    .map((item) => item.delta);

  const secondRows = [];
  for (let index = 1; index < firstDifferences.length; index += 1) {
    const delta = Math.abs(firstDifferences[index] - firstDifferences[index - 1]);
    secondRows.push({
      index,
      delta,
      ...estimateElementaryChargeFromDelta(delta)
    });
  }

  const validEstimates = firstRows.filter((item) => item.estimatedE > 0);
  const estimatedE = validEstimates.length
    ? validEstimates.reduce((sum, item) => sum + item.estimatedE, 0) / validEstimates.length
    : 0;
  const error = estimatedE ? Math.abs(estimatedE - e) / e * 100 : 0;

  return {
    firstRows,
    secondRows,
    validEstimates,
    estimatedE,
    error
  };
}

function renderSuccessiveDifference() {
  const { firstRows, secondRows, validEstimates, estimatedE, error } = getSuccessiveDifferenceData();
  differenceBody.innerHTML = "";
  secondDifferenceBody.innerHTML = "";

  differenceValidCount.textContent = String(validEstimates.length);
  differenceEstimateE.textContent = estimatedE ? `${formatScientific(estimatedE, 4)} C` : "--";
  differenceError.textContent = estimatedE ? `${formatNumber(error, 2)} %` : "--";
  differenceEmpty.classList.toggle("is-hidden", firstRows.length > 0);
  secondDifferenceEmpty.classList.toggle("is-hidden", secondRows.length > 0);

  firstRows.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = `${item.isBad ? "bad-row" : ""} ${item.id === selectedResultId ? "is-selected" : ""}`.trim();
    tr.innerHTML = `
      <td>${item.sortedIndex}</td>
      <td>#${item.index}</td>
      <td>${formatScientific(item.q, 4)}</td>
      <td>${item.delta > 0 ? formatScientific(item.delta, 4) : "--"}</td>
      <td>${item.delta > 0 ? formatNumber(item.delta / e, 3) : "--"}</td>
      <td>${item.k || "--"}</td>
      <td>${item.estimatedE ? formatScientific(item.estimatedE, 4) : "--"}</td>
      <td>${item.estimatedE ? `${formatNumber(item.error, 2)} %` : "--"}</td>
    `;
    tr.addEventListener("click", () => selectResult(item.id));
    differenceBody.appendChild(tr);
  });

  secondRows.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.index}</td>
      <td>${item.delta > 0 ? formatScientific(item.delta, 4) : "--"}</td>
      <td>${item.delta > 0 ? formatNumber(item.delta / e, 3) : "--"}</td>
      <td>${item.k || "--"}</td>
      <td>${item.estimatedE ? formatScientific(item.estimatedE, 4) : "--"}</td>
    `;
    secondDifferenceBody.appendChild(tr);
  });
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#add-row").addEventListener("click", () => {
  syncRowsFromInputs();
  addRow();
});

addBulkRowsButton.addEventListener("click", addSyntheticExperimentRows);

document.querySelector("#calculate").addEventListener("click", calculateAll);
document.querySelector("#back-to-input").addEventListener("click", () => switchView("input"));
document.querySelector("#chart-back-to-results").addEventListener("click", () => switchView("results"));
document.querySelector("#chart-back-to-input").addEventListener("click", () => switchView("input"));
document.querySelector("#reverse-back-to-results").addEventListener("click", () => switchView("results"));
document.querySelector("#reverse-back-to-input").addEventListener("click", () => switchView("input"));
document.querySelector("#least-back-to-results").addEventListener("click", () => switchView("results"));
document.querySelector("#least-back-to-input").addEventListener("click", () => switchView("input"));
document.querySelector("#difference-back-to-results").addEventListener("click", () => switchView("results"));
document.querySelector("#difference-back-to-input").addEventListener("click", () => switchView("input"));
document.querySelector("#process-back-to-results").addEventListener("click", () => switchView("results"));
document.querySelector("#process-back-to-input").addEventListener("click", () => switchView("input"));
document.querySelector("#monte-carlo-rerun").addEventListener("click", () => renderMonteCarloAnalysis({ animate: true }));
document.querySelector("#monte-carlo-back-to-results").addEventListener("click", () => switchView("results"));
document.querySelector("#monte-carlo-back-to-input").addEventListener("click", () => switchView("input"));
deleteBadDataButton.addEventListener("click", deleteAllBadRows);
processDeleteBadDataButton.addEventListener("click", deleteProcessOutlierRows);

window.addEventListener("resize", () => {
  if (chart) {
    chart.resize();
  }
  if (leastChart) {
    leastChart.resize();
  }
  if (outlierChart) {
    outlierChart.resize();
  }
  if (normalChart) {
    normalChart.resize();
  }
  if (monteCarloChart) {
    monteCarloChart.resize();
  }
  if (monteCarloSourceChart) {
    monteCarloSourceChart.resize();
  }
});

addRow();
