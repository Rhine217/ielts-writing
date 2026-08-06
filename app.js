/* ============================================================
 * IELTS Writing Review — 增强复刻版
 * 相比原版新增：
 *   1. JSON 文件同步（File System Access API，可搭配坚果云跨设备共用）
 *   2. 四维评分（TR / CC / LR / GRA）
 *   3. 主题色选择（含深色模式）
 *   4. 错误标注文本框随内容自动增高
 *   5. 错误标注按类型筛选显示
 *   6. 自定义下拉框 UI
 * ============================================================ */

"use strict";

/* ---------------- 常量 ---------------- */

const TASK_TYPES = {
  task2: ["双边讨论", "单边讨论", "问题措施", "复合问题"],
  task1: ["折线", "饼图", "柱状", "表格", "流程图", "地图", "混合图"],
};

const TASK2_TOPICS = ["教育", "科技", "社会", "政府", "媒体", "国际", "犯罪", "文化", "旅游", "环境", "健康", "工作"];
const SCORE_OPTIONS = ["", "4", "4.5", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9"];

const SCORE_DIMENSIONS = [
  { key: "tr", label: "TR", name: "任务完成度", tip: "Task Response" },
  { key: "cc", label: "CC", name: "连贯与衔接", tip: "Coherence & Cohesion" },
  { key: "lr", label: "LR", name: "词汇资源", tip: "Lexical Resource" },
  { key: "gra", label: "GRA", name: "语法广度与准确性", tip: "Grammatical Range & Accuracy" },
];

// 各维度 5-8 分的档位关键特征（用于评分下拉的提示）
const BAND_DESCRIPTORS = {
  tr: {
    "5": "回应部分任务，中心论点不够清晰，支持不足",
    "6": "回应任务所有部分，但部分观点展开不充分",
    "7": "回应任务全部要点，立场清晰，观点展开充分",
    "8": "充分回应，论点紧扣题目，展开与例证完整",
  },
  cc: {
    "5": "衔接不充分，段落划分不清晰，指代易混",
    "6": "衔接整体有效，偶尔重复或用词不够自然",
    "7": "逻辑清晰，段落组织合理，衔接自然",
    "8": "段落组织灵活，衔接流畅，信息布局巧妙",
  },
  lr: {
    "5": "词汇量有限，搭配与拼写错误较多",
    "6": "词汇量足够，部分用词不够精确地道",
    "7": "词汇丰富，能使用较不常见词，搭配自然",
    "8": "词汇运用广泛灵活，选词精准，风格自然",
  },
  gra: {
    "5": "句式较单调，语法错误影响理解",
    "6": "简单句与复杂句混合，错误偶发但不影响理解",
    "7": "句式多样，多数句子语法准确",
    "8": "语法结构多样且准确，仅个别口误级瑕疵",
  },
};
// 每个评分下拉对应的维度 key（总分下拉不显示描述）
const SCORE_SELECT_DIMENSION = {
  draftScoreTR: "tr", draftScoreCC: "cc", draftScoreLR: "lr", draftScoreGRA: "gra",
  modelScoreTR: "tr", modelScoreCC: "cc", modelScoreLR: "lr", modelScoreGRA: "gra",
};

const CORRECTION_KINDS = [
  { kind: "语法", color: "#f28d78" },
  { kind: "词汇", color: "#e8a62e" },
  { kind: "搭配", color: "#3fbf85" },
  { kind: "逻辑", color: "#5a9ff0" },
  { kind: "衔接", color: "#9b7be8" },
  { kind: "任务回应", color: "#ec7fb2" },
  { kind: "其他", color: "#9aa5b1" },
];

const BANK_SCHEMAS = {
  task2: {
    collocations: "固定搭配",
    synonyms: "同义替换",
    sentences: "句型",
    vocabulary: "陌生词",
    ideas: "主题论据",
    keyNotes: "重点摘记",
  },
  task1: {
    vocabulary: "陌生词",
    chartWords: "题型词汇",
    trendPhrases: "趋势表达",
    sentences: "句式",
    collocations: "固定搭配",
    keyNotes: "重点摘记",
  },
};

const HIGHLIGHTS = [
  ["#ffe998", "好表达 / 可复用"],
  ["#ffc9c1", "错误 / 待修改"],
  ["#b9dcff", "逻辑 / 结构"],
  ["#c7efd5", "搭配 / 句型"],
];
const HIGHLIGHT_COLOR_MIGRATIONS = {
  "#fff0a6": "#ffe998",
  "#ffd8d2": "#ffc9c1",
  "#d9ecff": "#b9dcff",
  "#dff5e8": "#c7efd5",
};

const THEMES = {
  ocean: { name: "海蓝", accent: "#2f6fa7", ink: "#1c2836", muted: "#5d6b7b", line: "#d5dde5", panel: "#ffffff", soft: "#eef3f7", bg: "#e9eef2", surface: "#fbfcfd", green: "#2e7a62", red: "#ad5149", amber: "#c18625" },
  forest: { name: "森林", accent: "#2f7a5f", ink: "#1d2b24", muted: "#5c6d63", line: "#d3e0da", panel: "#ffffff", soft: "#ecf4ef", bg: "#e7efe9", surface: "#fbfdfb", green: "#2e7a62", red: "#b05a50", amber: "#bd851f" },
  rose: { name: "蔷薇", accent: "#b45c4e", ink: "#33201d", muted: "#7a605c", line: "#e4d5d1", panel: "#ffffff", soft: "#f7efec", bg: "#f3e9e5", surface: "#fdfbfa", green: "#2f7a62", red: "#b44a3f", amber: "#c18625" },
  violet: { name: "紫罗兰", accent: "#6b4fa0", ink: "#241d33", muted: "#6b6079", line: "#ddd6e8", panel: "#ffffff", soft: "#f2eef8", bg: "#ede8f3", surface: "#fcfbfe", green: "#2f7a62", red: "#ad5149", amber: "#c18625" },
  amber: { name: "琥珀", accent: "#c07a1e", ink: "#2f2517", muted: "#776754", line: "#e5dcc9", panel: "#fffdf7", soft: "#f7f1e4", bg: "#f2ebdd", surface: "#fdfbf5", green: "#2f7a62", red: "#ad5149", amber: "#b96d16" },
  slate: { name: "石墨", accent: "#40546a", ink: "#202932", muted: "#5f6c78", line: "#d3dae1", panel: "#ffffff", soft: "#eef1f4", bg: "#e8ecef", surface: "#fafbfc", green: "#2f7a62", red: "#ad5149", amber: "#c18625" },
  midnight: { name: "深夜", dark: true, accent: "#7aa7d9", ink: "#e7ebf1", muted: "#94a0b0", line: "#2b3440", panel: "#1b212b", soft: "#242d39", bg: "#12161d", surface: "#181e27", green: "#6cc39f", red: "#e08d83", amber: "#e0b25c" },
};

const STORAGE_KEY = "ielts-writing-review-v4";
const LEGACY_KEYS = ["ielts-writing-review-v3", "ielts-writing-review-v2", "ielts-writing-review-v1"];
const PREF_KEY = "ielts-writing-review-preferences-v2";
const DATA_VERSION = 3;
const LIBRARY_PAGE_SIZE = 6;
const SUMMARY_DEFAULT =
  "大作文：先判断题型，再决定段落任务。单边讨论要立场清晰，双边讨论要两边都回应，问题措施要原因和措施对应，复合问题要逐问回答。\n\n小作文：先写总览，再分组写细节。不要一上来堆数字，先看最高、最低、变化最大、趋势相反。\n\n考前提醒：少写空泛词，多写具体动作；注意 government / environment / convenient / comparison 这些易错拼写。";

const _isLocalSecure =
  typeof window !== "undefined" &&
  ["https:", "http:"].includes(window.location?.protocol) &&
  (window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1" || window.location?.hostname === "::1" || window.location?.protocol === "https:");
const hasFSA =
  typeof window !== "undefined" &&
  _isLocalSecure &&
  "showOpenFilePicker" in window &&
  "showSaveFilePicker" in window &&
  "showDirectoryPicker" in window;

/* ---------------- 示例数据 ---------------- */

const demoEntries = [
  {
    id: "demo-task2",
    mode: "task2",
    title: "城市居民运动减少：原因与措施",
    essayType: "问题措施",
    topic: "健康",
    practiceDate: "2026-04-25",
    taskImage: "",
    prompt:
      "People are walking less than before. Why is this the case, and what measures can be taken to solve this problem?",
    meaning: "现在人们走路比以前少。为什么会这样？可以采取哪些措施解决这个问题？",
    draftHtml:
      "Nowadays, people walk less than before because they rely on cars and public transport too much.<br>Another reason is that many people have sedentary jobs and spend long hours in offices.<br><br>To solve this problem, governments should build safer walking paths and encourage people to walk one stop earlier. Companies can also remind employees to take active breaks during the working day.",
    modelHtml:
      "In many cities, walking has become a less common part of daily life, largely because modern transport has made short journeys effortless and office work has encouraged a sedentary routine.<br><br>A multi-pronged approach is therefore needed. Urban planners can create pedestrian-only zones and aesthetically pleasing walking paths, while employers can incentivize active breaks so that walking becomes a convenient habit again.",
    draftScore: "5.5",
    modelScore: "7",
    draftScores: { tr: "5", cc: "5.5", lr: "5.5", gra: "5" },
    modelScores: { tr: "7", cc: "7", lr: "7.5", gra: "7" },
    evaluation: [
      { title: "亮点", body: "用到了 sedentary jobs / long hours / one stop earlier 等具体表达，没有再像以前一样堆 there be 句型。段落意识比上次好，每个 point 后有一点展开。" },
      { title: "短板", body: "第二段 To solve this problem 后面的列举没有过渡，读起来像购物清单。rely on … too much 这种搭配可以更书面。没有总结句收尾。" },
      { title: "提升路径", body: "下一篇文章刻意练习：① 每个措施段用一句话总结；② 至少用 2 个非谓语做状语（而不是全用简单句开头）；③ 查一下 too much 在学术写作里的替换。" },
    ],
    bank: {
      collocations:
        "sedentary lifestyle 久坐的生活方式\ncity zoning 城市分区\nunderlying drivers 根本原因\na multi-pronged approach 多管齐下的方法\npedestrian-only zones 步行专区\nprioritise A over B\ndrive sb toward A rather than B\nincorporate ... into ...",
      synonyms:
        "health experts = health professionals\na discernible decline in = a noticeable decrease in\nmunicipal governments = public authorities",
      sentences:
        "This can be achieved by investing in + 名词\nA multi-pronged approach is needed to address this trend.",
      vocabulary: "incentivize 激励\ninfrastructural 基础设施的\naccessibility 可达性",
      ideas: "原因：久坐工作、汽车依赖、城市分区导致步行成本变高。\n解决：步行专区、安全道路、提前一站下车、公司健康激励。",
      keyNotes: "a multi-pronged approach：特别适合问题措施类作文，用在解决方案段开头。",
    },
    corrections: [
      {
        source: "rely on cars and public transport too much",
        fix: "modern transport has made short journeys effortless",
        reason: "too much 比较口语，范文表达更具体，也解释了为什么人们不走路。",
        comment: "可以记住 effortless 这个角度。",
        kind: "词汇",
      },
    ],
    stance: "核心观点：走路减少主要来自交通便利和久坐工作；解决方案要让步行重新变得安全、方便、有激励。",
    arguments:
      "原因：\n1. 个人：工作久坐，通勤依赖汽车或公共交通。\n2. 城市：城市分区让居住、工作、消费地点相隔较远，步行成本变高。\n\n解决：\n1. 政府/urban planners：建安全步道、步行专区、改善空气与交通安全。\n2. 公司/学校：鼓励走路休息、健康打卡。\n3. 个人：提前一站下车，把步行融入日常。",
  },
  {
    id: "demo-task1",
    mode: "task1",
    title: "能源使用变化折线图",
    essayType: "折线",
    topic: "",
    practiceDate: "2026-04-22",
    taskImage: "",
    prompt:
      "The graph below shows changes in the consumption of three energy sources in a country from 1990 to 2020.",
    meaning: "图表展示某国 1990 年到 2020 年三种能源消耗量的变化。",
    draftHtml:
      "The line graph shows the changes of three energy sources from 1990 to 2020. Overall, coal decreased while renewable energy increased.",
    modelHtml:
      "The line graph compares the consumption of three energy sources in a country between 1990 and 2020. Overall, coal use declined steadily, whereas renewable energy experienced a marked rise.",
    draftScore: "5",
    modelScore: "7",
    draftScores: { tr: "5", cc: "5", lr: "5", gra: "5" },
    modelScores: { tr: "7", cc: "7", lr: "7", gra: "7" },
    evaluation: [
      { title: "亮点", body: "Overall 句给出了主要趋势，没有堆数字，符合 Task 1 的概述要求。基本结构清楚。" },
      { title: "短板", body: "expression 重复（two shows / two changes），没有具体数据支撑。线条名称和趋势表达不够多样化。" },
      { title: "提升路径", body: "下一次练同一类型图时，要求在细节段写出至少 3 个具体数据点，同时练习 while/whereas/in contrast 三种对比句式。" },
    ],
    bank: {
      collocations: "a marked rise 明显上升\na steady decline 稳定下降\nenergy consumption 能源消耗\nreach a peak 达到峰值",
      chartWords: "show = compare / illustrate / present\nincrease = rise / grow / climb\ndecrease = decline / fall / drop",
      trendPhrases: "experience a rise\nwitness a decline\nreach a peak\nremain stable",
      sentences: "Overall, X declined steadily, whereas Y experienced a marked rise.\nThe figure for X stood at ... before falling to ...",
      vocabulary: "whereas 然而\nmarked 明显的",
      ideas: "Task 1 总览：coal 下降，renewables 上升，gas 相对稳定。",
      keyNotes: "Overall 句要优先写主趋势，不要堆具体数字。",
    },
    corrections: [
      {
        source: "shows the changes of three energy sources",
        fix: "compares the consumption of three energy sources",
        reason: "Task 1 常用 compare / illustrate；consumption 比 changes 更准确。",
        comment: "",
        kind: "词汇",
      },
    ],
    stance: "Task 1 不写观点，重点是总览趋势：谁上升、谁下降、谁最稳定。",
    arguments: "总览：coal 下降，renewables 上升，gas 相对稳定。\n细节段 1：描述 coal 和 gas。\n细节段 2：描述 renewables 的增长与最终位置。",
  },
];

/* ---------------- 状态 ---------------- */

const CORRECTION_FILTER_DEFAULT = Object.fromEntries(CORRECTION_KINDS.map((c) => [c.kind, true]));

const state = {
  entries: [],
  currentId: "",
  mode: "task2",
  libraryMode: "task2",
  libraryGroup: "all",
  libraryBankTab: "keyNotes",
  libraryPage: 1,
  bankTab: "collocations",
  selectedEditor: null,
  selectedText: "",
  highlightTarget: null,
  highlightLabels: Object.fromEntries(HIGHLIGHTS),
  bankLabels: clone(BANK_SCHEMAS),
  editingBankLabels: false,
  examSummary: SUMMARY_DEFAULT,
  editingSummary: false,
  theme: "ocean",
  correctionFilter: { ...CORRECTION_FILTER_DEFAULT },
  // —— 文件同步 ——
  fileHandle: null,
  fileName: "",
  pendingFileName: "",
  autoSave: true,
  fileLastSaved: "",
  // 绑定文件时记录的磁盘文件最后修改时间，用于写入前冲突检测
  fileLastModified: null,
};

/* ---------------- DOM 引用 ---------------- */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  appShell: $("#appShell"),
  welcomeView: $("#welcomeView"),
  libraryView: $("#libraryView"),
  detailView: $("#detailView"),
  metricGrid: $("#metricGrid"),
  entryList: $("#entryList"),
  entrySearch: $("#entrySearch"),
  typeFilter: $("#typeFilter"),
  topicFilter: $("#topicFilter"),
  topicFilterField: $("#topicFilterField"),
  promptCard: $("#promptCard"),
  essayType: $("#essayType"),
  topicSelect: $("#topicSelect"),
  topicField: $("#topicField"),
  entryModeLabel: $("#entryModeLabel"),
  entryTitle: $("#entryTitle"),
  promptText: $("#promptText"),
  meaningText: $("#meaningText"),
  practiceDate: $("#practiceDate"),
  entrySource: $("#entrySource"),
  taskImageField: $("#taskImageField"),
  taskImageInput: $("#taskImageInput"),
  taskImagePreview: $("#taskImagePreview"),
  removeTaskImageBtn: $("#removeTaskImageBtn"),
  imageModal: $("#imageModal"),
  imageModalImg: $("#imageModalImg"),
  imageModalClose: $("#imageModalClose"),
  draftEditor: $("#draftEditor"),
  modelEditor: $("#modelEditor"),
  draftScore: $("#draftScore"),
  modelScore: $("#modelScore"),
  draftScoreTR: $("#draftScoreTR"),
  draftScoreCC: $("#draftScoreCC"),
  draftScoreLR: $("#draftScoreLR"),
  draftScoreGRA: $("#draftScoreGRA"),
  modelScoreTR: $("#modelScoreTR"),
  modelScoreCC: $("#modelScoreCC"),
  modelScoreLR: $("#modelScoreLR"),
  modelScoreGRA: $("#modelScoreGRA"),
  draftScoreAvg: $("#draftScoreAvg"),
  modelScoreAvg: $("#modelScoreAvg"),
  draftStats: $("#draftStats"),
  modelStats: $("#modelStats"),
  bankText: $("#bankText"),
  stanceText: $("#stanceText"),
  argumentsText: $("#argumentsText"),
  correctionList: $("#correctionList"),
  correctionFilterBar: $("#correctionFilterBar"),
  correctionTemplate: $("#correctionTemplate"),
  evaluationList: $("#evaluationList"),
  addEvalSectionBtn: $("#addEvalSectionBtn"),
  evalSectionTemplate: $("#evalSectionTemplate"),
  selectionToolbar: $("#selectionToolbar"),
  highlightToolbar: $("#highlightToolbar"),
  clearHighlightBtn: $("#clearHighlightBtn"),
  highlightLegend: $("#highlightLegend"),
  bankSubmenu: $("#bankSubmenu"),
  detailBankTabs: $("#detailBankTabs"),
  editBankLabelsBtn: $("#editBankLabelsBtn"),
  bankLabelEditor: $("#bankLabelEditor"),
  thinkingPrimaryLabel: $("#thinkingPrimaryLabel"),
  thinkingSecondaryLabel: $("#thinkingSecondaryLabel"),
  summaryDisplay: $("#summaryDisplay"),
  summaryEditor: $("#summaryEditor"),
  editSummaryBtn: $("#editSummaryBtn"),
  saveSummaryBtn: $("#saveSummaryBtn"),
  openLibraryBtn: $("#openLibraryBtn"),
  libraryHomeBtn: $("#libraryHomeBtn"),
  libraryGroupLabel: $("#libraryGroupLabel"),
  libraryGroupSelect: $("#libraryGroupSelect"),
  libraryBankTabs: $("#libraryBankTabs"),
  libraryContent: $("#libraryContent"),
  libraryPagination: $("#libraryPagination"),
  exportEntryBtn: $("#exportEntryBtn"),
  importEntryBtn: $("#importEntryBtn"),
  importModal: $("#importModal"),
  importText: $("#importText"),
  importModalClose: $("#importModalClose"),
  importCancelBtn: $("#importCancelBtn"),
  importConfirmBtn: $("#importConfirmBtn"),
  syncStatus: $("#syncStatus"),
  syncBadge: $("#syncBadge"),
  openFileBtn: $("#openFileBtn"),
  createFileBtn: $("#createFileBtn"),
  saveFileBtn: $("#saveFileBtn"),
  autoSaveToggle: $("#autoSaveToggle"),
  themeSwatches: $("#themeSwatches"),
  themeToggleBtn: $("#themeToggleBtn"),
  themePopover: $("#themePopover"),
  fileOpenInput: $("#fileOpenInput"),
};

/* ---------------- 基础工具 ---------------- */

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wordCount(text) {
  const words = text.trim().match(/[A-Za-z]+(?:[-'][A-Za-z]+)?|\d+(?:\.\d+)?/g);
  return words ? words.length : 0;
}

function appendLine(existing, line) {
  const next = String(line || "").trim();
  if (!next) return existing || "";
  return existing ? `${existing.trim()}\n${next}` : next;
}

function textToHtml(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function getDateTime(date) {
  const time = new Date(date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function blend(hex, towardHex, ratio) {
  const a = hexToRgb(hex);
  const b = hexToRgb(towardHex);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * ratio));
  return `rgb(${c.join(", ")})`;
}

function hexToRgba(hex, alpha) {
  return `rgba(${hexToRgb(hex).join(", ")}, ${alpha})`;
}

/* ---------------- Toast 提示 ---------------- */

function showToast(message, type = "ok") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 260);
  }, 2600);
}

/* ---------------- 主题 ---------------- */

function applyTheme(name) {
  const theme = THEMES[name] || THEMES.ocean;
  const root = document.documentElement;
  root.dataset.theme = name;
  root.classList.toggle("dark", Boolean(theme.dark));
  const set = (key, value) => root.style.setProperty(`--${key}`, value);
  set("accent", theme.accent);
  set("green", theme.green);
  set("red", theme.red);
  set("amber", theme.amber);
  set("ink", theme.ink);
  set("muted", theme.muted);
  set("line", theme.line);
  set("panel", theme.panel);
  set("soft", theme.soft);
  set("bg", theme.bg);
  set("surface", theme.surface);
  set("accent-hover", blend(theme.accent, theme.dark ? "#000000" : "#ffffff", theme.dark ? 0.14 : 0.16));
  state.theme = name;
  renderThemeSwatches();
}

function renderThemeSwatches() {
  els.themeSwatches.innerHTML = Object.entries(THEMES)
    .map(
      ([key, theme]) => `
      <button
        class="theme-swatch ${key === state.theme ? "active" : ""}"
        data-theme-key="${key}"
        type="button"
        title="${theme.name}${theme.dark ? "（深色）" : ""}"
        style="--swatch:${theme.accent}"
      >
        <span class="theme-swatch-dot"></span>
        <span class="theme-swatch-name">${theme.name}</span>
      </button>`,
    )
    .join("");
  els.themeToggleBtn.style.color = THEMES[state.theme]?.accent || "";
}

/* ============================================================
 * 自定义下拉框（替代原生 select，优化 UI）
 * 保留原生 select 作为值容器，外部代码读/写 .value 仍有效。
 * ============================================================ */

const activeSelects = new Set();

class CustomSelect {
  constructor(select) {
    this.select = select;
    this.panel = null;
    this.activeIndex = -1;

    const wrapper = document.createElement("div");
    wrapper.className = "dd";
    wrapper.innerHTML = `
      <button type="button" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="dd-label"></span>
        <span class="dd-arrow" aria-hidden="true"></span>
      </button>`;
    this.wrapper = wrapper;
    this.trigger = wrapper.querySelector(".dd-trigger");
    this.label = wrapper.querySelector(".dd-label");

    select.classList.add("native-select");
    select.setAttribute("tabindex", "-1");
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    select.__dd = this;
    activeSelects.add(this);
    this.bindTrigger();
    this.sync();
  }

  optionList() {
    return [...this.select.options];
  }

  sync() {
    const index = this.select.selectedIndex;
    const option = this.select.options[index];
    const text = option ? option.textContent.trim() : "";
    this.label.textContent = text;
    this.label.title = text;
    if (this.panel && this.panel.isConnected) this.buildPanel();
  }

  buildPanel() {
    const panel = document.createElement("div");
    panel.className = "dd-panel";
    panel.setAttribute("role", "listbox");
    panel.tabIndex = -1;

    [...this.select.options].forEach((option, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `dd-option${i === this.select.selectedIndex ? " active" : ""}`;
      button.dataset.index = String(i);
      button.setAttribute("role", "option");
      const text = option.textContent.trim();
      const desc = option.dataset?.desc || "";
      button.innerHTML = `<span class="dd-option-copy"><span class="dd-option-text"></span>${desc ? `<em class="dd-option-desc"></em>` : ""}</span><span class="dd-check" aria-hidden="true">✓</span>`;
      button.querySelector(".dd-option-text").textContent = text;
      if (desc) button.querySelector(".dd-option-desc").textContent = desc;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.choose(i);
      });
      button.addEventListener("mouseenter", () => {
        this.activeIndex = i;
        this.highlight();
      });
      panel.appendChild(button);
    });

    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
        this.trigger.focus();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        this.move(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        this.move(-1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (this.activeIndex >= 0) this.choose(this.activeIndex);
      }
    });

    this.panel = panel;
  }

  open() {
    if (this.panel && this.panel.isConnected) return;
    activeSelects.forEach((select) => {
      if (select !== this) select.close();
    });
    this.buildPanel();
    document.body.appendChild(this.panel);
    this.wrapper.classList.add("open");
    this.trigger.setAttribute("aria-expanded", "true");
    this.positionPanel();
    this.activeIndex = this.select.selectedIndex >= 0 ? this.select.selectedIndex : 0;
    this.highlight();
    this.panel.focus({ preventScroll: true });
  }

  positionPanel() {
    const rect = this.trigger.getBoundingClientRect();
    const panel = this.panel;
    panel.style.minWidth = `${rect.width}px`;
    panel.style.width = "max-content";
    panel.style.maxWidth = `${Math.min(360, window.innerWidth - 16)}px`;
    const maxLeft = Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8));
    panel.style.left = `${maxLeft}px`;
    const height = panel.offsetHeight;
    const top = rect.bottom + 4;
    if (top + height > window.innerHeight - 8) {
      panel.style.top = `${Math.max(8, rect.top - height - 4)}px`;
      panel.classList.add("flip");
    } else {
      panel.style.top = `${top}px`;
      panel.classList.remove("flip");
    }
  }

  highlight() {
    if (!this.panel) return;
    const options = this.panel.querySelectorAll(".dd-option");
    options.forEach((button, i) => button.classList.toggle("hover", i === this.activeIndex));
    options[this.activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  move(delta) {
    const count = this.select.options.length;
    if (!count) return;
    if (this.activeIndex < 0) this.activeIndex = this.select.selectedIndex >= 0 ? this.select.selectedIndex : 0;
    this.activeIndex = (this.activeIndex + delta + count) % count;
    this.highlight();
  }

  choose(index) {
    const option = this.select.options[index];
    if (!option) return;
    if (this.select.value !== option.value) {
      this.select.value = option.value;
      this.select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    this.close();
    this.sync();
    this.trigger.focus();
  }

  close() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
    this.wrapper.classList.remove("open");
    this.trigger.setAttribute("aria-expanded", "false");
  }

  bindTrigger() {
    this.trigger.addEventListener("click", () => {
      if (this.panel && this.panel.isConnected) this.close();
      else this.open();
    });
    this.trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.open();
        if (event.key === "ArrowDown") this.move(1);
        if (event.key === "ArrowUp") this.move(-1);
      }
    });
  }
}

