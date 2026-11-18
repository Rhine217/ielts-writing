/* Shared material taxonomy and versioned data migration. */
const MATERIAL_TYPES = {
  expression: {
    label: "表达素材",
    types: {
      vocabulary: "单词与术语",
      synonym: "同义替换",
      collocation: "固定搭配与词块",
      sentencePattern: "句型与表达模板",
      chartVocabulary: "图表专属词汇",
      chartExpression: "趋势、流程及数据表达",
      usageNote: "用法辨析",
    },
  },
  idea: {
    label: "观点与内容",
    types: { argument: "主题论据", example: "具体例子", causeEffect: "原因与影响", solution: "解决措施", reasoning: "可复用的论证内容" },
  },
  strategy: {
    label: "写作方法",
    types: {
      promptAnalysis: "审题方法", structure: "文章结构", development: "段落展开", argumentation: "论证方法",
      dataGrouping: "数据筛选与分组", overview: "Overview 写法", comparison: "对比与衔接技巧", pitfalls: "常见语法及写作易错点",
    },
  },
};

const LEGACY_MATERIAL_FIELDS = new Map([
  ["vocabulary", ["expression", "vocabulary"]],
  ["synonyms", ["expression", "synonym"]],
  ["collocations", ["expression", "collocation"]],
  ["sentences", ["expression", "sentencePattern"]],
  ["chartWords", ["expression", "chartVocabulary"]],
  ["trendPhrases", ["expression", "chartExpression"]],
  ["ideas", ["idea", "argument"]],
  ["keyNotes", ["expression", "usageNote"]],
]);
const MATERIAL_REVIEW = { new: "未复习", mastered: "已掌握", revisit: "需要复习" };
const CHART_MATERIAL_TYPES = new Set(["chartVocabulary", "chartExpression", "dataGrouping", "overview"]);
const MATERIAL_BLOCKS = new Set(["DIV", "P", "LI", "UL", "OL", "BLOCKQUOTE", "PRE"]);
const MATERIAL_INLINE = new Set(["B", "STRONG", "I", "EM", "U", "S", "DEL", "MARK", "SPAN", "SUB", "SUP", "CODE", "SMALL"]);

// Keep rich text inert, including while parsing pasted or imported HTML.
function safeMaterialHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const result = document.createElement("div");
  function copy(node, target) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.append(node.data);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (["SCRIPT", "STYLE", "TEMPLATE", "IFRAME", "OBJECT", "SVG", "MATH"].includes(tag)) return;
    let output = target;
    if (tag === "BR" || MATERIAL_BLOCKS.has(tag) || MATERIAL_INLINE.has(tag)) {
      output = document.createElement(tag);
      if (node.style.fontWeight && /^(bold|[1-9]00)$/.test(node.style.fontWeight)) output.style.fontWeight = node.style.fontWeight;
      if (node.style.fontStyle === "italic") output.style.fontStyle = "italic";
      if (/^(underline|line-through)$/.test(node.style.textDecoration)) output.style.textDecoration = node.style.textDecoration;
      const highlight = node.dataset.highlight;
      if (highlight && /^#[\da-f]{6}$/i.test(highlight)) {
        output.dataset.highlight = highlight;
        output.style.backgroundColor = highlight;
      }
      target.append(output);
    }
    node.childNodes.forEach((child) => copy(child, output));
  }
  template.content.childNodes.forEach((node) => copy(node, result));
  return result.innerHTML;
}

function materialPlainText(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  let text = "";
  function read(node) {
    if (node.nodeType === Node.TEXT_NODE) text += node.data;
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === "BR") {
      text += "\n";
      return;
    }
    const block = MATERIAL_BLOCKS.has(node.tagName);
    if (block && text && !text.endsWith("\n")) text += "\n";
    node.childNodes.forEach(read);
    if (block && !text.endsWith("\n")) text += "\n";
  }
  template.content.childNodes.forEach(read);
  return text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function splitMaterialHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const lines = [];
  let line = document.createElement("div");
  const ancestors = [];

  function finishLine(separator) {
    if (line.hasChildNodes() || separator === "<br>") lines.push({ html: line.innerHTML, separator });
    line = document.createElement("div");
    ancestors.forEach((ancestor) => { ancestor.output = null; });
  }

  function append(text) {
    if (!text) return;
    let target = line;
    for (const ancestor of ancestors) {
      if (!ancestor.output) {
        ancestor.output = ancestor.node.cloneNode(false);
        target.append(ancestor.output);
      }
      target = ancestor.output;
    }
    target.append(text);
  }

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.data.split(/\r\n?|\n/).forEach((text, index) => {
        if (index) finishLine("\n");
        append(text);
      });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === "BR") {
      finishLine("<br>");
      return;
    }
    const block = MATERIAL_BLOCKS.has(node.tagName);
    if (block) finishLine("");
    ancestors.push({ node, output: null });
    node.childNodes.forEach(walk);
    ancestors.pop();
    if (block) finishLine("");
  }

  template.content.childNodes.forEach(walk);
  finishLine("");
  const groups = [];
  let pending = "";
  for (const line of lines) {
    const text = materialPlainText(line.html);
    const previous = groups.at(-1);
    if (!text) {
      pending += line.html + line.separator;
      continue;
    }
    // A separate Chinese explanation belongs with its preceding expression.
    if (previous && /^[\s\p{P}\d]*\p{Script=Han}/u.test(text)) {
      previous.html += previous.separator + pending + line.html;
      previous.separator = line.separator;
    } else {
      groups.push({ html: line.html, separator: line.separator });
    }
    pending = "";
  }
  return groups.map((group) => group.html);
}

