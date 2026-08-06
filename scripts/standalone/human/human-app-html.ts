export const htmlApp = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>lookit human review</title>
<style>
:root {
  --paper: #f6f1e7;
  --panel: #fffaf0;
  --ink: #23272e;
  --muted: #6b7280;
  --line: #d8cfbe;
  --accent: #d45d3a;
  --accent-ink: #fffaf0;
  --blue: #2f6f8f;
  --green: #4f7c55;
  --shadow: 0 18px 50px rgba(52, 43, 32, 0.14);
  --radius: 18px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  color: var(--ink);
  background:
    radial-gradient(circle at 12% 10%, rgba(212, 93, 58, 0.16), transparent 32%),
    radial-gradient(circle at 88% 8%, rgba(47, 111, 143, 0.14), transparent 30%),
    linear-gradient(135deg, #f2ead9 0%, #f8f4ec 48%, #e9f0ee 100%);
  font-family: "Avenir Next", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  animation: page-in 0.35s ease-out;
}

@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: rgba(255, 250, 240, 0.9);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(14px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: var(--accent-ink);
  background: var(--accent);
  border-radius: 12px 12px 12px 4px;
  font-family: "Iowan Old Style", "Songti SC", serif;
  font-size: 22px;
  font-weight: 700;
}

.brand small {
  display: block;
  color: var(--muted);
  font-size: 12px;
}

.task {
  flex: 1;
  min-width: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.45;
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.countdown {
  min-width: 72px;
  color: var(--muted);
  text-align: center;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.countdown.urgent {
  color: var(--accent);
  font-weight: 700;
}

.primary,
.ghost,
.tool,
.tab,
.canvas-toolbar button,
.row button {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 9px 14px;
  color: var(--ink);
  background: var(--panel);
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.primary {
  color: var(--accent-ink);
  background: var(--accent);
  font-weight: 700;
}

.ghost {
  border-color: var(--line);
  background: transparent;
}

.primary:hover,
.ghost:hover,
.tool:hover,
.tab:hover,
.canvas-toolbar button:hover,
.row button:hover {
  transform: translateY(-1px);
}

.primary:disabled,
.ghost:disabled,
.row button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

main {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px 20px 36px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card,
.canvas-card,
.annotation-list {
  border: 1px solid rgba(216, 207, 190, 0.85);
  border-radius: var(--radius);
  background: rgba(255, 250, 240, 0.88);
  box-shadow: var(--shadow);
}

.card {
  padding: 14px;
}

.card h2,
.annotation-list h2 {
  margin: 0 0 10px;
  font-family: "Iowan Old Style", "Songti SC", serif;
  font-size: 16px;
  letter-spacing: 0.02em;
}

.tools {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tool {
  padding: 9px 6px;
  border-color: var(--line);
  font-size: 13px;
}

.tool.active {
  color: var(--accent-ink);
  border-color: var(--accent);
  background: var(--accent);
}

.hint {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

label {
  display: block;
  margin: 12px 0 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 12px;
  outline: none;
  color: var(--ink);
  background: #fffdf8;
  padding: 10px 12px;
  resize: vertical;
}

input:focus,
textarea:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(47, 111, 143, 0.14);
}

textarea {
  line-height: 1.5;
}

.row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 12px;
}

.stage {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.tab {
  flex: 0 0 auto;
  max-width: 260px;
  overflow: hidden;
  border-color: var(--line);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.tab.active {
  color: var(--accent-ink);
  border-color: var(--blue);
  background: var(--blue);
}

.canvas-card {
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 13px;
}

.canvas-toolbar .spacer {
  flex: 1;
}

.canvas-toolbar button {
  padding: 7px 11px;
  border-color: var(--line);
  font-size: 12px;
}

.zoom {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 250, 240, 0.8);
}

.zoom button {
  min-width: 34px;
  padding: 5px 8px;
  border-color: transparent;
}

.zoom .zoom-fit {
  min-width: auto;
}

.zoom-label {
  min-width: 48px;
  color: var(--ink);
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.canvas-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 480px;
  overflow: hidden;
  background:
    linear-gradient(45deg, rgba(117, 104, 84, 0.06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(117, 104, 84, 0.06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(117, 104, 84, 0.06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(117, 104, 84, 0.06) 75%),
    #e8e2d5;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
}

canvas {
  display: block;
  touch-action: none;
}

.status {
  padding: 9px 14px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
}

.annotation-list {
  min-height: 120px;
  padding: 14px;
}

.annotations {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow: auto;
}

.annotation {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--ink);
  background: #fffdf8;
  padding: 9px 10px;
  text-align: left;
}

.annotation.selected {
  border-color: var(--blue);
  background: #e8f1f5;
  box-shadow: 0 0 0 3px rgba(47, 111, 143, 0.22);
}

.annotation.selected::after {
  content: "已选中";
  align-self: center;
  flex: 0 0 auto;
  color: var(--blue);
  font-size: 11px;
  font-weight: 700;
}

.annotation.selected strong {
  color: var(--blue);
}

.dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
}

.annotation .meta {
  flex: 1;
  min-width: 0;
}

.annotation strong,
.annotation code,
.annotation small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.annotation code {
  margin: 4px 0;
  color: var(--blue);
  font-size: 11px;
}

.annotation small {
  color: var(--muted);
  font-size: 12px;
}

.empty {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 13px;
  padding: 14px;
  text-align: center;
}

.import-panel {
  padding: 18px;
}

.drop-zone {
  border: 2px dashed var(--line);
  border-radius: 16px;
  color: var(--muted);
  background: rgba(255, 253, 248, 0.68);
  padding: 34px 18px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.drop-zone:hover,
.drop-zone.dragging {
  border-color: var(--blue);
  background: rgba(47, 111, 143, 0.09);
}

.import-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.import-actions .hint {
  flex: 1;
  margin: 0;
}

.path-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 12px;
}

.result-card pre {
  max-height: 420px;
  overflow: auto;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: #25404c;
  background: #f2f7f5;
  padding: 14px;
  font: 12px/1.55 "SFMono-Regular", "Cascadia Code", "JetBrains Mono", monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 900px) {
  header {
    flex-wrap: wrap;
  }

  .task {
    flex-basis: 100%;
    order: 3;
  }

  main {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .side {
    order: 2;
  }

  .stage {
    order: 1;
  }

  .canvas-wrap {
    min-height: 320px;
  }
}
</style>
</head>
<body>
<header>
  <div class="brand">
    <span class="logo">L</span>
    <div><strong>lookit human review</strong><small>人工图片审查</small></div>
  </div>
  <div class="task" id="task"></div>
  <div class="actions">
    <span id="countdown" class="countdown"></span>
    <button id="extendBtn" class="ghost" hidden>延长 5 分钟</button>
    <button id="cancelBtn" class="ghost">取消</button>
    <button id="saveBtn" class="primary">保存并结束</button>
  </div>
</header>

<main>
  <aside class="side">
    <section class="card">
      <h2>标注工具</h2>
      <div class="tools">
        <button class="tool active" data-tool="select">1 选择</button>
        <button class="tool" data-tool="rect">2 框选</button>
        <button class="tool" data-tool="polygon">3 多边形</button>
        <button class="tool" data-tool="point">4 标记点</button>
      </div>
      <p class="hint" id="toolHint">快捷键 1-4 切换工具, 拖动空白处平移, 点击矩形后直接编辑标签或说明</p>
    </section>

    <section class="card">
      <h2>注解</h2>
      <label for="labelInput">标签</label>
      <input id="labelInput" list="labelOptions" placeholder="标签">
      <datalist id="labelOptions"></datalist>
      <label for="noteInput">说明</label>
      <textarea id="noteInput" rows="3" placeholder="写清模型无法确认的细节"></textarea>
      <div class="row">
        <button id="deleteBtn" disabled>删除选中</button>
      </div>
    </section>

    <section class="card">
      <h2>图片备注</h2>
      <textarea id="imageNote" rows="3" placeholder="当前图片的补充说明"></textarea>
    </section>

    <section class="card">
      <h2>审查结论</h2>
      <textarea id="conclusion" rows="5" placeholder="给模型的最终结论"></textarea>
    </section>
  </aside>

  <section class="stage">
    <section id="importPanel" class="card import-panel" hidden>
      <h2>添加图片</h2>
      <div id="dropZone" class="drop-zone">
        拖放图片到这里, 或直接粘贴截图<br>
        <small>支持 PNG / JPEG / GIF / WebP</small>
      </div>
      <div class="import-actions">
        <button id="pickFilesBtn" class="ghost">选择图片</button>
        <p class="hint" id="pasteHint">也可以从剪贴板直接粘贴截图</p>
      </div>
      <div class="path-row">
        <input id="pathInput" placeholder="本机图片路径, 如 /Users/me/shot.png" autocomplete="off">
        <button id="openPathBtn" class="ghost">打开路径</button>
      </div>
      <input id="fileInput" type="file" accept="image/*" multiple hidden>
    </section>
    <div class="tabs" id="tabs"></div>
    <div class="canvas-card" id="canvasCard">
      <div class="canvas-toolbar">
        <span id="imageMeta"></span>
        <span class="spacer"></span>
        <span class="zoom">
          <button id="zoomOutBtn" title="缩小">-</button>
          <button id="zoomFitBtn" class="zoom-fit" title="适应窗口">适应</button>
          <button id="zoom100Btn" title="实际大小">100%</button>
          <button id="zoom10Btn" title="放大到 10 倍">10x</button>
          <button id="zoomInBtn" title="放大">+</button>
          <span class="zoom-label" id="zoomLabel">100%</span>
        </span>
        <button id="undoBtn">撤销</button>
        <button id="clearBtn">清空</button>
        <button id="removeImageBtn">移除</button>
      </div>
      <div class="canvas-wrap" id="canvasWrap">
        <canvas id="canvas"></canvas>
      </div>
      <div class="status" id="status">正在加载图片</div>
    </div>
    <section class="annotation-list" id="annotationList">
      <h2>区域列表</h2>
      <div id="annotations" class="annotations"></div>
    </section>
    <section id="resultCard" class="card result-card" hidden>
      <h2>结果 JSON 预览</h2>
      <pre id="resultJson"></pre>
      <div class="row">
        <button id="copyJsonBtn" class="ghost">复制 JSON</button>
      </div>
    </section>
  </section>
</main>

<script>
"use strict";

const params = new URLSearchParams(location.search);
const token = params.get("token");

const taskEl = document.getElementById("task");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const toolHint = document.getElementById("toolHint");
const labelInput = document.getElementById("labelInput");
const labelOptions = document.getElementById("labelOptions");
const noteInput = document.getElementById("noteInput");
const imageNote = document.getElementById("imageNote");
const conclusion = document.getElementById("conclusion");
const deleteBtn = document.getElementById("deleteBtn");
const tabsEl = document.getElementById("tabs");
const imageMetaEl = document.getElementById("imageMeta");
const canvasWrap = document.getElementById("canvasWrap");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const annotationsEl = document.getElementById("annotations");
const zoomLabel = document.getElementById("zoomLabel");
const countdownEl = document.getElementById("countdown");
const extendBtn = document.getElementById("extendBtn");
const importPanel = document.getElementById("importPanel");
const dropZone = document.getElementById("dropZone");
const pickFilesBtn = document.getElementById("pickFilesBtn");
const fileInput = document.getElementById("fileInput");
const pathInput = document.getElementById("pathInput");
const openPathBtn = document.getElementById("openPathBtn");
const canvasCard = document.getElementById("canvasCard");
const annotationList = document.getElementById("annotationList");
const resultCard = document.getElementById("resultCard");
const resultJson = document.getElementById("resultJson");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const removeImageBtn = document.getElementById("removeImageBtn");

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 10;
const HIT_TOLERANCE = 8;
const HANDLE_SIZE = 8;

const state = {
  meta: null,
  images: [],
  activeIndex: 0,
  serveMode: false,
  tool: "select",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  dpr: 1,
  selectedId: null,
  draft: null,
  deadline: null,
  timeoutSeconds: 0,
};

let dragging = null;
let spaceDown = false;
let submitted = false;

function activeImage() {
  return state.images[state.activeIndex];
}

function makeImageItem(meta) {
  const item = { meta, image: null, notes: [], regions: [] };
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    item.image = image;
    if (activeImage() === item) {
      resizeCanvas();
    }
  };
  image.onerror = () => {
    statusEl.textContent = \`图片加载失败: \${meta.name || basename(meta.path)}\`;
  };
  image.src = \`/api/image/\${meta.id}?token=\${encodeURIComponent(token)}\`;
  return item;
}

function appendMeta(meta) {
  state.meta.images.push(meta);
  state.images.push(makeImageItem(meta));
  importPanel.hidden = true;
  canvasCard.hidden = false;
  annotationList.hidden = false;
  saveBtn.disabled = false;
  cancelBtn.disabled = false;
  removeImageBtn.disabled = false;
  renderTabs();
  setActive(state.images.length - 1);
}

function showEmpty() {
  state.activeIndex = -1;
  state.selectedId = null;
  state.draft = null;
  canvasCard.hidden = true;
  annotationList.hidden = true;
  importPanel.hidden = false;
  saveBtn.disabled = true;
  cancelBtn.disabled = true;
  removeImageBtn.disabled = true;
  statusEl.textContent = "暂无图片, 可粘贴截图, 拖放文件或输入本机路径";
  renderTabs();
  refreshResultPreview();
}

async function uploadFiles(files) {
  let added = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      continue;
    }
    const form = new FormData();
    form.append("file", file, file.name || "paste.png");
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "x-lookit-token": token },
      body: form,
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "上传图片失败");
    }
    appendMeta(result.meta);
    added += 1;
  }
  if (added) {
    pathInput.value = "";
    statusEl.textContent = \`已添加 \${added} 张图片\`;
  } else {
    statusEl.textContent = "没有找到可添加的图片文件";
  }
}

async function openPath() {
  const requestedPath = pathInput.value.trim();
  if (!requestedPath) {
    statusEl.textContent = "请输入图片路径";
    return;
  }
  const response = await fetch("/api/open-path", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-lookit-token": token,
    },
    body: JSON.stringify({ path: requestedPath }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    statusEl.textContent = result.error || "打开图片失败";
    return;
  }
  pathInput.value = "";
  appendMeta(result.meta);
}

async function removeActiveImage() {
  const index = state.activeIndex;
  const item = activeImage();
  if (!item) {
    return;
  }
  const response = await fetch(\`/api/image/\${encodeURIComponent(item.meta.id)}\`, {
    method: "DELETE",
    headers: { "x-lookit-token": token },
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    statusEl.textContent = result.error || "移除图片失败";
    return;
  }
  state.meta.images.splice(index, 1);
  state.images.splice(index, 1);
  if (!state.images.length) {
    showEmpty();
    return;
  }
  state.activeIndex = Math.min(index, state.images.length - 1);
  setActive(state.activeIndex);
}

function clampZoom(value) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function cssSize() {
  const rect = canvas.getBoundingClientRect();
  return {
    width: rect.width || parseFloat(canvas.style.width) || canvas.width / state.dpr,
    height: rect.height || parseFloat(canvas.style.height) || canvas.height / state.dpr,
  };
}

function updateZoomLabel() {
  zoomLabel.textContent = \`\${Math.round(state.zoom * 100)}%\`;
}

function basename(path) {
  return path.replace(/[\\\\/]+$/, "").split(/[\\\\/]/).pop() || path;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function renderLabels() {
  labelOptions.innerHTML = state.meta.labels
    .map((label) => \`<option value="\${escapeHtml(label)}"></option>\`)
    .join("");
  labelInput.value = "";
}

function renderTabs() {
  tabsEl.innerHTML = "";
  state.meta.images.forEach((meta, index) => {
    const button = document.createElement("button");
    button.className = index === state.activeIndex ? "tab active" : "tab";
    button.textContent = \`\${index + 1}. \${meta.name || basename(meta.path)}\`;
    button.addEventListener("click", () => setActive(index));
    tabsEl.appendChild(button);
  });
  const add = document.createElement("button");
  add.className = "tab";
  add.textContent = "+ 添加";
  add.addEventListener("click", () => {
    importPanel.hidden = false;
  });
  tabsEl.appendChild(add);
}

function captureImageNotes() {
  const item = activeImage();
  if (!item) {
    return;
  }
  item.notes = imageNote.value
    .split(/\\r?\\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function setActive(index) {
  captureImageNotes();
  state.activeIndex = index;
  const item = activeImage();
  if (!item) {
    return;
  }
  state.selectedId = null;
  state.draft = null;
  imageNote.value = item.notes.join("\\n");
  imageMetaEl.textContent = \`\${item.meta.name || basename(item.meta.path)} \${item.meta.width}x\${item.meta.height}\`;
  fitView();
  updateZoomLabel();
  draw();
  renderTabs();
  renderAnnotations();
  updateAnnotationButtons();
}

function canvasSize() {
  const wrapWidth = Math.max(320, canvasWrap.clientWidth || window.innerWidth - 48);
  return {
    width: Math.max(320, wrapWidth - 24),
    height: Math.max(320, Math.min(window.innerHeight - 300, 760)),
  };
}

function resizeCanvas() {
  const size = canvasSize();
  state.dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(size.width * state.dpr);
  canvas.height = Math.round(size.height * state.dpr);
  canvas.style.width = \`\${size.width}px\`;
  canvas.style.height = \`\${size.height}px\`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  fitView();
  draw();
}

function fitView() {
  const item = activeImage();
  const size = cssSize();
  if (!item || !item.image || !item.image.naturalWidth) {
    return;
  }
  const scale = Math.min(size.width / item.image.naturalWidth, size.height / item.image.naturalHeight);
  state.zoom = clampZoom(scale);
  state.offsetX = (size.width - item.image.naturalWidth * state.zoom) / 2;
  state.offsetY = (size.height - item.image.naturalHeight * state.zoom) / 2;
  updateZoomLabel();
}

function toImage(screenPoint) {
  return {
    x: (screenPoint.x - state.offsetX) / state.zoom,
    y: (screenPoint.y - state.offsetY) / state.zoom,
  };
}

function toScreen(imagePoint) {
  return {
    x: imagePoint.x * state.zoom + state.offsetX,
    y: imagePoint.y * state.zoom + state.offsetY,
  };
}

function eventPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function pointInPolygon(screenPoint, points) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const current = points[index];
    const previousPoint = points[previous];
    const intersects =
      current.y > screenPoint.y !== previousPoint.y > screenPoint.y &&
      screenPoint.x <
        ((previousPoint.x - current.x) * (screenPoint.y - current.y)) /
          (previousPoint.y - current.y) +
          current.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function hitTestRegion(region, screenPoint) {
  if (region.shape === "rect") {
    const a = toScreen(region.points[0]);
    const b = toScreen(region.points[1]);
    const left = Math.min(a.x, b.x) - HIT_TOLERANCE;
    const top = Math.min(a.y, b.y) - HIT_TOLERANCE;
    const right = Math.max(a.x, b.x) + HIT_TOLERANCE;
    const bottom = Math.max(a.y, b.y) + HIT_TOLERANCE;
    return screenPoint.x >= left && screenPoint.x <= right && screenPoint.y >= top && screenPoint.y <= bottom;
  }
  if (region.shape === "polygon") {
    return pointInPolygon(screenPoint, region.points.map((point) => toScreen(point)));
  }
  const point = toScreen(region.points[0]);
  return Math.hypot(screenPoint.x - point.x, screenPoint.y - point.y) <= HIT_TOLERANCE + 4;
}

function hitTestRegions(screenPoint) {
  const item = activeImage();
  if (!item) {
    return null;
  }
  for (let index = item.regions.length - 1; index >= 0; index--) {
    if (hitTestRegion(item.regions[index], screenPoint)) {
      return item.regions[index];
    }
  }
  return null;
}

function resizeHandleAt(region, screenPoint) {
  if (region.shape !== "rect") {
    return null;
  }
  const a = toScreen(region.points[0]);
  const b = toScreen(region.points[1]);
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);
  let handle = "";
  if (Math.abs(screenPoint.y - top) <= HIT_TOLERANCE) {
    handle += "n";
  } else if (Math.abs(screenPoint.y - bottom) <= HIT_TOLERANCE) {
    handle += "s";
  }
  if (Math.abs(screenPoint.x - left) <= HIT_TOLERANCE) {
    handle += "w";
  } else if (Math.abs(screenPoint.x - right) <= HIT_TOLERANCE) {
    handle += "e";
  }
  return handle || null;
}

function polygonVertexAt(region, screenPoint) {
  if (region.shape !== "polygon") {
    return -1;
  }
  for (let index = 0; index < region.points.length; index++) {
    const point = toScreen(region.points[index]);
    if (Math.hypot(screenPoint.x - point.x, screenPoint.y - point.y) <= HIT_TOLERANCE + 4) {
      return index;
    }
  }
  return -1;
}

function cursorForHandle(handle) {
  const vertical = handle.includes("n") || handle.includes("s");
  const horizontal = handle.includes("e") || handle.includes("w");
  if (vertical && horizontal) {
    const reverseDiagonal =
      (handle.includes("n") && handle.includes("e")) || (handle.includes("s") && handle.includes("w"));
    return reverseDiagonal ? "nesw-resize" : "nwse-resize";
  }
  if (vertical) {
    return "ns-resize";
  }
  if (horizontal) {
    return "ew-resize";
  }
  return "move";
}

function updateSelectCursor(screenPoint) {
  if (state.tool !== "select") {
    canvas.style.cursor = state.tool === "point" ? "default" : "crosshair";
    return;
  }
  const item = activeImage();
  if (!item) {
    canvas.style.cursor = "default";
    return;
  }
  const hit = hitTestRegions(screenPoint);
  const selected = state.selectedId ? findRegion(state.selectedId) : null;
  if (selected) {
    const handle = resizeHandleAt(selected, screenPoint);
    if (handle) {
      canvas.style.cursor = cursorForHandle(handle);
      return;
    }
    if (polygonVertexAt(selected, screenPoint) >= 0 || (hit && hit.id === selected.id)) {
      canvas.style.cursor = "move";
      return;
    }
  }
  if (hit) {
    canvas.style.cursor = "pointer";
    return;
  }
  canvas.style.cursor = "grab";
}

function moveRegion(region, startPoints, delta) {
  const meta = activeImage().meta;
  const points = startPoints.map((point) => ({
    x: Math.max(0, Math.min(meta.width, Math.round(point.x + delta.x))),
    y: Math.max(0, Math.min(meta.height, Math.round(point.y + delta.y))),
  }));
  region.points = points;
  region.box = boxForPoints(points);
}

function resizeRegion(region, handle, startBox, imagePoint) {
  const meta = activeImage().meta;
  const x = Math.max(0, Math.min(meta.width, imagePoint.x));
  const y = Math.max(0, Math.min(meta.height, imagePoint.y));
  let x1 = startBox.x1;
  let y1 = startBox.y1;
  let x2 = startBox.x2;
  let y2 = startBox.y2;
  if (handle.includes("w")) {
    x1 = Math.min(x, x2 - 1);
  }
  if (handle.includes("e")) {
    x2 = Math.max(x, x1 + 1);
  }
  if (handle.includes("n")) {
    y1 = Math.min(y, y2 - 1);
  }
  if (handle.includes("s")) {
    y2 = Math.max(y, y1 + 1);
  }
  const points = [
    { x: Math.round(x1), y: Math.round(y1) },
    { x: Math.round(x2), y: Math.round(y2) },
  ];
  region.points = points;
  region.box = boxForPoints(points);
}

function drawResizeHandles(region) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = region.color;
  ctx.lineWidth = 2;
  if (region.shape === "polygon") {
    for (const point of region.points) {
      const screen = toScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, HANDLE_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }
  if (region.shape === "point") {
    const screen = toScreen(region.points[0]);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, HANDLE_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }
  if (region.shape !== "rect") {
    return;
  }
  const a = toScreen(region.points[0]);
  const b = toScreen(region.points[1]);
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);
  const handles = [
    { x: left, y: top },
    { x: (left + right) / 2, y: top },
    { x: right, y: top },
    { x: left, y: (top + bottom) / 2 },
    { x: right, y: (top + bottom) / 2 },
    { x: left, y: bottom },
    { x: (left + right) / 2, y: bottom },
    { x: right, y: bottom },
  ];
  for (const handle of handles) {
    ctx.fillRect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    ctx.strokeRect(handle.x - HANDLE_SIZE / 2, handle.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  }
}

function draw() {
  const size = cssSize();
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = "#e8e2d5";
  ctx.fillRect(0, 0, size.width, size.height);

  const item = activeImage();
  if (!item || !item.image || !item.image.naturalWidth) {
    return;
  }
  ctx.drawImage(
    item.image,
    state.offsetX,
    state.offsetY,
    item.image.naturalWidth * state.zoom,
    item.image.naturalHeight * state.zoom,
  );
  for (const region of item.regions) {
    drawRegion(region);
  }
  if (state.draft) {
    drawDraft();
  }
}

function drawRegion(region) {
  const selected = region.id === state.selectedId;
  ctx.save();
  ctx.strokeStyle = selected ? "#1d4e6b" : region.color;
  ctx.lineWidth = selected ? 4 : 2;
  ctx.fillStyle = selected ? \`\${region.color}44\` : \`\${region.color}22\`;
  if (selected) {
    ctx.shadowColor = "rgba(29, 78, 107, 0.55)";
    ctx.shadowBlur = 12;
  }

  if (region.shape === "rect") {
    const a = toScreen(region.points[0]);
    const b = toScreen(region.points[1]);
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.abs(b.x - a.x);
    const height = Math.abs(b.y - a.y);
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
  } else if (region.shape === "polygon") {
    ctx.beginPath();
    region.points.forEach((point, index) => {
      const screen = toScreen(point);
      if (index === 0) {
        ctx.moveTo(screen.x, screen.y);
      } else {
        ctx.lineTo(screen.x, screen.y);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    const point = toScreen(region.points[0]);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(point.x - 12, point.y);
    ctx.lineTo(point.x + 12, point.y);
    ctx.moveTo(point.x, point.y - 12);
    ctx.lineTo(point.x, point.y + 12);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;

  if (selected) {
    drawResizeHandles(region);
  }

  const text = [region.label, region.note].filter(Boolean).join(" - ");
  if (text) {
    const topLeft = toScreen({ x: region.box.x1, y: region.box.y1 });
    const size = cssSize();
    const labelHeight = 20;
    ctx.font = "600 12px \\"Avenir Next\\", \\"PingFang SC\\", sans-serif";
    const textWidth = ctx.measureText(text).width;
    const maxLabelX = Math.max(0, size.width - textWidth - 16);
    const labelX = Math.max(0, Math.min(topLeft.x, maxLabelX));
    const labelWidth = Math.min(textWidth + 12, size.width - labelX);
    let labelY = topLeft.y - labelHeight - 4;
    if (labelY < 0) {
      labelY = Math.max(0, topLeft.y + 4);
    }
    if (labelY + labelHeight > size.height) {
      labelY = Math.max(0, size.height - labelHeight);
    }
    if (labelWidth <= 0) {
      ctx.restore();
      return;
    }
    ctx.fillStyle = region.color;
    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, labelX + 6, labelY + labelHeight - 6);
  }
  ctx.restore();
}

function drawDraft() {
  ctx.save();
  ctx.strokeStyle = "#d45d3a";
  ctx.fillStyle = "rgba(212, 93, 58, 0.12)";
  ctx.lineWidth = 2;

  if (state.draft.shape === "rect" && state.draft.points.length) {
    const a = toScreen(state.draft.points[0]);
    const b = state.draft.pointer ? toScreen(state.draft.pointer) : a;
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.abs(b.x - a.x);
    const height = Math.abs(b.y - a.y);
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
  }

  if (state.draft.shape === "polygon") {
    const points = [...state.draft.points];
    if (state.draft.pointer) {
      points.push(state.draft.pointer);
    }
    if (points.length) {
      ctx.beginPath();
      points.forEach((point, index) => {
        const screen = toScreen(point);
        if (index === 0) {
          ctx.moveTo(screen.x, screen.y);
        } else {
          ctx.lineTo(screen.x, screen.y);
        }
      });
      ctx.stroke();
    }
    for (const point of state.draft.points) {
      const screen = toScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (state.draft.shape === "point" && state.draft.pointer) {
    const point = toScreen(state.draft.pointer);
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function clampPoints(points, width, height) {
  return points.map((point) => ({
    x: Math.max(0, Math.min(width, Math.round(point.x))),
    y: Math.max(0, Math.min(height, Math.round(point.y))),
  }));
}

function boxForPoints(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
  };
}

const labelPalette = ["#d45d3a", "#2f6f8f", "#4f7c55", "#a06b22", "#6f5a91", "#3f7c86", "#9a4a4a"];

function colorForLabel(label) {
  let hash = 0;
  for (const char of label) {
    hash = (hash * 31 + (char.codePointAt(0) || 0)) >>> 0;
  }
  return labelPalette[hash % labelPalette.length];
}

function addRegion(shape, points) {
  const item = activeImage();
  const clamped = clampPoints(points, item.meta.width, item.meta.height);
  const box = boxForPoints(clamped);
  if (shape === "rect" && (box.x2 <= box.x1 || box.y2 <= box.y1)) {
    return;
  }
  const region = {
    id: crypto.randomUUID(),
    shape,
    label: "",
    note: "",
    points: clamped,
    box,
    color: colorForLabel(""),
  };
  item.regions.push(region);
  state.selectedId = region.id;
  renderAnnotations();
  updateAnnotationButtons();
  draw();
}

function findRegion(id) {
  return activeImage().regions.find((region) => region.id === id);
}

function refreshResultPreview() {
  if (!state.meta || !state.serveMode) {
    return;
  }
  captureImageNotes();
  const preview = {
    task: state.meta.task,
    images: state.meta.images.map((meta, index) => {
      const item = state.images[index];
      return {
        path: meta.path,
        width: meta.width,
        height: meta.height,
        notes: item ? item.notes : [],
        regions: item ? item.regions : [],
      };
    }),
    conclusion: conclusion.value.trim(),
    submittedAt: new Date().toISOString(),
  };
  resultJson.textContent = JSON.stringify(preview, null, 2);
  resultCard.hidden = false;
}

function renderAnnotations() {
  const item = activeImage();
  refreshResultPreview();
  annotationsEl.innerHTML = "";
  if (!item || !item.regions.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "暂无区域";
    annotationsEl.appendChild(empty);
    return;
  }
  item.regions.forEach((region) => {
    const row = document.createElement("button");
    row.className = region.id === state.selectedId ? "annotation selected" : "annotation";
    row.innerHTML =
      \`<span class="dot" style="background:\${region.color}"></span>\` +
      \`<span class="meta"><strong>\${escapeHtml(region.label)}</strong>\` +
      \`<code>\${region.box.x1},\${region.box.y1},\${region.box.x2},\${region.box.y2}</code>\` +
      \`<small>\${escapeHtml(region.note || "无说明")}</small></span>\`;
    row.addEventListener("click", () => selectRegion(region.id));
    annotationsEl.appendChild(row);
  });
}

function selectRegion(id) {
  const region = findRegion(id);
  if (!region) {
    return;
  }
  state.selectedId = id;
  updateAnnotationButtons();
  renderAnnotations();
  draw();
}

function syncAnnotationEditor() {
  const region = state.selectedId ? findRegion(state.selectedId) : null;
  labelInput.value = region ? region.label : "";
  noteInput.value = region ? region.note : "";
}

function updateAnnotationButtons() {
  const region = state.selectedId ? findRegion(state.selectedId) : null;
  syncAnnotationEditor();
  deleteBtn.disabled = !region;
}

function updateSelected() {
  const region = findRegion(state.selectedId);
  if (!region) {
    return;
  }
  const label = labelInput.value.trim();
  const note = noteInput.value.trim();
  const labelChanged = region.label !== label;
  const noteChanged = region.note !== note;
  if (!labelChanged && !noteChanged) {
    return;
  }
  region.label = label;
  region.note = note;
  if (labelChanged) {
    region.color = colorForLabel(label);
  }
  renderAnnotations();
  if (labelChanged) {
    draw();
  }
}

function deleteSelected() {
  const item = activeImage();
  item.regions = item.regions.filter((region) => region.id !== state.selectedId);
  state.selectedId = null;
  updateAnnotationButtons();
  renderAnnotations();
  draw();
}

function undo() {
  if (state.draft) {
    state.draft = null;
    draw();
    return;
  }
  const item = activeImage();
  const region = item.regions.pop();
  if (!region) {
    return;
  }
  if (state.selectedId === region.id) {
    state.selectedId = null;
  }
  updateAnnotationButtons();
  renderAnnotations();
  draw();
}

function clearAnnotations() {
  const item = activeImage();
  if (!item.regions.length) {
    return;
  }
  if (!window.confirm("清空当前图片的全部标注?")) {
    return;
  }
  item.regions = [];
  state.selectedId = null;
  updateAnnotationButtons();
  renderAnnotations();
  draw();
}

function finishPolygon() {
  if (!state.draft || state.draft.shape !== "polygon") {
    return;
  }
  if (state.draft.points.length >= 3) {
    addRegion("polygon", state.draft.points);
  }
  state.draft = null;
  draw();
}

function setTool(tool) {
  state.tool = tool;
  state.draft = null;
  document.querySelectorAll(".tool").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  if (tool === "select") {
    toolHint.textContent = "[1] 选择 | 拖动空白处平移, 点击矩形后直接编辑标签或说明";
    canvas.style.cursor = "default";
  } else if (tool === "rect") {
    toolHint.textContent = "[2] 框选 | 拖拽生成矩形框";
    canvas.style.cursor = "crosshair";
  } else if (tool === "polygon") {
    toolHint.textContent = "[3] 多边形 | 依次点击顶点, 点击起点自动闭合";
    canvas.style.cursor = "crosshair";
  } else {
    toolHint.textContent = "[4] 标记点 | 点击图片添加标记点";
    canvas.style.cursor = "default";
  }
  draw();
}

function updateStatus(imagePoint) {
  const item = activeImage();
  if (!item) {
    return;
  }
  const x = Math.max(0, Math.min(item.meta.width, Math.round(imagePoint.x)));
  const y = Math.max(0, Math.min(item.meta.height, Math.round(imagePoint.y)));
  updateZoomLabel();
  statusEl.textContent = \`坐标 \${x}, \${y}\`;
}

function zoomAt(screenPoint, factor) {
  const item = activeImage();
  if (!item || !item.image || !item.image.naturalWidth) {
    return;
  }
  const imagePoint = toImage(screenPoint);
  const nextZoom = clampZoom(state.zoom * factor);
  if (nextZoom === state.zoom) {
    return;
  }
  state.zoom = nextZoom;
  state.offsetX = screenPoint.x - imagePoint.x * state.zoom;
  state.offsetY = screenPoint.y - imagePoint.y * state.zoom;
  updateZoomLabel();
  draw();
}

function setZoomCentered(zoom) {
  const item = activeImage();
  if (!item || !item.image || !item.image.naturalWidth) {
    return;
  }
  const size = cssSize();
  state.zoom = clampZoom(zoom);
  state.offsetX = (size.width - item.image.naturalWidth * state.zoom) / 2;
  state.offsetY = (size.height - item.image.naturalHeight * state.zoom) / 2;
  updateZoomLabel();
  draw();
}

function zoomBy(factor) {
  const size = cssSize();
  zoomAt({ x: size.width / 2, y: size.height / 2 }, factor);
}

function updateCountdown() {
  if (!state.deadline) {
    countdownEl.textContent = "";
    extendBtn.hidden = true;
    return;
  }
  const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  countdownEl.textContent = \`剩余 \${minutes}:\${seconds}\`;
  countdownEl.classList.toggle("urgent", remaining <= 60);
  extendBtn.hidden = false;
}

async function extendTimeout() {
  try {
    const response = await fetch("/api/extend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-lookit-token": token,
      },
      body: JSON.stringify({ seconds: 300 }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "延长超时失败");
    }
    state.deadline = Date.parse(result.deadline);
    state.timeoutSeconds = result.timeoutSeconds;
    updateCountdown();
  } catch (error) {
    statusEl.textContent = \`延长失败: \${error.message}\`;
  }
}

document.querySelectorAll(".tool").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

labelInput.addEventListener("input", updateSelected);
noteInput.addEventListener("input", updateSelected);
imageNote.addEventListener("input", refreshResultPreview);
conclusion.addEventListener("input", refreshResultPreview);
deleteBtn.addEventListener("click", deleteSelected);
document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("clearBtn").addEventListener("click", clearAnnotations);
document.getElementById("zoomOutBtn").addEventListener("click", () => zoomBy(1 / 1.25));
document.getElementById("zoomInBtn").addEventListener("click", () => zoomBy(1.25));
document.getElementById("zoomFitBtn").addEventListener("click", () => {
  fitView();
  updateZoomLabel();
  draw();
});
document.getElementById("zoom100Btn").addEventListener("click", () => setZoomCentered(1));
document.getElementById("zoom10Btn").addEventListener("click", () => setZoomCentered(10));
extendBtn.addEventListener("click", extendTimeout);
removeImageBtn.addEventListener("click", removeActiveImage);
pickFilesBtn.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  uploadFiles(fileInput.files).catch((error) => {
    statusEl.textContent = \`添加失败: \${error.message}\`;
  });
  fileInput.value = "";
});
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  uploadFiles(event.dataTransfer.files).catch((error) => {
    statusEl.textContent = \`添加失败: \${error.message}\`;
  });
});
openPathBtn.addEventListener("click", openPath);
pathInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    openPath();
  }
});
copyJsonBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultJson.textContent);
    statusEl.textContent = "结果 JSON 已复制";
  } catch (error) {
    statusEl.textContent = \`复制失败: \${error.message}\`;
  }
});

canvas.addEventListener("pointerdown", (event) => {
  const item = activeImage();
  if (!item || !item.image || !item.image.naturalWidth) {
    return;
  }
  canvas.setPointerCapture?.(event.pointerId);
  const screenPoint = eventPoint(event);
  const imagePoint = toImage(screenPoint);

  if (event.button === 1 || event.button === 2 || (spaceDown && event.button === 0)) {
    dragging = {
      mode: "pan",
      startX: screenPoint.x,
      startY: screenPoint.y,
      originX: state.offsetX,
      originY: state.offsetY,
    };
    event.preventDefault();
    return;
  }
  if (event.button !== 0) {
    return;
  }

  if (state.tool === "select") {
    const hit = hitTestRegions(screenPoint);
    if (hit) {
      const wasSelected = state.selectedId === hit.id;
      selectRegion(hit.id);
      if (!wasSelected) {
        draw();
        return;
      }
      const imagePoint = toImage(screenPoint);
      const vertexIndex = polygonVertexAt(hit, screenPoint);
      if (vertexIndex >= 0) {
        dragging = {
          mode: "vertex",
          vertexIndex,
          startImage: imagePoint,
        };
        canvas.style.cursor = "move";
        draw();
        return;
      }
      const handle = resizeHandleAt(hit, screenPoint);
      if (handle) {
        dragging = {
          mode: "resize",
          handle,
          startBox: { ...hit.box },
          startImage: imagePoint,
        };
        canvas.style.cursor = cursorForHandle(handle);
      } else {
        dragging = {
          mode: "move",
          startPoints: hit.points.map((point) => ({ ...point })),
          startImage: imagePoint,
        };
        canvas.style.cursor = "move";
      }
      draw();
      return;
    }
    if (state.selectedId !== null) {
      state.selectedId = null;
      updateAnnotationButtons();
      renderAnnotations();
      draw();
    }
    dragging = {
      mode: "pan",
      startX: screenPoint.x,
      startY: screenPoint.y,
      originX: state.offsetX,
      originY: state.offsetY,
    };
    canvas.style.cursor = "grabbing";
    event.preventDefault();
    return;
  }

  if (state.tool === "rect") {
    state.draft = { shape: "rect", points: [imagePoint], pointer: imagePoint };
    dragging = { mode: "rect" };
  } else if (state.tool === "point") {
    addRegion("point", [imagePoint]);
  } else if (state.tool === "polygon") {
    if (event.detail > 1) {
      finishPolygon();
      return;
    }
    if (!state.draft || state.draft.shape !== "polygon") {
      state.draft = { shape: "polygon", points: [], pointer: imagePoint };
    }
    if (state.draft.points.length >= 3) {
      const firstScreen = toScreen(state.draft.points[0]);
      if (Math.hypot(screenPoint.x - firstScreen.x, screenPoint.y - firstScreen.y) <= HIT_TOLERANCE + 4) {
        finishPolygon();
        return;
      }
    }
    state.draft.points.push(imagePoint);
    state.draft.pointer = imagePoint;
    draw();
  }
});

canvas.addEventListener("pointermove", (event) => {
  const screenPoint = eventPoint(event);
  if (dragging && dragging.mode === "move") {
    const region = findRegion(state.selectedId);
    const imagePoint = toImage(screenPoint);
    if (region) {
      canvas.style.cursor = "move";
      moveRegion(region, dragging.startPoints, {
        x: imagePoint.x - dragging.startImage.x,
        y: imagePoint.y - dragging.startImage.y,
      });
      renderAnnotations();
      draw();
    }
    return;
  }
  if (dragging && dragging.mode === "vertex") {
    const region = findRegion(state.selectedId);
    const imagePoint = toImage(screenPoint);
    if (region && region.shape === "polygon") {
      const meta = activeImage().meta;
      canvas.style.cursor = "move";
      region.points[dragging.vertexIndex] = clampPoints([imagePoint], meta.width, meta.height)[0];
      region.box = boxForPoints(region.points);
      renderAnnotations();
      draw();
    }
    return;
  }
  if (dragging && dragging.mode === "resize") {
    const region = findRegion(state.selectedId);
    const imagePoint = toImage(screenPoint);
    if (region) {
      canvas.style.cursor = cursorForHandle(dragging.handle);
      resizeRegion(region, dragging.handle, dragging.startBox, imagePoint);
      renderAnnotations();
      draw();
    }
    return;
  }
  if (dragging && dragging.mode === "pan") {
    canvas.style.cursor = "grabbing";
    state.offsetX = dragging.originX + screenPoint.x - dragging.startX;
    state.offsetY = dragging.originY + screenPoint.y - dragging.startY;
    draw();
    return;
  }
  const imagePoint = toImage(screenPoint);
  if (!dragging && state.tool === "select") {
    updateSelectCursor(screenPoint);
  }
  if (dragging && dragging.mode === "rect" && state.draft) {
    state.draft.points[1] = imagePoint;
    state.draft.pointer = imagePoint;
    draw();
  }
  if (state.draft && state.draft.shape === "polygon") {
    state.draft.pointer = imagePoint;
    draw();
  }
  updateStatus(imagePoint);
});

canvas.addEventListener("pointerup", (event) => {
  const screenPoint = eventPoint(event);
  if (dragging && dragging.mode === "pan") {
    dragging = null;
    updateSelectCursor(screenPoint);
    return;
  }
  if (dragging && (dragging.mode === "move" || dragging.mode === "resize" || dragging.mode === "vertex")) {
    dragging = null;
    updateSelectCursor(screenPoint);
    return;
  }
  if (dragging && dragging.mode === "rect" && state.draft) {
    const first = state.draft.points[0];
    const second = toImage(screenPoint);
    if (Math.abs(second.x - first.x) >= 1 || Math.abs(second.y - first.y) >= 1) {
      addRegion("rect", [first, second]);
    }
    state.draft = null;
  }
  dragging = null;
});

canvas.addEventListener("pointercancel", (event) => {
  dragging = null;
  state.draft = null;
  draw();
  updateSelectCursor(eventPoint(event));
});

canvas.addEventListener("dblclick", (event) => {
  if (state.tool === "select") {
    const hit = hitTestRegions(eventPoint(event));
    if (hit) {
      selectRegion(hit.id);
      noteInput.focus();
      noteInput.select();
      return;
    }
  }
  event.preventDefault();
  finishPolygon();
});

canvas.addEventListener("wheel", (event) => {
  const item = activeImage();
  if (!item || !item.image || !item.image.naturalWidth) {
    return;
  }
  event.preventDefault();
  const screenPoint = eventPoint(event);
  const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoomAt(screenPoint, factor);
}, { passive: false });

canvas.addEventListener("contextmenu", (event) => event.preventDefault());

document.addEventListener("paste", (event) => {
  const target = event.target;
  const isEditable =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable);
  if (isEditable) {
    return;
  }
  const items = event.clipboardData?.items || [];
  const files = [];
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }
  if (files.length) {
    event.preventDefault();
    uploadFiles(files).catch((error) => {
      statusEl.textContent = \`粘贴图片失败: \${error.message}\`;
    });
  }
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isEditable =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable);
  if ((event.key === "Delete" || event.key === "Backspace") && state.selectedId && !isEditable) {
    event.preventDefault();
    deleteSelected();
    return;
  }
  if (event.key === "Escape") {
    state.draft = null;
    draw();
  }
  if (event.key === "Enter" && state.tool === "polygon" && !isEditable) {
    event.preventDefault();
    finishPolygon();
  }
  if (event.key === " " && !isEditable) {
    spaceDown = true;
    canvas.style.cursor = "grab";
    event.preventDefault();
  }
  const shortcutTools = {
    Digit1: "select",
    Digit2: "rect",
    Digit3: "polygon",
    Digit4: "point",
    Numpad1: "select",
    Numpad2: "rect",
    Numpad3: "polygon",
    Numpad4: "point",
  };
  if (
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !isEditable &&
    shortcutTools[event.code]
  ) {
    setTool(shortcutTools[event.code]);
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === " ") {
    spaceDown = false;
    if (state.tool === "select") {
      canvas.style.cursor = "grab";
    } else if (state.tool === "point") {
      canvas.style.cursor = "default";
    } else {
      canvas.style.cursor = "crosshair";
    }
  }
});

saveBtn.addEventListener("click", async () => {
  if (submitted && !state.serveMode) {
    return;
  }
  captureImageNotes();
  const payload = {
    images: state.images.map((item) => ({
      notes: item.notes,
      regions: item.regions,
    })),
    conclusion: conclusion.value.trim(),
  };
  saveBtn.disabled = true;
  saveBtn.textContent = "正在保存";
  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-lookit-token": token,
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "提交失败");
    }
    if (state.serveMode) {
      resultCard.hidden = false;
      resultJson.textContent = JSON.stringify(result.submission, null, 2);
      saveBtn.disabled = false;
      saveBtn.textContent = "再次提交";
      cancelBtn.disabled = false;
      statusEl.textContent = \`已提交 #\${result.counter}\`;
      submitted = false;
      return;
    }
    submitted = true;
    saveBtn.textContent = "已提交";
    cancelBtn.disabled = true;
    statusEl.textContent = "已提交, 结果已返回 agent";
    setTimeout(() => {
      try {
        window.close();
      } catch {
        // Some browsers only close script-opened tabs.
      }
    }, 800);
  } catch (error) {
    saveBtn.disabled = false;
    saveBtn.textContent = "保存并结束";
    statusEl.textContent = \`提交失败: \${error.message}\`;
  }
});

cancelBtn.addEventListener("click", async () => {
  if (submitted && !state.serveMode) {
    return;
  }
  try {
    const response = await fetch("/api/cancel", {
      method: "POST",
      headers: { "x-lookit-token": token },
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "取消失败");
    }
  } catch {
    // The server may already be stopping.
  }
  if (state.serveMode) {
    captureImageNotes();
    state.images = [];
    state.meta.images = [];
    conclusion.value = "";
    showEmpty();
    saveBtn.textContent = "提交结果";
    statusEl.textContent = "已清空, 可以开始新的一轮";
    return;
  }
  submitted = true;
  saveBtn.disabled = true;
  cancelBtn.disabled = true;
  statusEl.textContent = "已取消";
  setTimeout(() => {
    try {
      window.close();
    } catch {
      // Some browsers only close script-opened tabs.
    }
  }, 300);
});

window.addEventListener("beforeunload", (event) => {
  if (!state.serveMode && !submitted) {
    event.preventDefault();
    event.returnValue = "";
  }
});

window.addEventListener("resize", resizeCanvas);

async function init() {
  if (!token) {
    statusEl.textContent = "链接缺少访问令牌, 请使用脚本打印的审查页面地址";
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    return;
  }
  const response = await fetch(\`/api/meta?token=\${encodeURIComponent(token)}\`);
  if (!response.ok) {
    throw new Error("无法读取审查任务");
  }
  state.meta = await response.json();
  state.serveMode = Boolean(state.meta.serveMode);
  taskEl.textContent = state.meta.task;
  state.timeoutSeconds = state.meta.timeoutSeconds || 0;
  state.deadline = state.meta.deadline ? Date.parse(state.meta.deadline) : null;
  updateCountdown();
  setInterval(updateCountdown, 1000);
  renderLabels();
  saveBtn.textContent = state.serveMode ? "提交结果" : "保存并结束";
  cancelBtn.textContent = state.serveMode ? "清空" : "取消";
  if (state.serveMode) {
    extendBtn.hidden = true;
    countdownEl.textContent = "";
  }
  if (state.meta.images.length) {
    state.images = state.meta.images.map(makeImageItem);
    renderTabs();
    setActive(0);
    saveBtn.disabled = false;
    cancelBtn.disabled = false;
    removeImageBtn.disabled = false;
  } else {
    showEmpty();
  }
}

init().catch((error) => {
  statusEl.textContent = \`初始化失败: \${error.message}\`;
  saveBtn.disabled = true;
  cancelBtn.disabled = true;
});
</script>
</body>
</html>
`;