function enhanceSelect(select) {
  if (!select || select.__dd) return;
  // eslint-disable-next-line no-new
  new CustomSelect(select);
}

function pruneInactiveSelects() {
  for (const widget of [...activeSelects]) {
    if (!widget.select.isConnected) {
      widget.close();
      activeSelects.delete(widget);
    }
  }
}

function closeAllSelects() {
  pruneInactiveSelects();
  activeSelects.forEach((widget) => widget.close());
}

function syncAllSelects() {
  pruneInactiveSelects();
  activeSelects.forEach((widget) => widget.sync());
}

/* ============================================================
 * 数据加载 / 规范化 / 持久化
 * ============================================================ */

function normalizeScore(score) {
  const value = String(score ?? "");
  return SCORE_OPTIONS.includes(value) ? value : "";
}

function normalizeDimScores(scores = {}) {
  return {
    tr: normalizeScore(scores.tr),
    cc: normalizeScore(scores.cc),
    lr: normalizeScore(scores.lr),
    gra: normalizeScore(scores.gra),
  };
}

function normalizeEvaluation(entry) {
  if (Array.isArray(entry.evaluation) && entry.evaluation.length > 0) {
    return entry.evaluation.filter((s) => s.title || s.body);
  }
  // 旧文章没有 evaluation → 自动给默认三段
  return [
    { title: "亮点", body: "" },
    { title: "短板", body: "" },
    { title: "提升路径", body: "" },
  ];
}