function migrateBank(entryId, bank) {
  const materials = [];
  const issues = [];
  let migratedBlocks = 0;
  for (const [field, raw] of Object.entries(bank || {})) {
    if (raw == null || raw === "") continue;
    if (typeof raw !== "string") {
      issues.push({ entryId, field, reason: "非文本字段，原值已保存在 legacyBank" });
      continue;
    }
    const html = safeMaterialHtml(/<[a-z!/]/i.test(raw) ? raw : textToHtml(raw));
    if (!materialPlainText(html)) {
      const original = document.createElement("template");
      original.innerHTML = raw;
      if (materialPlainText(raw) || original.content.querySelector("img, svg, video, audio, canvas, iframe, object, embed")) {
        issues.push({ entryId, field, reason: "没有可显示的文字，原值已保存在 legacyBank" });
      }
      continue;
    }
    const mapping = LEGACY_MATERIAL_FIELDS.get(field);
    const [category, subtype] = mapping || ["expression", "usageNote"];
    if (!mapping) issues.push({ entryId, field, reason: "未识别的分类，已完整保留为用法辨析" });
    let parts = mapping ? splitMaterialHtml(html) : [html];
    if (category === "idea" && parts.length > 1 && !parts.every((part) => {
      const text = materialPlainText(part);
      return /[A-Za-z]/.test(text) && /\p{Script=Han}/u.test(text);
    })) parts = [html];
    (parts.length ? parts : [html]).forEach((contentHtml, index) => materials.push({
      id: `material-v3:${encodeURIComponent(entryId)}:${encodeURIComponent(field)}:${index + 1}`,
      category, subtype, contentHtml, plainText: materialPlainText(contentHtml),
      note: "", tags: [], sourceEntryId: entryId, sourceField: field,
      reviewStatus: "new", favorite: false,
    }));
    migratedBlocks++;
  }
  return { materials, issues, migratedBlocks };
}

function migrateV3ToV4(data) {
  validateEntryIds(data.entries);
  const materials = [];
  const issues = [];
  let migratedBlocks = 0;
  const entries = data.entries.map(({ bank, ...entry }) => {
    const legacyBank = clone(bank || {});
    const migrated = migrateBank(entry.id, legacyBank);
    materials.push(...migrated.materials);
    issues.push(...migrated.issues);
    migratedBlocks += migrated.migratedBlocks;
    return { ...entry, legacyBank, materialIds: migrated.materials.map(({ id }) => id) };
  });
  return {
    ...data, app: "ielts-writing-review", version: 4, kind: "data", entries, materials,
    preferences: data.preferences || {},
    migrationReport: { migratedBlocks, materialsCreated: materials.length, issues },
  };
}

function validateEntryIds(entries) {
  if (!Array.isArray(entries) || entries.some((entry) => typeof entry?.id !== "string" || !entry.id || !["task1", "task2"].includes(entry.mode))) {
    throw new Error("作文记录格式无效");
  }
  if (new Set(entries.map(({ id }) => id)).size !== entries.length) throw new Error("作文 ID 重复");
}

function readV4Data(data) {
  validateEntryIds(data.entries);
  if (!Array.isArray(data.materials)) throw new Error("缺少 v4 素材集合");
  const links = new Map(data.entries.map(({ id }) => [id, []]));
  const ids = new Set();
  for (const material of data.materials) {
    if (typeof material?.id !== "string" || !material.id || ids.has(material.id) ||
        !links.has(material.sourceEntryId) || !Object.hasOwn(MATERIAL_TYPES, material.category) ||
        !Object.hasOwn(MATERIAL_TYPES[material.category].types, material.subtype) ||
        typeof material.contentHtml !== "string" || !Object.hasOwn(MATERIAL_REVIEW, material.reviewStatus) ||
        (material.tags != null && (!Array.isArray(material.tags) || material.tags.some((tag) => typeof tag !== "string")))) {
      throw new Error("素材格式无效、ID 重复或缺少来源作文");
    }
    ids.add(material.id);
    links.get(material.sourceEntryId).push(material.id);
  }
  return { ...data, entries: data.entries.map((entry) => ({ ...entry, materialIds: links.get(entry.id) })) };
}
