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

let rows = [];
let results = [];
let chart = null;
let leastChart = null;
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
}

function addRow(V = "", t = "") {
  rows.push({
    id: getRowId(),
    V,
    t
  });
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
deleteBadDataButton.addEventListener("click", deleteAllBadRows);

window.addEventListener("resize", () => {
  if (chart) {
    chart.resize();
  }
  if (leastChart) {
    leastChart.resize();
  }
});

addRow();