function normalizeEssayType(mode, type) {
  const options = TASK_TYPES[mode] || TASK_TYPES.task2;
  if (options.includes(type)) return type;
  if (["问题解决", "报告类"].includes(type)) return "问题措施";
  if (["观点类", "是否同意", "优缺点"].includes(type)) return "单边讨论";
  if (type === "折线图") return "折线";
  if (type === "柱状图") return "柱状";
  return options[0];
}

function inferTopic(tags = "") {
  return TASK2_TOPICS.find((topic) => tags.includes(topic)) || "";
}

function normalizeCorrection(correction) {
  const reason = correction.reason || "";
  const comment = correction.comment || "";
  // 原因与提升说明合并进"批注"一个字段
  const mergedComment = [reason, comment].filter(Boolean).join(comment && reason ? "\n" : "");
  const kind = CORRECTION_KINDS.some((c) => c.kind === correction.kind) ? correction.kind : "语法";
  return {
    source: correction.source || "",
    fix: correction.fix || "",
    comment: mergedComment,
    kind,
  };
}

function normalizeEntry(entry) {
  const inferredTopic = entry.topic || inferTopic(entry.tags);
  return {
    ...entry,
    essayType: normalizeEssayType(entry.mode, entry.essayType),
    topic: entry.mode === "task2" ? inferredTopic || TASK2_TOPICS[0] : "",
    practiceDate: entry.practiceDate || "",
    source: entry.source || "",
    taskImage: entry.taskImage || "",
    prompt: entry.prompt || "",
    meaning: entry.meaning || "",
    draftHtml: cleanEditorHtml(entry.draftHtml || textToHtml(entry.draft || "")),
    modelHtml: cleanEditorHtml(entry.modelHtml || textToHtml(entry.model || "")),
    draftScore: normalizeScore(entry.draftScore),
    modelScore: normalizeScore(entry.modelScore),
    draftScores: normalizeDimScores(entry.draftScores),
    modelScores: normalizeDimScores(entry.modelScores),
    bank: {
      collocations: "",
      synonyms: "",
      sentences: "",
      vocabulary: "",
      ideas: "",
      keyNotes: "",
      chartWords: "",
      trendPhrases: "",
      ...(entry.bank || {}),
    },
    corrections: (entry.corrections || []).map(normalizeCorrection),
    evaluation: normalizeEvaluation(entry),
    stance: entry.stance || "",
    arguments: entry.arguments || "",
  };
}

function mergeHighlightLabels(labels = {}) {
  const merged = { ...Object.fromEntries(HIGHLIGHTS) };
  Object.entries(labels || {}).forEach(([color, label]) => {
    merged[HIGHLIGHT_COLOR_MIGRATIONS[color] || color] = label;
  });
  return merged;
}

function mergeBankLabels(labels = {}) {
  return {
    task2: { ...BANK_SCHEMAS.task2, ...(labels.task2 || {}) },
    task1: { ...BANK_SCHEMAS.task1, ...(labels.task1 || {}) },
  };
}

function buildPreferences() {
  return {
    highlightLabels: { ...state.highlightLabels },
    bankLabels: clone(state.bankLabels),
    examSummary: state.examSummary,
    theme: state.theme,
    correctionFilter: { ...state.correctionFilter },
    file: { name: state.fileName, autoSave: state.autoSave },
  };
}

function buildDataFile() {
  updateCurrentFromInputs();
  return {
    app: "ielts-writing-review",
    version: DATA_VERSION,
    kind: "data",
    exportedAt: new Date().toISOString(),
    entries: clone(state.entries),
    preferences: buildPreferences(),
  };
}

/* 数据迁移：统一入口，旧版本/无版本数据一律经 normalizeEntry 归一化，
 * 返回最新版本号。migrated 为 true 表示数据被升级过（可在后续保存时回写）。 */
function migrateData(data) {
  const version = Number(data?.version) || 0;
  let entries = Array.isArray(data) ? data : data.entries;
  if (!Array.isArray(entries)) throw new Error("Invalid data file");
  return {
    version: DATA_VERSION,
    migrated: version !== DATA_VERSION,
    entries: entries.map(normalizeEntry),
    preferences: data?.preferences || {},
  };
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);
    state.highlightLabels = mergeHighlightLabels(prefs.highlightLabels);
    state.bankLabels = mergeBankLabels(prefs.bankLabels);
    state.examSummary = prefs.examSummary || state.examSummary;
    if (THEMES[prefs.theme]) state.theme = prefs.theme;
    if (prefs.correctionFilter) state.correctionFilter = { ...CORRECTION_FILTER_DEFAULT, ...prefs.correctionFilter };
    state.fileName = prefs.file?.name || "";
    state.autoSave = prefs.file?.autoSave ?? true;
  } catch {
    /* 偏好损坏时忽略，使用默认值 */
  }
}

function loadLocalEntries() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      state.entries = JSON.parse(stored).map(normalizeEntry);
      persist({ skipFile: true });
      return;
    } catch {
      /* 继续向下尝试旧版本 */
    }
  }
  const legacyValue = LEGACY_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (legacyValue) {
    state.entries = JSON.parse(legacyValue).map(normalizeEntry);
    persist({ skipFile: true });
    return;
  }
  state.entries = clone(demoEntries).map(normalizeEntry);
  persist({ skipFile: true });
}

let persistTimer = null;
function flushPersist() {
  persistTimer = null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    localStorage.setItem(PREF_KEY, JSON.stringify(buildPreferences()));
  } catch (error) {
    console.warn("localStorage 写入失败", error);
  }
}

function persist({ skipFile = false } = {}) {
  if (!skipFile && state.fileHandle && state.autoSave) scheduleFileSave();
  // localStorage 写入防抖：连续输入只写一次，页面关闭前强制落盘
  clearTimeout(persistTimer);
  persistTimer = setTimeout(flushPersist, 400);
}

function makeEmptyEntry(mode = state.mode) {
  return normalizeEntry({
    id: `entry-${Date.now()}`,
    mode,
    title: mode === "task2" ? "新的大作文复盘" : "新的小作文复盘",
    essayType: TASK_TYPES[mode][0],
    topic: mode === "task2" ? TASK2_TOPICS[0] : "",
    practiceDate: new Date().toISOString().slice(0, 10),
    source: "",
    taskImage: "",
    prompt: "",
    meaning: "",
    draftHtml: "",
    modelHtml: "",
    draftScore: "",
    modelScore: "",
    draftScores: {},
    modelScores: {},
    bank: {},
    corrections: [],
    evaluation: [
      { title: "亮点", body: "" },
      { title: "短板", body: "" },
      { title: "提升路径", body: "" },
    ],
    stance: "",
    arguments: "",
  });
}

function currentEntry() {
  return state.entries.find((entry) => entry.id === state.currentId);
}

/* ============================================================
 * JSON 文件同步（坚果云跨设备）
 * ============================================================ */

function openHandleDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("iwr-file-handles", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("handles");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = reject;
    transaction.onabort = reject;
  });
}

async function storeFileHandle(handle) {
  try {
    const db = await openHandleDB();
    const transaction = db.transaction("handles", "readwrite");
    transaction.objectStore("handles").put(handle, "main");
    await transactionDone(transaction);
  } catch (error) {
    console.warn("无法保存文件句柄", error);
  }
}

async function getStoredFileHandle() {
  try {
    const db = await openHandleDB();
    const transaction = db.transaction("handles", "readonly");
    return await requestToPromise(transaction.objectStore("handles").get("main"));
  } catch {
    return null;
  }
}

function mergePreferences(prefs = {}) {
  if (prefs.highlightLabels) state.highlightLabels = mergeHighlightLabels(prefs.highlightLabels);
  if (prefs.bankLabels) state.bankLabels = mergeBankLabels(prefs.bankLabels);
  if (prefs.examSummary) state.examSummary = prefs.examSummary;
  if (THEMES[prefs.theme]) state.theme = prefs.theme;
  if (prefs.correctionFilter) state.correctionFilter = { ...CORRECTION_FILTER_DEFAULT, ...prefs.correctionFilter };
}

function parseDataText(text) {
  return migrateData(JSON.parse(text));
}

async function adoptFile(handle, text, autoSave = true, nameOverride = "") {
  try {
    const { entries, preferences } = parseDataText(text);
    state.entries = entries.map(normalizeEntry);
    mergePreferences(preferences);
    state.currentId = "";
    state.mode = "task2";
    state.libraryMode = "task2";
    state.libraryGroup = "all";
    state.libraryPage = 1;
    state.bankTab = "collocations";
    state.fileHandle = handle || null;
    state.fileLastModified = handle ? (await handle.getFile()).lastModified : null;
    state.fileName = nameOverride || handle?.name || preferences.file?.name || "已选择的文件";
    state.autoSave = autoSave;
    state.pendingFileName = "";
    if (handle) await storeFileHandle(handle);
    applyTheme(state.theme);
    persist();
    renderAll();
    renderSyncStatus();
    showToast(`已加载「${state.fileName}」· ${state.entries.length} 篇`);
  } catch (error) {
    showToast(`读取文件失败：${error.message}`, "error");
  }
}

async function bindDataFile() {
  if (state.entries.length && !state.fileHandle) {
    const proceed = window.confirm(
      `当前浏览器里已有 ${state.entries.length} 篇记录。\n\n打开文件后，数据会切换到所选文件中的内容（本地现有记录会被覆盖，可先点「导出备份」留存）。\n\n确定继续吗？`,
    );
    if (!proceed) return;
  }
  if (hasFSA) {
    let handle;
    try {
      const picks = await window.showOpenFilePicker({
        types: [{ description: "JSON 数据文件", accept: { "application/json": [".json"] } }],
        multiple: false,
      });
      handle = picks[0];
    } catch (error) {
      if (error?.name !== "AbortError") showToast(`打开失败：${error.message}`, "error");
      return;
    }
    const file = await handle.getFile();
    const text = await file.text();
    await adoptFile(handle, text, true);
    return;
  }
  // 回退：文件选择器（无法自动写回，只能手动保存）
  els.fileOpenInput.value = "";
  els.fileOpenInput.click();
}

// 坚果云目录里没有现成文件时：让用户选定文件夹，应用自动在里面创建并绑定
async function createDataFile() {
  if (hasFSA) {
    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (error) {
      if (error?.name !== "AbortError") showToast(`选择目录失败：${error.message}`, "error");
      return;
    }
    const permission = await dirHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      const granted = await dirHandle.requestPermission({ mode: "readwrite" });
      if (granted !== "granted") {
        showToast("没有写入权限，无法在该目录创建文件", "error");
        return;
      }
    }
    const fileName = "ielts-writing-review-data.json";
    // 同名文件已存在则确认是否覆盖
    let exists = true;
    try {
      await dirHandle.getFileHandle(fileName, { create: false });
    } catch {
      exists = false;
    }
    if (exists && !window.confirm(`该目录下已存在「${fileName}」，新建会覆盖它的内容。确定继续吗？`)) {
      return;
    }
    let fileHandle;
    try {
      fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    } catch (error) {
      showToast(`创建文件失败：${error.message}`, "error");
      return;
    }
    // 用当前数据初始化新文件，之后自动保存
    state.fileHandle = fileHandle;
    state.fileLastModified = null;
    state.fileName = fileName;
    state.autoSave = true;
    state.pendingFileName = "";
    await storeFileHandle(fileHandle);
    const ok = await writeToFile();
    if (ok) {
      renderSyncStatus();
      showToast(`已在所选目录创建并绑定「${fileName}」，之后的改动会自动保存`);
    }
    return;
  }
  // 无 FSA：无法直接写入指定目录，导出数据文件后手动放入坚果云目录
  downloadDataFile();
  showToast(`已导出数据文件。${fsaReason()} 请把它放到坚果云目录，再点「打开/绑定文件」选择它。`, "error");
}

let fileWriteChain = Promise.resolve();

function writeToFile() {
  // 串行化写入，避免连续自动保存时并发写同一文件
  fileWriteChain = fileWriteChain.then(performWriteToFile).catch(() => {});
  return fileWriteChain;
}

async function performWriteToFile() {
  if (!state.fileHandle) return false;
  try {
    const permission = await state.fileHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      const requested = await state.fileHandle.requestPermission({ mode: "readwrite" });
      if (requested !== "granted") {
        showToast("没有写入权限，请重新绑定文件", "error");
        return false;
      }
    }
    // 冲突检测：文件自绑定以来被其他设备/程序改过 → 提示是否覆盖
    if (state.fileLastModified != null) {
      const diskFile = await state.fileHandle.getFile();
      if (diskFile.lastModified !== state.fileLastModified) {
        const overwrite = window.confirm(
          `文件「${state.fileName}」自加载后已被其他设备或程序修改过。\n继续保存会覆盖这些外部修改。\n\n确定覆盖吗？`,
        );
        if (!overwrite) {
          showToast("已取消保存，避免覆盖外部修改", "error");
          return false;
        }
      }
    }
    const writable = await state.fileHandle.createWritable();
    await writable.write(JSON.stringify(buildDataFile(), null, 2));
    await writable.close();
    const savedFile = await state.fileHandle.getFile();
    state.fileLastModified = savedFile.lastModified;
    state.fileLastSaved = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    renderSyncStatus();
    return true;
  } catch (error) {
    console.error(error);
    showToast(`保存失败：${error.message}`, "error");
    return false;
  }
}

let saveTimer = null;
function scheduleFileSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (state.fileHandle && state.autoSave) writeToFile();
  }, 800);
}

function downloadDataFile() {
  const blob = new Blob([JSON.stringify(buildDataFile(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ielts-writing-review-data.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function restoreFileBinding() {
  const handle = await getStoredFileHandle();
  if (!handle) return false;
  try {
    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      state.pendingFileName = handle.name || state.pendingFileName;
      renderSyncStatus();
      return false;
    }
    const file = await handle.getFile();
    const text = await file.text();
    const { entries, preferences } = parseDataText(text);
    state.entries = entries.map(normalizeEntry);
    mergePreferences(preferences);
    state.fileHandle = handle;
    state.fileLastModified = file.lastModified;
    state.fileName = handle.name || state.fileName;
    state.pendingFileName = "";
    applyTheme(state.theme);
    persist();
    renderAll();
    renderSyncStatus();
    return true;
  } catch (error) {
    console.warn("恢复文件绑定失败", error);
    renderSyncStatus();
    return false;
  }
}

function fsaReason() {
  if (hasFSA) return "";
  const protocol = window.location?.protocol || "";
  const host = window.location?.hostname || "";
  if (protocol === "file:") {
    return "当前是以本地文件方式打开的（file://），浏览器不允许网页写回本地文件。请改从 http://localhost:8123 打开（在该目录运行 python -m http.server 8123），或部署到 HTTPS 后使用。";
  }
  if (protocol === "http:" && !["localhost", "127.0.0.1", "::1"].includes(host)) {
    return "当前是 http 访问且不是 localhost。浏览器只允许 HTTPS 或 localhost 环境直接写回文件，请改用 HTTPS 或在本地 localhost 打开。";
  }
  if (!("showOpenFilePicker" in window) || !("showDirectoryPicker" in window)) {
    return "当前浏览器不支持文件系统访问（文件自动写回需要 Chrome 或 Edge）。";
  }
  return "当前环境暂不支持直接写回文件，只能用「保存到文件」手动导出 JSON。";
}

function renderSyncStatus() {
  const reason = fsaReason();
  if (!state.fileHandle) {
    if (state.pendingFileName) {
      els.syncStatus.textContent = `上次绑定「${state.pendingFileName}」待授权，重新打开文件即可继续同步`;
      els.syncBadge.textContent = "待授权";
      els.syncBadge.className = "sync-badge local";
    } else {
      els.syncStatus.textContent = "未绑定文件 · 数据保存在浏览器本地";
      els.syncBadge.textContent = "本地";
      els.syncBadge.className = "sync-badge local";
      if (reason) {
        const short = reason.includes("file://")
          ? " · 以文件方式打开，无法写回，请用 localhost 访问"
          : reason.includes("localhost")
            ? " · 需 HTTPS 或 localhost 才能写回"
            : " · 需 Chrome/Edge 才能写回";
        els.syncStatus.textContent += short;
        els.syncStatus.title = reason;
      }
    }
  } else {
    els.syncStatus.textContent = state.fileLastSaved
      ? `已绑定 ${state.fileName} · ${state.fileLastSaved} 保存`
      : `已绑定 ${state.fileName}`;
    els.syncBadge.textContent = "已同步";
    els.syncBadge.className = "sync-badge synced";
  }
  els.autoSaveToggle.checked = state.autoSave;
}

/* ---------------- 备份导入 / 导出 ---------------- */

function downloadBackup() {
  const backup = buildDataFile();
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ielts-writing-review-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const data = JSON.parse(String(reader.result || ""));
      const migrated = migrateData(data);
      const entries = migrated.entries;
      if (!window.confirm("导入后会替换当前的所有复盘数据（包括已绑定文件里的内容），确定继续吗？")) return;

      state.entries = entries.map(normalizeEntry);
      mergePreferences(migrated.preferences);
      state.currentId = "";
      state.mode = "task2";
      state.libraryMode = "task2";
      state.libraryGroup = "all";
      state.libraryPage = 1;
      state.bankTab = "collocations";
      applyTheme(state.theme);
      persist();
      renderAll();
      renderSyncStatus();
      window.alert("导入完成。");
    } catch {
      window.alert("导入失败，请确认选择的是 IELTS Writing Review 的 JSON 备份文件。");
    } finally {
      els.importBackupInput.value = "";
    }
  });
  reader.readAsText(file);
}

/* ---------------- 导出单篇复盘（Markdown） ---------------- */

function htmlToText(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

function exportEntryMarkdown() {
  const entry = currentEntry();
  if (!entry) return;
  const lines = [];
  lines.push(`# ${entry.title || "未命名复盘"}`);
  lines.push("");
  const sourcePart = entry.source ? ` · 来源：${entry.source}` : "";
  lines.push(`- 类型：${entry.mode === "task2" ? "大作文" : "小作文"} · ${entry.essayType}${entry.topic ? ` · ${entry.topic}` : ""} · ${entry.practiceDate || "未记录日期"}${sourcePart}`);
  if (entry.prompt) {
    lines.push("", "## 题目");
    lines.push(entry.prompt);
  }
  if (entry.meaning) {
    lines.push("", "## 题目意思（中文）");
    lines.push(entry.meaning);
  }
  const draft = htmlToText(entry.draftHtml);
  const model = htmlToText(entry.modelHtml);
  if (draft) {
    lines.push("", "## 我的版本");
    lines.push(draft);
  }
  if (model) {
    lines.push("", "## 范文版本");
    lines.push(model);
  }
  const scoreLine = (label, score, dims) => {
    const parts = [];
    if (score) parts.push(`总分 ${score}`);
    if (dims) {
      ["tr", "cc", "lr", "gra"].forEach((key) => {
        if (dims[key]) parts.push(`${key.toUpperCase()} ${dims[key]}`);
      });
    }
    return parts.length ? `${label}：${parts.join(" · ")}` : "";
  };
  const draftScoreLine = scoreLine("我的版本", entry.draftScore, entry.draftScores);
  const modelScoreLine = scoreLine("范文版本", entry.modelScore, entry.modelScores);
  if (draftScoreLine || modelScoreLine) {
    lines.push("", "## 得分");
    if (draftScoreLine) lines.push(draftScoreLine);
    if (modelScoreLine) lines.push(modelScoreLine);
  }
  if (entry.evaluation?.length) {
    lines.push("", "## 评语");
    entry.evaluation.forEach((section) => {
      lines.push(`### ${section.title || "段落"}`);
      lines.push(section.body || "");
      lines.push("");
    });
  }
  if (entry.corrections?.length) {
    lines.push("", "## 错误标注");
    entry.corrections.forEach((correction, index) => {
      lines.push(`**${index + 1}. [${correction.kind}] ${correction.source}**`);
      if (correction.fix) lines.push(`- 修改：${correction.fix}`);
      if (correction.comment) lines.push(`- 批注：${correction.comment}`);
    });
  }
  const bankEntries = Object.entries(entry.bank || {}).filter(([, value]) => value && value.trim());
  if (bankEntries.length) {
    lines.push("", "## 素材沉淀");
    const schema = getBankSchema(entry.mode);
    bankEntries.forEach(([key, value]) => {
      lines.push(`### ${schema[key] || key}`);
      lines.push(value);
      lines.push("");
    });
  }
  if (entry.stance) {
    lines.push("", "## 整体思路");
    lines.push(entry.stance);
  }
  if (entry.arguments) {
    lines.push("", "## 论点与论据");
    lines.push(entry.arguments);
  }
  const markdown = `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(entry.title || "复盘").replace(/[\\/:*?"<>|]/g, "_")}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("已导出复盘 Markdown");
}

/* ---------------- 批改结果一键导入 ---------------- */

const IMPORT_SECTIONS = ["【分数】", "【评语】", "【错误】", "【表达】", "【范文】", "【思路】"];

/* 取某个标记段落的正文（到下一个标记为止） */
function importSection(text, marker) {
  const start = text.indexOf(marker);
  if (start < 0) return "";
  const from = start + marker.length;
  let end = text.length;
  for (const other of IMPORT_SECTIONS) {
    if (other === marker) continue;
    const idx = text.indexOf(other, from);
    if (idx > 0 && idx < end) end = idx;
  }
  return text.slice(from, end).trim();
}

function parseImportScores(text) {
  const scores = {};
  const grab = (key, pattern) => {
    const match = text.match(pattern);
    if (match) scores[key] = normalizeScore(match[1].trim());
  };
  grab("total", /总分[：:]\s*([\d.]+)/);
  ["tr", "cc", "lr", "gra"].forEach((dim) => {
    grab(dim, new RegExp(`${dim.toUpperCase()}[：:]?\\s*([\\d.]+)`, "i"));
  });
  return scores;
}

function parseImportEvaluation(text) {
  const result = [];
  text.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^(亮点|短板|提升路径)[：:]\s*(.*)$/);
    if (match) result.push({ title: match[1], body: match[2].trim() });
  });
  return result.length ? result : null;
}

/* 兼容两种错误行格式：
 * 新版：[类型] 原句：… ｜ 修改：… ｜ 批注：…
 * 旧版：[类型] 原句：… ｜ 原因：… ｜ 修改：… ｜ 提升：…
 * 原因/提升统一合并进"批注"字段 */
function parseImportCorrections(text) {
  const result = [];
  text.split(/\r?\n/).forEach((line) => {
    const typeMatch = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (!typeMatch) return;
    const kind = CORRECTION_KINDS.some((item) => item.kind === typeMatch[1].trim()) ? typeMatch[1].trim() : "其他";
    const fields = {};
    typeMatch[2].split("｜").forEach((segment) => {
      const match = segment.trim().match(/^(原句|原因|修改|提升|批注)[：:]\s*([\s\S]*)$/);
      if (match) fields[match[1]] = match[2].trim();
    });
    if (!fields["原句"]) return;
    const reason = fields["原因"] || "";
    const improvement = fields["提升"] || fields["批注"] || "";
    const comment = [reason, improvement].filter(Boolean).join(reason && improvement ? "\n" : "");
    result.push({ source: fields["原句"], fix: fields["修改"] || "", comment, kind });
  });
  return result;
}

function parseImportBank(text, mode) {
  const schema = getBankSchema(mode);
  const labelToKey = {};
  Object.entries(schema).forEach(([key, label]) => {
    labelToKey[label] = key;
    labelToKey[key] = key;
  });
  const bank = {};
  let current = null;
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    // 分类名作为分组标题（带冒号或单独一行都接受）
    const headerMatch = line.match(/^(.+?)[：:]\s*$/);
    if (headerMatch) {
      const key = labelToKey[headerMatch[1].trim()];
      if (key) {
        current = key;
        bank[current] = [];
      }
      return;
    }
    if (labelToKey[line]) {
      current = labelToKey[line];
      bank[current] = [];
      return;
    }
    if (!current) return;
    const item = line.replace(/^[-•*]\s*/, "").trim();
    if (item) bank[current].push(item);
  });
  return Object.fromEntries(Object.entries(bank).filter(([, items]) => items.length).map(([key, items]) => [key, items.join("\n")]));
}

function parseImportThinking(text) {
  const stanceMatch = text.match(/整体思路[：:]\s*([\s\S]*?)(?=\n*\s*论点与论据[：:]|$)/);
  const argsMatch = text.match(/论点与论据[：:]\s*([\s\S]*)$/);
  return {
    stance: stanceMatch ? stanceMatch[1].trim() : "",
    arguments: argsMatch ? argsMatch[1].trim() : "",
  };
}

function openImportModal() {
  els.importText.value = "";
  els.importModal.classList.remove("hidden");
  els.importText.focus();
}

function closeImportModal() {
  els.importModal.classList.add("hidden");
}

function applyParsedImport() {
  const entry = currentEntry();
  if (!entry) return;
  const raw = els.importText.value.trim();
  if (!raw) {
    showToast("请先粘贴批改结果", "error");
    return;
  }

  const scores = parseImportScores(importSection(raw, "【分数】"));
  const evalSections = parseImportEvaluation(importSection(raw, "【评语】"));
  const corrections = parseImportCorrections(importSection(raw, "【错误】"));
  const bank = parseImportBank(importSection(raw, "【表达】"), entry.mode);
  const model = importSection(raw, "【范文】");
  const thinking = parseImportThinking(importSection(raw, "【思路】"));

  if (scores.total) entry.draftScore = scores.total;
  SCORE_DIMENSIONS.forEach((dim) => {
    if (scores[dim.key]) entry.draftScores[dim.key] = scores[dim.key];
  });
  if (evalSections && evalSections.length) entry.evaluation = evalSections;
  if (corrections.length) entry.corrections.push(...corrections);
  Object.entries(bank).forEach(([key, value]) => {
    entry.bank[key] = appendLine(entry.bank[key], value);
  });
  if (model) entry.modelHtml = textToHtml(model);
  if (thinking.stance) entry.stance = thinking.stance;
  if (thinking.arguments) entry.arguments = thinking.arguments;

  persist();
  renderAll();
  closeImportModal();

  const parts = [];
  if (scores.total) parts.push(`分数 ${scores.total}`);
  if (evalSections && evalSections.length) parts.push(`评语 ${evalSections.length} 段`);
  if (corrections.length) parts.push(`错误 ${corrections.length} 条`);
  const bankCount = Object.values(bank).reduce((acc, value) => acc + value.split("\n").length, 0);
  if (bankCount) parts.push(`表达 ${bankCount} 条`);
  if (model) parts.push("范文");
  if (thinking.stance || thinking.arguments) parts.push("思路");
  showToast(parts.length ? `导入完成：${parts.join(" · ")}` : "未识别到可导入的内容，请确认格式", parts.length ? "ok" : "error");
}

/* ---------------- 渲染：选项与评分 ---------------- */

function bandDescFor(select, score) {
  const dim = SCORE_SELECT_DIMENSION[select.id];
  if (!dim || !score) return "";
  return BAND_DESCRIPTORS[dim]?.[score] || "";
}

function fillScoreSelect(select) {
  select.innerHTML = SCORE_OPTIONS.map((score) => {
    const desc = bandDescFor(select, score);
    const attr = desc ? ` title="${escapeHtml(desc)}" data-desc="${escapeHtml(desc)}"` : "";
    return `<option value="${score}"${attr}>${score || "未记录"}</option>`;
  }).join("");
}

function renderTypeOptions() {
  const selectedTypeFilter = els.typeFilter.value || "all";
  const selectedEssayType = currentEntry()?.essayType || TASK_TYPES[state.mode][0];
  const options = TASK_TYPES[state.mode];
  els.typeFilter.innerHTML = `<option value="all">全部题型</option>${options
    .map((type) => `<option value="${type}">${type}</option>`)
    .join("")}`;
  els.typeFilter.value = options.includes(selectedTypeFilter) ? selectedTypeFilter : "all";
  els.essayType.innerHTML = options.map((type) => `<option value="${type}">${type}</option>`).join("");
  els.essayType.value = options.includes(selectedEssayType) ? selectedEssayType : options[0];
}

function renderScoreOptions() {
  [els.draftScore, els.modelScore, els.draftScoreTR, els.draftScoreCC, els.draftScoreLR, els.draftScoreGRA, els.modelScoreTR, els.modelScoreCC, els.modelScoreLR, els.modelScoreGRA].forEach(fillScoreSelect);
}

function renderTopicOptions() {
  const selectedTopicFilter = els.topicFilter.value || "all";
  const selectedTopic = currentEntry()?.topic || TASK2_TOPICS[0];
  const optionsHtml = TASK2_TOPICS.map((topic) => `<option value="${topic}">${topic}</option>`).join("");
  els.topicFilter.innerHTML = `<option value="all">全部话题</option>${optionsHtml}`;
  els.topicFilter.value = TASK2_TOPICS.includes(selectedTopicFilter) ? selectedTopicFilter : "all";
  els.topicSelect.innerHTML = optionsHtml;
  els.topicSelect.value = TASK2_TOPICS.includes(selectedTopic) ? selectedTopic : TASK2_TOPICS[0];

  const isTask2 = state.mode === "task2";
  els.topicFilterField.classList.toggle("hidden", !isTask2);
  els.topicField.classList.toggle("hidden", currentEntry()?.mode !== "task2");
}

function formatAvg(scores) {
  const values = Object.values(scores || {}).filter(Boolean).map(Number);
  if (!values.length) return "四维均分 –";
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const rounded = Math.round(average * 2) / 2;
  return `四维均分 ${rounded.toFixed(1)}`;
}

function scoreAvgValue(scores) {
  const values = Object.values(scores || {}).filter(Boolean).map(Number);
  if (!values.length) return "";
  return (Math.round(((values.reduce((a, b) => a + b, 0) / values.length) * 2)) / 2).toFixed(1);
}

function updateScoreAvgs(entry) {
  els.draftScoreAvg.textContent = formatAvg(entry?.draftScores);
  els.modelScoreAvg.textContent = formatAvg(entry?.modelScores);
}

function renderScoreStrip(entry) {
  els.draftScore.value = entry.draftScore || "";
  els.modelScore.value = entry.modelScore || "";
  SCORE_DIMENSIONS.forEach((dim) => {
    const key = dim.key.toUpperCase();
    els[`draftScore${key}`].value = entry.draftScores?.[dim.key] || "";
    els[`modelScore${key}`].value = entry.modelScores?.[dim.key] || "";
  });
  updateScoreAvgs(entry);
}

function renderMetrics() {
  const total = state.entries.length;
  const task2 = state.entries.filter((entry) => entry.mode === "task2").length;
  const task1 = state.entries.filter((entry) => entry.mode === "task1").length;
  const lastDate = getLastPracticeDate();
  const lastAvg = getLastAverageScore();
  const errCounts = correctionCounts();
  const errTotal = Object.values(errCounts).reduce((a, b) => a + b, 0);
  const weighted = weightedOverallScore();

  els.metricGrid.innerHTML = `
    <div class="metric-card overview-card">
      <strong>${total}</strong>
      <span>总复盘 · 大作文 ${task2} / 小作文 ${task1}</span>
    </div>
    <div class="metric-card streak-card">
      <strong>${lastDate || "-"}</strong>
      <span>${lastDate ? "上一次练作文是这一天" : "还没有练习记录"}</span>
    </div>
    <div class="metric-card distribution-card">
      <div class="metric-card-head"><strong>${task2}</strong><span>大作文话题</span></div>
      ${renderDistribution(topicCounts(), TASK2_TOPICS)}
    </div>
    <div class="metric-card distribution-card">
      <div class="metric-card-head"><strong>${task1}</strong><span>小作文题型</span></div>
      ${renderDistribution(typeCounts(), TASK_TYPES.task1)}
    </div>
    <div class="metric-card distribution-card">
      <div class="metric-card-head"><strong>${errTotal}</strong><span>错误标注 · 按类型（常见错误追踪）</span></div>
      ${renderDistribution(errCounts, CORRECTION_KINDS.map((c) => c.kind))}
    </div>
    <div class="metric-card weighted-card">
      <strong>${weighted ?? "-"}</strong>
      <span>${weighted ? "加权写作分（小作文×1/3 + 大作文×2/3）" : "加权写作分 · 需同时有大作文与小作文记录"}</span>
    </div>
    <div class="metric-card average-card">
      <strong>${lastAvg ?? "-"}</strong>
      <span>${lastAvg ? "最近一次总分" : "还没有分数记录"}</span>
    </div>
  `;
  renderSummary();
}

/* 所有条目按七类错误标签聚合统计（对应提示词长期跟踪的"重复犯的错误"） */
function correctionCounts() {
  return state.entries.reduce((acc, entry) => {
    (entry.corrections || []).forEach((correction) => {
      acc[correction.kind] = (acc[correction.kind] || 0) + 1;
    });
    return acc;
  }, {});
}

/* 加权写作分 = 最近一篇 Task 1 × 1/3 + 最近一篇 Task 2 × 2/3 */
function weightedOverallScore() {
  const latestScore = (mode) => {
    const entry = state.entries
      .filter((item) => item.mode === mode)
      .sort((a, b) => getDateTime(b.practiceDate) - getDateTime(a.practiceDate))[0];
    if (!entry) return null;
    return entry.modelScore || entry.draftScore || null;
  };
  const t1 = latestScore("task1");
  const t2 = latestScore("task2");
  if (t1 == null || t2 == null) return null;
  return (Math.round((Number(t1) / 3 + (Number(t2) * 2) / 3) * 2) / 2).toFixed(1);
}

function getLastAverageScore() {
  const entries = state.entries.filter((entry) => entry.draftScore || entry.modelScore).sort((a, b) => getDateTime(b.practiceDate) - getDateTime(a.practiceDate));
  const latest = entries[0];
  if (!latest) return null;
  const pick = latest.modelScore || latest.draftScore || "";
  return pick || null;
}

function topicCounts() {
  return state.entries
    .filter((entry) => entry.mode === "task2")
    .reduce((acc, entry) => ({ ...acc, [entry.topic]: (acc[entry.topic] || 0) + 1 }), {});
}

function typeCounts() {
  return state.entries
    .filter((entry) => entry.mode === "task1")
    .reduce((acc, entry) => ({ ...acc, [entry.essayType]: (acc[entry.essayType] || 0) + 1 }), {});
}

function renderDistribution(counts, order) {
  const max = Math.max(1, ...Object.values(counts));
  return order
    .map((key) => {
      const count = counts[key] || 0;
      return `
      <div class="dist-row">
        <span>${key}</span>
        <div class="dist-bar"><i style="width:${(count / max) * 100}%"></i></div>
        <b>${count}</b>
      </div>
    `;
    })
    .join("");
}

function getLastPracticeDate() {
  const dates = state.entries.map((entry) => entry.practiceDate).filter(Boolean).sort();
  return dates.at(-1) || "";
}

function daysSince(dateString) {
  const start = new Date(`${dateString}T00:00:00`);
  const now = new Date();
  return Math.max(0, Math.floor((now - start) / 86400000));
}

function renderSummary() {
  els.summaryDisplay.textContent = state.examSummary || "还没有写总结。";
  els.summaryEditor.value = state.examSummary;
  els.summaryDisplay.classList.toggle("hidden", state.editingSummary);
  els.summaryEditor.classList.toggle("hidden", !state.editingSummary);
  els.editSummaryBtn.classList.toggle("hidden", state.editingSummary);
  els.saveSummaryBtn.classList.toggle("hidden", !state.editingSummary);
}

function renderEntryList() {
  const typeFilter = els.typeFilter.value || "all";
  const topicFilter = els.topicFilter.value || "all";
  const query = (els.entrySearch.value || "").trim().toLowerCase();
  const entries = state.entries.filter((entry) => {
    const typeMatch = entry.mode === state.mode && (typeFilter === "all" || entry.essayType === typeFilter);
    const topicMatch = state.mode !== "task2" || topicFilter === "all" || entry.topic === topicFilter;
    if (!typeMatch || !topicMatch) return false;
    if (!query) return true;
    const haystack = [entry.title, entry.topic, entry.essayType, entry.prompt, entry.meaning].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  els.entryList.innerHTML = entries
    .map((entry) => {
      const tagLabel = entry.mode === "task2" ? entry.topic : entry.essayType;
      const tagClass = getTagTone(entry.mode, tagLabel);
      const typeText = entry.mode === "task2" ? entry.essayType : "小作文";
      const score = entry.draftScore || entry.modelScore;
      return `
        <button class="entry-card ${entry.id === state.currentId ? "active" : ""}" data-entry-id="${entry.id}">
          <span class="entry-card-top">
            <strong>${escapeHtml(entry.title || "未命名复盘")}</strong>
            ${score ? `<b class="card-score">${escapeHtml(score)}</b>` : ""}
          </span>
          <span class="entry-meta">
            <em>${escapeHtml(typeText)}</em>
            <b class="mini-tag ${tagClass}">${escapeHtml(tagLabel || "未分类")}</b>
            <em>${entry.practiceDate || "未记录日期"}</em>
          </span>
        </button>
      `;
    })
    .join("");
}

/* ---------------- 渲染：详情页 ---------------- */

function renderEditor() {
  const entry = currentEntry();
  const hasEntry = Boolean(entry);
  els.welcomeView.classList.toggle("hidden", hasEntry);
  els.libraryView.classList.add("hidden");
  els.detailView.classList.toggle("hidden", !hasEntry);
  renderMetrics();

  if (!entry) return;

  els.entryModeLabel.textContent = entry.mode === "task2" ? "大作文复盘" : "小作文复盘";
  els.promptCard.classList.toggle("task1-layout", entry.mode === "task1");
  els.promptCard.classList.toggle("task2-layout", entry.mode === "task2");
  els.entryTitle.value = entry.title;
  els.promptText.value = entry.prompt;
  els.meaningText.value = entry.meaning;
  els.essayType.value = entry.essayType;
  els.practiceDate.value = entry.practiceDate;
  els.entrySource.value = entry.source || "";
  els.topicSelect.value = entry.topic || TASK2_TOPICS[0];
  els.topicField.classList.toggle("hidden", entry.mode !== "task2");
  els.taskImageField.classList.toggle("hidden", entry.mode !== "task1");
  renderTaskImage(entry);
  entry.draftHtml = cleanEditorHtml(entry.draftHtml);
  entry.modelHtml = cleanEditorHtml(entry.modelHtml);
  els.draftEditor.innerHTML = entry.draftHtml;
  els.modelEditor.innerHTML = entry.modelHtml;
  els.stanceText.value = entry.stance;
  els.argumentsText.value = entry.arguments;

  renderScoreStrip(entry);
  updateStats();
  renderEvaluation(entry);
  renderCorrections();
  renderBankTabs(entry.mode);
  renderHighlightLegend();
  renderBankSubmenu();
  renderThinkingLabels(entry.mode);
  autoResizeTextareas();
}

function showHome() {
  updateCurrentFromInputs();
  state.currentId = "";
  els.welcomeView.classList.remove("hidden");
  els.detailView.classList.add("hidden");
  els.libraryView.classList.add("hidden");
  renderAll();
}

function showLibrary() {
  updateCurrentFromInputs();
  state.currentId = "";
  els.welcomeView.classList.add("hidden");
  els.detailView.classList.add("hidden");
  els.libraryView.classList.remove("hidden");
  renderLibrary();
  renderEntryList();
}

function renderLibrary() {
  const schema = getBankSchema(state.libraryMode);
  if (!schema[state.libraryBankTab]) state.libraryBankTab = Object.keys(schema)[0];
  renderLibraryGroups();
  els.libraryBankTabs.innerHTML = Object.entries(schema)
    .map(
      ([key, label]) =>
        `<button class="note-tab ${key === state.libraryBankTab ? "active" : ""}" data-library-bank="${key}">${label}</button>`,
    )
    .join("");
  renderLibraryContent();
  $$("[data-library-mode]").forEach((button) =>
    button.classList.toggle("active", button.dataset.libraryMode === state.libraryMode),
  );
}

function renderLibraryGroups() {
  const groups = state.libraryMode === "task2" ? TASK2_TOPICS : TASK_TYPES.task1;
  els.libraryGroupLabel.textContent = state.libraryMode === "task2" ? "话题" : "题型";
  if (state.libraryGroup !== "all" && !groups.includes(state.libraryGroup)) state.libraryGroup = "all";
  els.libraryGroupSelect.innerHTML = `<option value="all">全部${state.libraryMode === "task2" ? "话题" : "题型"}</option>${groups
    .map((group) => `<option value="${group}">${group}</option>`)
    .join("")}`;
  els.libraryGroupSelect.value = state.libraryGroup;
}

function renderLibraryContent() {
  const entries = state.entries.filter((entry) => {
    if (entry.mode !== state.libraryMode) return false;
    if (state.libraryGroup === "all") return true;
    return state.libraryMode === "task2" ? entry.topic === state.libraryGroup : entry.essayType === state.libraryGroup;
  });
  const allCards = entries
    .map((entry) => {
      const content = (entry.bank[state.libraryBankTab] || "").trim();
      if (!content) return null;
      return {
        group: state.libraryMode === "task2" ? entry.topic : entry.essayType,
        title: entry.title || "未命名复盘",
        date: entry.practiceDate || "未记录日期",
        content,
      };
    })
    .filter(Boolean)
    .sort((a, b) => getDateTime(b.date) - getDateTime(a.date));

  const pageCount = Math.max(1, Math.ceil(allCards.length / LIBRARY_PAGE_SIZE));
  state.libraryPage = Math.min(state.libraryPage, pageCount);
  const pageCards = allCards.slice((state.libraryPage - 1) * LIBRARY_PAGE_SIZE, state.libraryPage * LIBRARY_PAGE_SIZE);
  const html = pageCards
    .map(
      (card) => `
        <article class="library-card">
          <div class="library-card-head">
            <div class="library-card-title">
              <strong>${escapeHtml(card.title)}</strong>
              <span class="library-tag ${getLibraryTagTone(card.group)}">${escapeHtml(card.group || "未分类")}</span>
            </div>
            <span class="library-date">${escapeHtml(card.date)}</span>
          </div>
          <pre>${escapeHtml(card.content)}</pre>
        </article>
      `,
    )
    .join("");
  els.libraryContent.innerHTML = html ? `<div class="library-card-grid">${html}</div>` : `<div class="empty-library">这里还没有可复习的素材。</div>`;
  renderLibraryPagination(pageCount, allCards.length);
}

function getLibraryTagTone(group) {
  return getTagTone(state.libraryMode, group);
}

function getTagTone(mode, group) {
  const order = mode === "task2" ? TASK2_TOPICS : TASK_TYPES.task1;
  const index = Math.max(0, order.indexOf(group));
  return `tag-tone-${index % 12}`;
}

function renderLibraryPagination(pageCount, total) {
  els.libraryPagination.innerHTML =
    total > LIBRARY_PAGE_SIZE
      ? `
        <button class="secondary-button" data-library-page="prev" ${state.libraryPage === 1 ? "disabled" : ""}>上一页</button>
        <span>第 ${state.libraryPage} / ${pageCount} 页 · 共 ${total} 条</span>
        <button class="secondary-button" data-library-page="next" ${state.libraryPage === pageCount ? "disabled" : ""}>下一页</button>
      `
      : "";
}

function renderTaskImage(entry) {
  els.taskImagePreview.classList.toggle("empty", !entry.taskImage);
  els.taskImagePreview.disabled = !entry.taskImage;
  els.removeTaskImageBtn.classList.toggle("hidden", !entry.taskImage);
  els.taskImagePreview.innerHTML = entry.taskImage ? `<img src="${entry.taskImage}" alt="题目图片预览" />` : "暂无图片";
}

function getBankSchema(mode) {
  const defaults = BANK_SCHEMAS[mode] || BANK_SCHEMAS.task2;
  return { ...defaults, ...(state.bankLabels[mode] || {}) };
}

function renderBankTabs(mode) {
  const schema = getBankSchema(mode);
  if (!schema[state.bankTab]) state.bankTab = Object.keys(schema)[0];
  const tabs = Object.entries(schema)
    .map(
      ([key, label]) =>
        `<button class="note-tab ${key === state.bankTab ? "active" : ""}" data-bank="${key}">${label}</button>`,
    )
    .join("");
  els.detailBankTabs.innerHTML = tabs;
  els.bankText.value = currentEntry()?.bank[state.bankTab] || "";
  renderBankLabelEditor(mode);
}

/* ---------------- 渲染：评语模块 ---------------- */

function renderEvaluation(entry) {
  els.evaluationList.innerHTML = "";
  const sections = entry.evaluation || [];
  sections.forEach((section, index) => {
    const node = els.evalSectionTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.index = index;
    node.querySelector(".eval-section-title").value = section.title || "";
    node.querySelector(".eval-section-body").value = section.body || "";
    els.evaluationList.appendChild(node);
    // 评语正文：默认一行，随内容自动增高
    scheduleGrow(node.querySelector(".eval-section-body"), 40);
  });
}

function addEvaluationSection(title = "") {
  const entry = currentEntry();
  if (!entry) return;
  if (!entry.evaluation) entry.evaluation = [];
  entry.evaluation.push({ title, body: "" });
  persist();
  renderEvaluation(entry);
}

function readEvaluationFromDOM() {
  const entry = currentEntry();
  if (!entry) return;
  const sections = [];
  els.evaluationList.querySelectorAll(".eval-section").forEach((node) => {
    const title = node.querySelector(".eval-section-title").value.trim();
    const body = node.querySelector(".eval-section-body").value;
    sections.push({ title, body });
  });
  entry.evaluation = sections;
}

/* ---------------- 渲染：错误标注（筛选 + 自适应高度） ---------------- */

function autoGrowTextarea(textarea, minHeight = 46) {
  textarea.style.height = "auto";
  // box-sizing 为 border-box，height 含边框，需补回边框高度才能完整显示内容
  const style = getComputedStyle(textarea);
  const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
  textarea.style.height = `${Math.max(textarea.scrollHeight + border, minHeight)}px`;
}

// 等两帧再测量，让字体加载/文本重排落定，避免高度被低估而截断
function scheduleGrow(textarea, minHeight = 46) {
  requestAnimationFrame(() => requestAnimationFrame(() => autoGrowTextarea(textarea, minHeight)));
}

function regrowCorrectionTextareas() {
  els.correctionList.querySelectorAll("textarea").forEach(autoGrowTextarea);
}

function kindColor(kind) {
  return CORRECTION_KINDS.find((item) => item.kind === kind)?.color || "#9aa5b1";
}

function renderCorrectionFilterBar() {
  const entry = currentEntry();
  const counts = {};
  (entry?.corrections || []).forEach((correction) => {
    counts[correction.kind] = (counts[correction.kind] || 0) + 1;
  });
  const allOn = CORRECTION_KINDS.every((item) => state.correctionFilter[item.kind] !== false);
  els.correctionFilterBar.innerHTML = `
    <button type="button" class="cf-chip ${allOn ? "active" : ""}" data-kind-all title="全部显示">
      <span class="cf-name">全部</span><b>${entry?.corrections.length || 0}</b>
    </button>
    ${CORRECTION_KINDS.map((item) => {
      const on = state.correctionFilter[item.kind] !== false;
      return `
        <button type="button" class="cf-chip ${on ? "active" : ""}" data-kind="${item.kind}" title="显示/隐藏「${item.kind}」">
          <i style="background:${item.color}"></i>
          <span class="cf-name">${item.kind}</span><b>${counts[item.kind] || 0}</b>
        </button>`;
    }).join("")}
  `;
}

function renderCorrections() {
  const entry = currentEntry();
  renderCorrectionFilterBar();
  els.correctionList.innerHTML = "";

  const visible = [];
  (entry?.corrections || []).forEach((correction, index) => {
    if (state.correctionFilter[correction.kind] !== false) visible.push({ correction, index });
  });

  if (!entry) return;

  if (!entry.corrections.length) {
    els.correctionList.innerHTML = `<div class="empty-corrections">还没有错误标注。点击「添加」，或用鼠标选中作文里的文字快速加入。</div>`;
    return;
  }

  if (!visible.length) {
    els.correctionList.innerHTML = `<div class="empty-corrections">当前筛选已隐藏全部标注，点上方「全部」恢复显示。</div>`;
    return;
  }

  visible.forEach(({ correction, index }) => {
    const node = els.correctionTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.index = index;
    node.dataset.kind = correction.kind;
    node.classList.add(`kind-${correction.kind}`);
    node.querySelector('[data-correction="source"]').value = correction.source || "";
    node.querySelector('[data-correction="fix"]').value = correction.fix || "";
    node.querySelector('[data-correction="comment"]').value = correction.comment || "";
    const kindSelect = node.querySelector('[data-correction="kind"]');
    kindSelect.innerHTML = CORRECTION_KINDS.map((item) => `<option value="${item.kind}">${item.kind}</option>`).join("");
    kindSelect.value = correction.kind;
    // 先挂载到 DOM，再测量内容高度，否则 scrollHeight 为 0
    els.correctionList.appendChild(node);
    node.querySelectorAll("textarea").forEach((textarea) => {
      textarea.addEventListener("input", () => scheduleGrow(textarea));
      scheduleGrow(textarea);
    });
    enhanceSelect(kindSelect);
  });
}

function renderHighlightLegend() {
  els.highlightLegend.innerHTML = HIGHLIGHTS.map(
    ([color, label]) => `
      <label class="legend-item">
        <span class="legend-dot" style="background:${color}"></span>
        <input data-highlight-label="${color}" value="${escapeHtml(state.highlightLabels[color] || label)}" />
      </label>
    `,
  ).join("");
}

function renderBankLabelEditor(mode) {
  const tabs = els.detailBankTabs;
  els.bankLabelEditor.classList.toggle("hidden", !state.editingBankLabels);
  tabs.classList.toggle("hidden", state.editingBankLabels);
  els.editBankLabelsBtn.textContent = state.editingBankLabels ? "取消编辑" : "编辑标签";
  if (!state.editingBankLabels) {
    els.bankLabelEditor.innerHTML = "";
    return;
  }
  // 编辑时不显示标签 tab，避免框里框外重复
  const schema = getBankSchema(mode);
  const inputs = Object.entries(schema)
    .map(
      ([key, label]) => `
        <label>
          <span>${escapeHtml(BANK_SCHEMAS[mode][key] || key)}</span>
          <input data-bank-label="${key}" value="${escapeHtml(label)}" />
        </label>
      `,
    )
    .join("");
  els.bankLabelEditor.innerHTML = `
    <div class="bank-label-fields">${inputs}</div>
    <div class="bank-label-actions">
      <button class="secondary-button" data-bank-label-reset type="button">恢复默认</button>
      <button class="primary-button" data-bank-label-save type="button">保存标签</button>
    </div>
  `;
}

function renderBankSubmenu() {
  const schema = getBankSchema(currentEntry()?.mode || state.mode);
  els.bankSubmenu.innerHTML = Object.entries(schema)
    .map(([key, label]) => `<button data-add-bank="${key}">${label}</button>`)
    .join("");
}

function renderThinkingLabels(mode) {
  if (mode === "task1") {
    els.thinkingPrimaryLabel.textContent = "概括段思路";
    els.thinkingSecondaryLabel.textContent = "细节段安排";
    return;
  }
  els.thinkingPrimaryLabel.textContent = "整体思路";
  els.thinkingSecondaryLabel.textContent = "论点与论据";
}

function renderAll() {
  renderScoreOptions();
  renderTypeOptions();
  renderTopicOptions();
  renderEntryList();
  renderEditor();
  $$(".mode-tab").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  syncAllSelects();
}

/* ---------------- 表单读取 ---------------- */

function updateCurrentFromInputs() {
  const entry = currentEntry();
  if (!entry) return;

  entry.title = els.entryTitle.value;
  entry.prompt = els.promptText.value;
  entry.meaning = els.meaningText.value;
  entry.essayType = els.essayType.value;
  entry.practiceDate = els.practiceDate.value;
  entry.source = els.entrySource.value.trim();
  entry.topic = entry.mode === "task2" ? els.topicSelect.value : "";
  entry.taskImage = entry.mode === "task1" ? entry.taskImage || "" : "";
  entry.draftHtml = cleanEditorHtml(els.draftEditor.innerHTML);
  entry.modelHtml = cleanEditorHtml(els.modelEditor.innerHTML);
  entry.draftScore = els.draftScore.value;
  entry.modelScore = els.modelScore.value;
  SCORE_DIMENSIONS.forEach((dim) => {
    const key = dim.key.toUpperCase();
    entry.draftScores[dim.key] = els[`draftScore${key}`].value;
    entry.modelScores[dim.key] = els[`modelScore${key}`].value;
  });
  entry.bank[state.bankTab] = els.bankText.value;
  readEvaluationFromDOM();
  entry.stance = els.stanceText.value;
  entry.arguments = els.argumentsText.value;
}

function updateStats() {
  els.draftStats.textContent = `${wordCount(els.draftEditor.textContent)} words`;
  els.modelStats.textContent = `${wordCount(els.modelEditor.textContent)} words`;
}

/* ---------------- 事件绑定 ---------------- */

function bindEvents() {
  $("#collapseBtn").addEventListener("click", () => {
    els.appShell.classList.toggle("sidebar-collapsed");
    $("#collapseBtn").textContent = els.appShell.classList.contains("sidebar-collapsed") ? "›" : "‹";
  });

  // —— 文件同步 ——
  els.openFileBtn.addEventListener("click", bindDataFile);
  els.createFileBtn.addEventListener("click", createDataFile);
  els.fileOpenInput.addEventListener("change", async () => {
    const file = els.fileOpenInput.files[0];
    els.fileOpenInput.value = "";
    if (!file) return;
    const text = await file.text();
    await adoptFile(null, text, false, file.name);
    if (!hasFSA) {
      showToast(`已读取「${file.name}」。${fsaReason()} 改动后请点「保存到文件」手动导出。`, "error");
    }
  });

  els.saveFileBtn.addEventListener("click", async () => {
    if (state.fileHandle) {
      const ok = await writeToFile();
      if (ok) showToast(`已保存到「${state.fileName}」`);
      return;
    }
    if (hasFSA) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "ielts-writing-review-data.json",
          types: [{ description: "JSON 数据文件", accept: { "application/json": [".json"] } }],
        });
        state.fileHandle = handle;
        state.fileLastModified = null;
        state.fileName = handle.name;
        state.autoSave = true;
        await storeFileHandle(handle);
        const ok = await writeToFile();
        if (ok) {
          showToast(`已保存到「${state.fileName}」，之后将自动同步`);
          renderSyncStatus();
        }
      } catch (error) {
        if (error?.name !== "AbortError") showToast(`保存失败：${error.message}`, "error");
      }
      return;
    }
    downloadDataFile();
  });

  els.autoSaveToggle.addEventListener("change", () => {
    state.autoSave = els.autoSaveToggle.checked;
    persist();
    renderSyncStatus();
  });

  // —— 主题弹窗 ——
  els.themeToggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (els.themePopover.classList.contains("hidden")) {
      openThemePopover();
    } else {
      closeThemePopover();
    }
  });

  els.themeSwatches.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-key]");
    if (!button) return;
    applyTheme(button.dataset.themeKey);
    persist();
    closeThemePopover();
  });

  function openThemePopover() {
    const btn = els.themeToggleBtn.getBoundingClientRect();
    const pop = els.themePopover;
    pop.classList.remove("hidden");
    // 先显示才能读取尺寸
    requestAnimationFrame(() => {
      const left = Math.max(8, Math.min(btn.left, window.innerWidth - pop.offsetWidth - 8));
      const top = btn.bottom + 6;
      pop.style.left = `${left}px`;
      if (top + pop.offsetHeight > window.innerHeight - 8) {
        pop.style.top = `${Math.max(8, btn.top - pop.offsetHeight - 6)}px`;
        pop.classList.add("flip");
      } else {
        pop.style.top = `${top}px`;
        pop.classList.remove("flip");
      }
    });
  }

  function closeThemePopover() {
    els.themePopover.classList.add("hidden");
  }

  $("#newEntryBtn").addEventListener("click", () => {
    updateCurrentFromInputs();
    const entry = makeEmptyEntry();
    state.entries.unshift(entry);
    state.currentId = entry.id;
    persist();
    renderAll();
  });

  $("#backHomeBtn").addEventListener("click", showHome);
  els.exportEntryBtn.addEventListener("click", exportEntryMarkdown);
  els.importEntryBtn.addEventListener("click", openImportModal);
  els.importModalClose.addEventListener("click", closeImportModal);
  els.importCancelBtn.addEventListener("click", closeImportModal);
  els.importConfirmBtn.addEventListener("click", applyParsedImport);
  els.importModal.addEventListener("click", (event) => {
    if (event.target === els.importModal) closeImportModal();
  });
  els.openLibraryBtn.addEventListener("click", showLibrary);
  els.libraryHomeBtn.addEventListener("click", showHome);

  $$("[data-library-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.libraryMode = button.dataset.libraryMode;
      state.libraryGroup = "all";
      state.libraryBankTab = "keyNotes";
      renderLibrary();
    });
  });

  els.libraryGroupSelect.addEventListener("change", () => {
    state.libraryGroup = els.libraryGroupSelect.value;
    state.libraryPage = 1;
    renderLibraryContent();
  });

  els.libraryBankTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-library-bank]");
    if (!button) return;
    state.libraryBankTab = button.dataset.libraryBank;
    state.libraryPage = 1;
    renderLibrary();
  });

  els.libraryPagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-library-page]");
    if (!button) return;
    state.libraryPage += button.dataset.libraryPage === "next" ? 1 : -1;
    renderLibraryContent();
  });

  els.editSummaryBtn.addEventListener("click", () => {
    state.editingSummary = true;
    renderSummary();
    els.summaryEditor.focus();
  });

  els.saveSummaryBtn.addEventListener("click", () => {
    state.examSummary = els.summaryEditor.value;
    state.editingSummary = false;
    persist();
    renderSummary();
  });

  $("#deleteEntryBtn").addEventListener("click", () => {
    const entry = currentEntry();
    if (!entry) return;
    if (!window.confirm(`确定删除「${entry.title || "未命名复盘"}」吗？`)) return;
    state.entries = state.entries.filter((item) => item.id !== entry.id);
    state.currentId = "";
    persist();
    renderAll();
  });

  $$(".mode-tab").forEach((button) => {
    button.addEventListener("click", () => {
      updateCurrentFromInputs();
      state.mode = button.dataset.mode;
      state.currentId = "";
      persist();
      renderAll();
    });
  });

  els.typeFilter.addEventListener("change", renderEntryList);
  els.topicFilter.addEventListener("change", renderEntryList);
  els.entrySearch.addEventListener("input", renderEntryList);

  els.entryList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-entry-id]");
    if (!card) return;
    updateCurrentFromInputs();
    persist();
    state.currentId = card.dataset.entryId;
    const entry = currentEntry();
    if (entry) state.mode = entry.mode;
    renderAll();
  });

  [els.entryTitle, els.promptText, els.meaningText, els.essayType, els.practiceDate, els.entrySource, els.topicSelect, els.stanceText, els.argumentsText].forEach((input) => {
    input.addEventListener("input", () => {
      updateCurrentFromInputs();
      persist();
      renderEntryList();
      autoResizeTextareas();
    });
  });

  els.entryTitle.addEventListener("mouseenter", () => {
    els.entryTitle.title = els.entryTitle.value;
  });

  // —— 四维评分 ——
  [els.draftScore, els.modelScore, els.draftScoreTR, els.draftScoreCC, els.draftScoreLR, els.draftScoreGRA, els.modelScoreTR, els.modelScoreCC, els.modelScoreLR, els.modelScoreGRA].forEach((select) => {
    select.addEventListener("change", () => {
      updateCurrentFromInputs();
      updateScoreAvgs(currentEntry());
      persist();
    });
  });

  els.draftScoreAvg.addEventListener("click", () => fillAvgInto(els.draftScore, currentEntry()?.draftScores));
  els.modelScoreAvg.addEventListener("click", () => fillAvgInto(els.modelScore, currentEntry()?.modelScores));

  function fillAvgInto(scoreSelect, scores) {
    const value = scoreAvgValue(scores);
    if (!value) {
      showToast("先填写四个维度的小分", "error");
      return;
    }
    scoreSelect.value = value;
    updateCurrentFromInputs();
    persist();
    renderAll();
    showToast(`已把四维均分 ${value} 填入总分`);
  }

  // —— 题目图片 ——
  els.taskImageInput.addEventListener("change", () => {
    const file = els.taskImageInput.files?.[0];
    const entry = currentEntry();
    if (!file || !entry) return;
    compressImage(file)
      .then((dataUrl) => {
        entry.taskImage = dataUrl;
        persist();
        renderTaskImage(entry);
        showToast("图片已压缩（≤1600px · JPEG）后保存");
      })
      .catch((error) => {
        showToast(`图片处理失败：${error.message}`, "error");
      });
  });

  els.removeTaskImageBtn.addEventListener("click", () => {
    const entry = currentEntry();
    if (!entry) return;
    if (!window.confirm("确定移除这张题目图片吗？")) return;
    entry.taskImage = "";
    els.taskImageInput.value = "";
    persist();
    renderTaskImage(entry);
  });

  els.taskImagePreview.addEventListener("click", () => {
    const entry = currentEntry();
    if (!entry?.taskImage) return;
    els.imageModalImg.src = entry.taskImage;
    els.imageModal.classList.remove("hidden");
  });

  els.imageModalClose.addEventListener("click", closeImageModal);
  els.imageModal.addEventListener("click", (event) => {
    if (event.target === els.imageModal) closeImageModal();
  });

  // —— 富文本编辑器 ——
  [els.draftEditor, els.modelEditor].forEach((editor) => {
    editor.addEventListener("paste", (event) => handleEditorPaste(event, editor));
    editor.addEventListener("input", () => {
      updateCurrentFromInputs();
      updateStats();
      persist();
    });
    editor.addEventListener("mouseup", () => showToolbarForSelection(editor));
    editor.addEventListener("keyup", () => showToolbarForSelection(editor));
    // 点击已高亮的文字 → 弹出清除高亮浮层
    editor.addEventListener("click", (event) => {
      const span = event.target.closest?.("[data-highlight]");
      if (span) showHighlightToolbar(span);
      else hideHighlightToolbar();
    });
  });

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const editor = selection.anchorNode?.parentElement?.closest?.(".rich-editor");
    if (editor) showToolbarForSelection(editor);
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".selection-toolbar")) return;
    if (event.target.closest(".highlight-toolbar")) return;
    if (event.target.closest(".dd, .dd-panel")) return;
    if (!event.target.closest(".theme-popover, #themeToggleBtn")) {
      closeThemePopover();
    }
    if (event.target.closest(".rich-editor")) {
      window.setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) hideToolbar();
      }, 60);
      return;
    }
    hideToolbar();
    hideHighlightToolbar();
    closeAllSelects();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideToolbar();
      hideHighlightToolbar();
      closeImageModal();
      closeImportModal();
      closeAllSelects();
      closeThemePopover();
    }
  });

  window.addEventListener("scroll", (event) => {
    if (event.target === document) closeAllSelects();
  }, true);
  window.addEventListener("resize", () => {
    closeAllSelects();
    regrowCorrectionTextareas();
  });

  els.selectionToolbar.addEventListener("pointerdown", (event) => event.preventDefault());
  els.highlightToolbar.addEventListener("pointerdown", (event) => event.preventDefault());

  els.selectionToolbar.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.highlight) applyHighlight(button.dataset.highlight);
    if (button.dataset.addCorrection) addSelectionToCorrection(button.dataset.addCorrection);
    if (button.dataset.addBank) addSelectionToBank(button.dataset.addBank);
  });

  els.clearHighlightBtn.addEventListener("click", clearHighlightAt);

  els.bankText.addEventListener("input", () => {
    updateCurrentFromInputs();
    persist();
  });

  // —— 评语模块 ——
  els.addEvalSectionBtn.addEventListener("click", (event) => {
    event.preventDefault();
    addEvaluationSection("");
  });

  els.evaluationList.addEventListener("input", (event) => {
    const target = event.target.closest(".eval-section-title, .eval-section-body");
    if (!target) return;
    if (target.classList.contains("eval-section-body")) scheduleGrow(target, 40);
    updateCurrentFromInputs();
    persist();
  });

  els.evaluationList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-eval]");
    if (!button) return;
    const section = button.closest(".eval-section");
    if (!section) return;
    const index = Number(section.dataset.index);
    const entry = currentEntry();
    if (!entry || !entry.evaluation) return;
    entry.evaluation.splice(index, 1);
    persist();
    renderEvaluation(entry);
  });

  els.detailBankTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".note-tab");
    if (!button) return;
    updateCurrentFromInputs();
    state.bankTab = button.dataset.bank;
    renderAll();
  });

  els.editBankLabelsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.editingBankLabels = !state.editingBankLabels;
    renderBankTabs(currentEntry()?.mode || state.mode);
  });

  els.bankLabelEditor.addEventListener("click", (event) => {
    const entry = currentEntry();
    if (!entry) return;
    if (event.target.closest("[data-bank-label-reset]")) {
      state.bankLabels[entry.mode] = { ...BANK_SCHEMAS[entry.mode] };
      persist();
      renderAll();
      return;
    }
    if (!event.target.closest("[data-bank-label-save]")) return;
    els.bankLabelEditor.querySelectorAll("[data-bank-label]").forEach((input) => {
      const key = input.dataset.bankLabel;
      state.bankLabels[entry.mode][key] = input.value.trim() || BANK_SCHEMAS[entry.mode][key];
    });
    state.editingBankLabels = false;
    persist();
    renderAll();
  });

  $("#addCorrectionBtn").addEventListener("click", (event) => {
    event.preventDefault();
    addCorrection({ source: "", fix: "", comment: "", kind: "语法" });
  });

  // —— 错误标注筛选 ——
  els.correctionFilterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-kind], [data-kind-all]");
    if (!button) return;
    if (button.dataset.kindAll !== undefined) {
      CORRECTION_KINDS.forEach((item) => (state.correctionFilter[item.kind] = true));
    } else {
      const kind = button.dataset.kind;
      state.correctionFilter[kind] = state.correctionFilter[kind] === false;
    }
    persist();
    renderCorrections();
  });

  els.correctionList.addEventListener("input", (event) => {
    const item = event.target.closest(".correction-item");
    const key = event.target.dataset.correction;
    if (!item || !key) return;
    const correction = currentEntry().corrections[Number(item.dataset.index)];
    if (!correction) return;
    correction[key] = event.target.value;
    persist();
  });

  els.correctionList.addEventListener("change", (event) => {
    const item = event.target.closest(".correction-item");
    if (!item || event.target.dataset.correction !== "kind") return;
    const correction = currentEntry().corrections[Number(item.dataset.index)];
    if (!correction) return;
    const newKind = event.target.value;
    correction.kind = newKind;
    item.dataset.kind = newKind;
    item.classList.remove(...CORRECTION_KINDS.map((c) => `kind-${c.kind}`));
    item.classList.add(`kind-${newKind}`);
    persist();
    renderCorrections();
  });

  els.correctionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-correction]");
    if (!button) return;
    if (!window.confirm("确定删除这条错误标注吗？")) return;
    const item = event.target.closest(".correction-item");
    currentEntry().corrections.splice(Number(item.dataset.index), 1);
    persist();
    renderCorrections();
    renderMetrics();
  });

  els.highlightLegend.addEventListener("input", (event) => {
    const color = event.target.dataset.highlightLabel;
    if (!color) return;
    state.highlightLabels[color] = event.target.value;
    persist();
  });
}

/* ---------------- 工具函数：图片弹窗 / 富文本 / 高亮 ---------------- */

function closeImageModal() {
  els.imageModal.classList.add("hidden");
  els.imageModalImg.removeAttribute("src");
}

/* 题目图片压缩：等比缩放到 maxWidth 以内，转 JPEG 输出。
 * 原图（尤其手机截图）base64 后可到 3-5MB，会把 localStorage 配额撑爆；
 * 压缩后通常 <300KB。 */
function compressImage(file, maxWidth = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("图片读取失败"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        // JPEG 不支持透明通道，先铺白底再绘制
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function handleEditorPaste(event, editor) {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  if (!text) return;
  insertPlainText(editor, text);
  updateCurrentFromInputs();
  updateStats();
  persist();
}

function insertPlainText(editor, text) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    editor.appendChild(document.createTextNode(text));
    return;
  }
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) {
    editor.appendChild(document.createTextNode(text));
    return;
  }
  // execCommand("insertText") 可被原生 Ctrl+Z 撤销
  const ok = document.execCommand("insertText", false, text);
  if (!ok) {
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function showToolbarForSelection(editor) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !editor.contains(selection.anchorNode)) return;
  const text = selection.toString().trim();
  if (!text) return;

  state.selectedEditor = editor;
  state.selectedText = text;
  hideHighlightToolbar();
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const toolbarWidth = 156;
  const left = Math.min(window.innerWidth - toolbarWidth - 10, rect.right + 12);
  const top = Math.min(window.innerHeight - 240, Math.max(10, rect.bottom + 8));
  els.selectionToolbar.style.left = `${Math.max(8, left)}px`;
  els.selectionToolbar.style.top = `${Math.max(8, top)}px`;
  els.selectionToolbar.classList.remove("hidden");
}

function hideToolbar() {
  els.selectionToolbar.classList.add("hidden");
  state.selectedText = "";
}

function applyHighlight(color) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !state.selectedEditor) return;
  const range = selection.getRangeAt(0);
  const editor = state.selectedEditor;
  if (!editor.contains(range.commonAncestorContainer)) return;

  // 取选区内容并去掉内部已有高亮，包上新 span。
  // 用 execCommand("insertHTML") 插入，使该操作进入浏览器原生撤销栈（Ctrl+Z 可撤销）。
  const container = document.createElement("div");
  container.appendChild(stripHighlights(range.cloneContents()));
  const span = document.createElement("span");
  span.style.backgroundColor = color;
  span.dataset.highlight = color;
  span.innerHTML = container.innerHTML;
  const ok = document.execCommand("insertHTML", false, span.outerHTML);
  if (!ok) {
    // 兜底：手动替换选区
    const fragment = stripHighlights(range.extractContents());
    span.innerHTML = "";
    span.appendChild(fragment);
    range.insertNode(span);
  }
  editor.normalize();
  selection.removeAllRanges();
  updateCurrentFromInputs();
  persist();
  hideToolbar();
}

/* 点击已高亮文字：弹出"清除高亮"浮层 */
function showHighlightToolbar(span) {
  if (!span || !span.isConnected) return;
  state.highlightTarget = span;
  hideToolbar();
  const rect = span.getBoundingClientRect();
  const toolbarWidth = 100;
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - toolbarWidth / 2, window.innerWidth - toolbarWidth - 8));
  const top = rect.bottom + 6;
  els.highlightToolbar.style.left = `${left}px`;
  els.highlightToolbar.style.top = `${top + 44 > window.innerHeight ? Math.max(8, rect.top - 44) : top}px`;
  els.highlightToolbar.classList.remove("hidden");
}

function hideHighlightToolbar() {
  els.highlightToolbar.classList.add("hidden");
  state.highlightTarget = null;
}

/* 清除点击的那一段高亮（unwrap span，保留文字） */
function clearHighlightAt() {
  const span = state.highlightTarget;
  if (!span || !span.isConnected) return;
  const editor = span.closest(".rich-editor");
  const parent = span.parentNode;
  while (span.firstChild) parent.insertBefore(span.firstChild, span);
  parent.removeChild(span);
  if (editor) editor.normalize();
  updateCurrentFromInputs();
  persist();
  hideHighlightToolbar();
}

function stripHighlights(fragment) {
  fragment.querySelectorAll?.("[data-highlight]").forEach((node) => {
    node.replaceWith(...Array.from(node.childNodes));
  });
  return fragment;
}

function addSelectionToCorrection(field) {
  if (!state.selectedText) return;
  const correction = { source: "", fix: "", comment: "", kind: "词汇" };
  correction[field] = state.selectedText;
  addCorrection(correction);
  closeToolbarFully();
}

function addSelectionToBank(target) {
  const entry = currentEntry();
  if (!entry || !state.selectedText) return;
  entry.bank[target] = appendLine(entry.bank[target], state.selectedText);
  state.bankTab = target;
  persist();
  renderAll();
  closeToolbarFully();
}

function closeToolbarFully() {
  hideToolbar();
  window.getSelection()?.removeAllRanges();
  document.activeElement?.blur?.();
}

function addCorrection(correction) {
  const entry = currentEntry();
  if (!entry) return;
  entry.corrections.push(correction);
  // 确保刚添加的类型一定可见
  state.correctionFilter[correction.kind] = true;
  persist();
  renderCorrections();
  renderMetrics();
}

/* ---------------- 富文本清洗 ---------------- */

function cleanEditorHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  div.querySelectorAll("script, style").forEach((node) => node.remove());
  div.querySelectorAll("*").forEach((node) => {
    const highlight = HIGHLIGHT_COLOR_MIGRATIONS[node.dataset?.highlight] || node.dataset?.highlight || "";
    const highlightColor = highlight || node.style?.backgroundColor || "";
    [...node.attributes].forEach((attr) => node.removeAttribute(attr.name));
    if (highlight) {
      node.dataset.highlight = highlight;
      node.style.backgroundColor = highlightColor;
    }
  });
  return div.innerHTML;
}

/* ---------------- 自适应高度（提示区等） ---------------- */

function autoResizeTextareas() {
  [els.promptText, els.meaningText].forEach((textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 86), 220)}px`;
  });
}

/* ---------------- 启动 ---------------- */

function init() {
  loadPreferences();
  applyTheme(state.theme);
  bindEvents();
  renderThemeSwatches();

  // 页面关闭/隐藏前把防抖中的写入立即落盘，避免丢最后几秒的输入
  window.addEventListener("beforeunload", () => {
    clearTimeout(persistTimer);
    flushPersist();
  });
  window.addEventListener("pagehide", () => {
    clearTimeout(persistTimer);
    flushPersist();
  });

  // 增强静态下拉框
  [
    els.typeFilter,
    els.topicFilter,
    els.essayType,
    els.topicSelect,
    els.draftScore,
    els.modelScore,
    els.draftScoreTR,
    els.draftScoreCC,
    els.draftScoreLR,
    els.draftScoreGRA,
    els.modelScoreTR,
    els.modelScoreCC,
    els.modelScoreLR,
    els.modelScoreGRA,
    els.libraryGroupSelect,
  ].forEach(enhanceSelect);

  renderSyncStatus();

  // 字体加载完成后重新测量错误标注框，避免换行变化导致截断
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => regrowCorrectionTextareas());
  }

  restoreFileBinding().then((restored) => {
    if (!restored) {
      loadLocalEntries();
      renderAll();
      renderSyncStatus();
      regrowCorrectionTextareas();
    } else {
      regrowCorrectionTextareas();
    }
  });
}

init();
