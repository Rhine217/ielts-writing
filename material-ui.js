function materialOptions(options, selected) {
  return options.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function renderMaterialTabs(container, active) {
  if (!container.children.length) {
    container.innerHTML = Object.entries(MATERIAL_TYPES).map(([key, { label }]) =>
      `<button class="note-tab" type="button" role="tab" data-material-category="${key}">${label}</button>`,
    ).join("");
  }
  for (const button of container.children) {
    const selected = button.dataset.materialCategory === active;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
}

function materialSource(entry) {
  return entry.mode === "task1" ? entry.essayType : entry.topic;
}

function materialDisplay(material) {
  const html = safeMaterialHtml(material.contentHtml);
  if (material.translation || material.category === "strategy" || material.subtype === "usageNote") return { html, translation: material.translation };
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const text = materialPlainText(html);
  if (text.includes("\n") || holder.querySelector("br, div, p, ul, ol, li")) return { html, translation: "" };
  const translationStart = text.match(/^[A-Za-z][^\p{Script=Han}]*?(?:[:：]\s*|\s+)(?=\p{Script=Han})/u);
  if (!translationStart) return { html, translation: "" };
  const english = text.slice(0, translationStart[0].length).trimEnd().replace(/[:：]$/, "");
  const translation = text.slice(translationStart[0].length);
  if (!english || !translation) return { html, translation: "" };

  // Isolate the English in the card while keeping its inline formatting.
  const start = holder.textContent.indexOf(english);
  if (start < 0) return { html, translation: "" };
  const cutoff = start + english.length;
  const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
  let length = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (length + node.length >= cutoff) {
      const range = document.createRange();
      range.setStart(node, cutoff - length);
      range.setEnd(holder, holder.childNodes.length);
      const translated = range.extractContents();
      const wrapper = document.createElement("div");
      wrapper.append(translated);
      // Strip only the visual separator between the two languages.
      const firstText = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT).nextNode();
      if (firstText) firstText.data = firstText.data.replace(/^\s*[:：]?\s*/, "");
      return { html: holder.innerHTML, translationHtml: wrapper.innerHTML };
    }
    length += node.length;
  }
  return { html, translation: "" };
}

function renderMaterialCard(material, entry, inLibrary) {
  const id = escapeHtml(material.id);
  const topic = materialSource(entry);
  const favorite = Boolean(material.favorite);
  const display = materialDisplay(material);
  const type = MATERIAL_TYPES[material.category].types[material.subtype];
  return `<article class="library-card material-card" data-material-id="${id}" data-category="${material.category}">
    <div class="material-meta">
      <span class="library-tag">${escapeHtml(topic || "未分类")}</span>
      <span>${type}</span>
      <span>${entry.mode === "task1" ? "Task 1" : "Task 2"}</span>
    </div>
    ${material.category === "strategy" ? `<h3 class="material-title">${escapeHtml(material.title || type)}</h3>` : ""}
    <div class="material-copy">${display.html}</div>
    ${display.translationHtml || display.translation ? `<div class="material-detail material-translation">${display.translationHtml || escapeHtml(display.translation)}</div>` : ""}
    ${material.context ? `<div class="material-detail">使用场景 · ${escapeHtml(material.context)}</div>` : ""}
    ${material.note ? `<div class="material-detail">备注 · ${escapeHtml(material.note)}</div>` : ""}
    ${material.tags?.length ? `<div class="material-meta">${material.tags.map((tag) => `<span class="material-tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    <button type="button" class="material-source" data-material-action="source">来源 · ${escapeHtml(entry.title || "未命名复盘")}</button>
    <div class="material-actions">
      <button type="button" class="secondary-button" data-material-action="edit">编辑</button>
      <button type="button" class="secondary-button" data-material-action="favorite" aria-pressed="${favorite}">${favorite ? "已收藏" : "收藏"}</button>
      <button type="button" class="remove-button" data-material-action="delete">删除</button>
      ${inLibrary ? `<select data-material-review data-status="${material.reviewStatus}" aria-label="复习状态">${materialOptions(Object.entries(MATERIAL_REVIEW), material.reviewStatus)}</select>` : ""}
    </div>
  </article>`;
}

const libraryFilterIds = ["librarySearch", "libraryTask", "libraryTopic", "librarySubtype", "librarySource", "libraryReview", "libraryTag", "libraryFavorites"];
let librarySearchTimer;

function getLibraryViewState() {
  return {
    category: state.libraryBankTab, page: state.libraryPage, expanded: $("#libraryFilterDisclosure").open,
    filters: Object.fromEntries(libraryFilterIds.map((id) => {
      const field = document.getElementById(id);
      return [id, field.type === "checkbox" ? field.checked : field.value];
    })),
  };
}

function restoreLibraryViewState(saved) {
  if (!saved) return;
  if (Object.hasOwn(MATERIAL_TYPES, saved.category)) state.libraryBankTab = saved.category;
  $("#libraryFilterDisclosure").open = Boolean(saved.expanded);
  // Populate options in Task order before restoring dependent filters.
  $("#libraryTask").value = saved.filters?.libraryTask || "";
  populateLibraryFilters();
  for (const id of libraryFilterIds) {
    const field = document.getElementById(id);
    if (field.type === "checkbox") field.checked = saved.filters?.[id] === true;
    else {
      field.value = saved.filters?.[id] || "";
      if (field instanceof HTMLSelectElement && field.selectedIndex < 0) field.selectedIndex = 0;
    }
  }
  state.libraryPage = Number.isInteger(saved.page) ? Math.max(1, saved.page) : 1;
}

function resetLibraryFilters() {
  clearTimeout(librarySearchTimer);
  for (const id of libraryFilterIds) {
    const field = document.getElementById(id);
    if (field.type === "checkbox") field.checked = false;
    else field.value = "";
  }
  state.libraryPage = 1;
  renderLibrary();
}

function renderDetailMaterials() {
  const entry = currentEntry();
  if (!entry) return;
  renderMaterialTabs(els.detailBankTabs, state.bankTab);
  const materials = state.materials.filter((item) => item.sourceEntryId === entry.id && item.category === state.bankTab);
  $("#detailMaterials").innerHTML = materials.map((item) => renderMaterialCard(item, entry, false)).join("") ||
    '<div class="empty-library">本篇还没有这类素材。</div>';
}

function populateLibraryFilters() {
  const mode = $("#libraryTask").value;
  const scopedEntries = state.entries.filter((entry) => !mode || entry.mode === mode);
  const topics = [...new Set(scopedEntries.map(materialSource).filter(Boolean))];
  const types = Object.entries(MATERIAL_TYPES[state.libraryBankTab].types)
    .filter(([key]) => mode !== "task2" || !CHART_MATERIAL_TYPES.has(key) ||
      state.materials.some((item) => item.subtype === key && scopedEntries.some((entry) => entry.id === item.sourceEntryId)));
  const filters = [
    ["#libraryTopic", "全部话题 / 题型", topics.map((topic) => [topic, topic])],
    ["#librarySubtype", "全部素材类型", types],
    ["#librarySource", "全部来源作文", scopedEntries.map((entry) => [entry.id, entry.title || "未命名复盘"])],
    ["#libraryTag", "全部个人标签", [...new Set(state.materials.flatMap(({ tags }) => tags || []))].sort().map((tag) => [tag, tag])],
  ];
  for (const [selector, label, options] of filters) {
    const select = $(selector);
    select.innerHTML = materialOptions([["", label], ...options], select.value);
  }
}

function renderLibrary() {
  clearTimeout(librarySearchTimer);
  renderMaterialTabs(els.libraryBankTabs, state.libraryBankTab);
  populateLibraryFilters();
  renderLibraryContent();
}

function renderActiveFilters() {
  const names = { librarySearch: "搜索", libraryTopic: "", librarySubtype: "", librarySource: "来源",
    libraryReview: "", libraryTag: "标签", libraryFavorites: "" };
  const active = [];
  for (const id of libraryFilterIds) {
    const field = document.getElementById(id);
    const label = field.type === "checkbox" ? (field.checked ? "仅看收藏" : "") :
      field.value.trim() && (field.selectedOptions?.[0]?.text || field.value.trim());
    if (!label) continue;
    const name = names[id] ? `${names[id]} · ${label}` : label;
    active.push(`<button type="button" class="active-filter" data-clear-filter="${id}" aria-label="移除筛选 ${escapeHtml(name)}" title="${escapeHtml(name)}">${escapeHtml(name)} ×</button>`);
  }
  $("#libraryActiveFilters").innerHTML = active.join("");
  $("#libraryFilterCount").hidden = !active.length;
  $("#libraryFilterCount").textContent = `${active.length} 项`;
  $("#clearLibraryFilters").disabled = !active.length;
  return active.length;
}

function renderLibraryContent() {
  const query = $("#librarySearch").value.trim().toLowerCase();
  const mode = $("#libraryTask").value;
  const topic = $("#libraryTopic").value;
  const subtype = $("#librarySubtype").value;
  const source = $("#librarySource").value;
  const review = $("#libraryReview").value;
  const favorites = $("#libraryFavorites").checked;
  const tag = $("#libraryTag").value;
  const entries = new Map(state.entries.map((entry) => [entry.id, entry]));
  const matches = state.materials.filter((item) => {
    const entry = entries.get(item.sourceEntryId);
    if (!entry || item.category !== state.libraryBankTab || (mode && entry.mode !== mode) ||
        (topic && materialSource(entry) !== topic) || (subtype && item.subtype !== subtype) ||
        (source && entry.id !== source) || (review && item.reviewStatus !== review) || (favorites && !item.favorite) ||
        (tag && !item.tags?.includes(tag))) return false;
    if (!query) return true;
    const searchable = [item.title, item.plainText || materialPlainText(safeMaterialHtml(item.contentHtml)), item.translation, item.note,
      item.context, ...(item.tags || []), entry.title, materialSource(entry), MATERIAL_TYPES[item.category].types[item.subtype]];
    return searchable.join(" ").toLowerCase().includes(query);
  }).sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
    getDateTime(entries.get(b.sourceEntryId).practiceDate) - getDateTime(entries.get(a.sourceEntryId).practiceDate));

  const pages = Math.max(1, Math.ceil(matches.length / LIBRARY_PAGE_SIZE));
  state.libraryPage = Math.min(state.libraryPage, pages);
  const items = matches.slice((state.libraryPage - 1) * LIBRARY_PAGE_SIZE, state.libraryPage * LIBRARY_PAGE_SIZE);
  const hasFilters = renderActiveFilters();
  const category = MATERIAL_TYPES[state.libraryBankTab].label;
  const emptyHint = state.libraryBankTab === "strategy" ? "可从本篇思路收藏可复用的写法，也可以手动添加。" : "从作文详情收藏，或直接添加一条素材。";
  els.libraryContent.innerHTML = items.length
    ? `<div class="library-card-grid">${items.map((item) => renderMaterialCard(item, entries.get(item.sourceEntryId), true)).join("")}</div>`
    : hasFilters
      ? '<div class="empty-library"><strong>没有符合条件的素材</strong><p>试试缩短关键词，或清除部分筛选条件。</p><button type="button" class="text-button" data-reset-library>重置筛选</button></div>'
      : `<div class="empty-library"><strong>还没有${category}</strong><p>${emptyHint}</p></div>`;
  $("#libraryTotal").textContent = `全部 ${state.materials.length} 条素材`;
  $("#libraryResultCount").textContent = `找到 ${matches.length} 条`;
  renderLibraryPagination(pages, matches.length);
  rememberWorkspace();
}

function addMaterials(entry, materials) {
  state.materials.push(...materials);
  entry.materialIds.push(...materials.map(({ id }) => id));
}

function removeEntryMaterials(entry, predicate = () => true) {
  const removed = new Set(state.materials.filter((item) => item.sourceEntryId === entry.id && predicate(item)).map(({ id }) => id));
  state.materials = state.materials.filter((item) => !removed.has(item.id));
  entry.materialIds = entry.materialIds.filter((id) => !removed.has(id));
}

function populateMaterialTypes(selected) {
  const category = $("#materialCategory").value;
  const entry = state.entries.find(({ id }) => id === $("#materialSource").value);
  const options = Object.entries(MATERIAL_TYPES[category].types)
    .filter(([key]) => key === selected || entry?.mode !== "task2" || !CHART_MATERIAL_TYPES.has(key));
  $("#materialSubtype").innerHTML = materialOptions(options, selected);
  $("#materialTitleField").hidden = category !== "strategy";
}

function openMaterialEditor(data = {}) {
  if (!state.entries.length) {
    showToast("请先新建作文，再添加素材", "error");
    return;
  }
  const dialog = $("#materialDialog");
  const form = $("#materialForm");
  form.dataset.materialId = data.id || "";
  form.dataset.sourceField = data.sourceField || "";
  $("#materialError").hidden = true;
  $("#materialEditorTitle").textContent = data.id ? "编辑素材" : "添加素材";
  $("#materialSource").innerHTML = materialOptions(state.entries.map((entry) =>
    [entry.id, entry.title || "未命名复盘"]), data.sourceEntryId || currentEntry()?.id || $("#librarySource").value);
  $("#materialSource").disabled = Boolean(data.sourceEntryId || currentEntry());
  $("#materialCategory").value = data.category || (currentEntry() ? state.bankTab : state.libraryBankTab);
  populateMaterialTypes(data.subtype);
  $("#materialBody").innerHTML = safeMaterialHtml(data.contentHtml || "");
  $("#materialTitle").value = data.title || "";
  $("#materialTranslation").value = data.translation || "";
  $("#materialContext").value = data.context || "";
  $("#materialNote").value = data.note || "";
  $("#materialTags").value = (data.tags || []).join("，");
  dialog.showModal();
  form.dataset.initial = materialFormSnapshot();
  $("#materialBody").focus();
}

function materialFormSnapshot() {
  return JSON.stringify([...$("#materialForm").querySelectorAll("select, input, textarea, [contenteditable]")].map((field) =>
    field.isContentEditable ? field.innerHTML : field.value,
  ));
}

function requestMaterialClose() {
  const form = $("#materialForm");
  if (materialFormSnapshot() !== form.dataset.initial && !window.confirm("放弃尚未保存的素材修改吗？")) return;
  $("#materialDialog").close();
}

function saveMaterial(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const contentHtml = safeMaterialHtml($("#materialBody").innerHTML);
  const plainText = materialPlainText(contentHtml);
  const entry = state.entries.find(({ id }) => id === $("#materialSource").value);
  if (!entry || !plainText) {
    $("#materialError").textContent = "请填写素材内容并选择来源作文";
    $("#materialError").hidden = false;
    $("#materialBody").focus();
    return;
  }
  const existing = state.materials.find(({ id }) => id === form.dataset.materialId);
  const unchangedBody = existing && safeMaterialHtml(existing.contentHtml) === contentHtml;
  const title = $("#materialCategory").value === "strategy" ? $("#materialTitle").value.trim() : "";
  const material = {
    id: existing?.id || `material-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    category: $("#materialCategory").value, subtype: $("#materialSubtype").value,
    contentHtml: unchangedBody ? existing.contentHtml : contentHtml,
    plainText: unchangedBody ? existing.plainText : plainText,
    ...(title || existing?.title ? { title } : {}),
    translation: $("#materialTranslation").value.trim(), context: $("#materialContext").value.trim(),
    note: $("#materialNote").value.trim(),
    tags: [...new Set($("#materialTags").value.split(/[,，\n]+/).map((tag) => tag.trim()).filter(Boolean))],
    sourceEntryId: entry.id, sourceField: form.dataset.sourceField || "manual",
    reviewStatus: existing?.reviewStatus || "new", favorite: existing?.favorite ?? Boolean(form.dataset.sourceField),
  };
  if (existing) Object.assign(existing, material);
  else addMaterials(entry, [material]);
  if (currentEntry()) state.bankTab = material.category;
  else if (state.libraryBankTab !== material.category) {
    state.libraryBankTab = material.category;
    $("#librarySubtype").value = "";
  }
  $("#materialDialog").close();
  refreshMaterials();
  document.querySelector(`[data-material-id="${CSS.escape(material.id)}"] [data-material-action="edit"]`)?.focus({ preventScroll: true });
  showToast(existing ? "素材已保存" : "已添加到素材库");
}

function refreshMaterials() {
  persist();
  if (!els.libraryView.classList.contains("hidden")) renderLibrary();
  else {
    renderDetailMaterials();
    rememberWorkspace();
  }
}

function openMaterialFromCorrection(correction, entry) {
  const fix = safeMaterialHtml(toRichHtml(correction.fix));
  const comment = [correction.reason, correction.comment].filter(Boolean)
    .map((value) => materialPlainText(safeMaterialHtml(toRichHtml(value)))).join("\n");
  const explanation = correction.translation || correction.explanation || correction.meaning ||
    (/\p{Script=Han}/u.test(comment) ? comment : "");
  const strategy = ["逻辑", "任务回应", "衔接"].includes(correction.kind);
  openMaterialEditor({
    contentHtml: fix, sourceEntryId: entry.id, sourceField: "correction",
    category: strategy ? "strategy" : "expression", subtype: strategy ? "argumentation" : "usageNote",
    translation: materialPlainText(safeMaterialHtml(toRichHtml(explanation))), note: explanation === comment ? "" : comment,
  });
}

function bindMaterialEvents() {
  $("#materialForm").addEventListener("submit", saveMaterial);
  $("#materialCancel").addEventListener("click", requestMaterialClose);
  $("#materialClose").addEventListener("click", requestMaterialClose);
  $("#materialDialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    requestMaterialClose();
  });
  $("#materialCategory").addEventListener("change", () => populateMaterialTypes());
  $("#materialSource").addEventListener("change", () => populateMaterialTypes());
  $("#materialBody").addEventListener("paste", (event) => {
    event.preventDefault();
    insertPlainText(event.currentTarget, event.clipboardData?.getData("text/plain") || "");
  });
  $("#addDetailMaterial").addEventListener("click", (event) => {
    event.preventDefault();
    openMaterialEditor();
  });
  $("#addLibraryMaterial").addEventListener("click", () => openMaterialEditor());
  $("#saveThinkingMaterial").addEventListener("pointerdown", (event) => event.preventDefault());
  $("#saveThinkingMaterial").addEventListener("click", (event) => {
    event.preventDefault();
    const selection = window.getSelection();
    const range = selection?.rangeCount && selection.getRangeAt(0);
    const content = document.createElement("div");
    if (range && !range.collapsed && els.thinkingText.contains(range.commonAncestorContainer)) {
      content.append(range.cloneContents());
    }
    openMaterialEditor({
      category: "strategy", sourceEntryId: currentEntry()?.id, sourceField: "thinking",
      contentHtml: content.innerHTML || els.thinkingText.innerHTML,
    });
  });
  els.detailBankTabs.addEventListener("click", (event) => {
    const category = event.target.closest("[data-material-category]")?.dataset.materialCategory;
    if (!category) return;
    state.bankTab = category;
    renderDetailMaterials();
    rememberWorkspace();
  });
  els.libraryBankTabs.addEventListener("click", (event) => {
    const category = event.target.closest("[data-material-category]")?.dataset.materialCategory;
    if (!category) return;
    state.libraryBankTab = category;
    $("#librarySubtype").value = "";
    state.libraryPage = 1;
    renderLibrary();
  });
  $("#librarySearch").addEventListener("input", () => {
    clearTimeout(librarySearchTimer);
    librarySearchTimer = setTimeout(() => {
      state.libraryPage = 1;
      if (!els.libraryView.classList.contains("hidden")) renderLibraryContent();
    }, 180);
  });
  $("#libraryFilterDisclosure").addEventListener("toggle", rememberWorkspace);
  $("#clearLibraryFilters").addEventListener("click", () => {
    resetLibraryFilters();
    $("#librarySearch").focus();
  });
  $("#libraryActiveFilters").addEventListener("click", (event) => {
    const id = event.target.closest("[data-clear-filter]")?.dataset.clearFilter;
    if (!id) return;
    const field = document.getElementById(id);
    if (field.type === "checkbox") field.checked = false;
    else field.value = "";
    state.libraryPage = 1;
    renderLibrary();
    $("#librarySearch").focus({ preventScroll: true });
  });
  for (const tabs of [els.libraryBankTabs, els.detailBankTabs]) {
    tabs.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...tabs.children];
      const index = buttons.indexOf(event.target);
      if (index < 0) return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + direction + buttons.length) % buttons.length;
      buttons[next].click();
      buttons[next].focus();
    });
  }
  $("#libraryFilters").addEventListener("change", () => {
    state.libraryPage = 1;
    renderLibrary();
  });
  for (const list of [els.libraryContent, $("#detailMaterials")]) {
    list.addEventListener("click", (event) => {
      if (event.target.closest("[data-reset-library]")) {
        resetLibraryFilters();
        $("#librarySearch").focus();
        return;
      }
      const action = event.target.closest("[data-material-action]")?.dataset.materialAction;
      const card = event.target.closest("[data-material-id]");
      if (!action || !card) return;
      const material = state.materials.find(({ id }) => id === card.dataset.materialId);
      const entry = state.entries.find(({ id }) => id === material?.sourceEntryId);
      if (!entry) return;
      if (action === "source") {
        state.currentId = entry.id;
        state.mode = entry.mode;
        state.bankTab = material.category;
        renderAll();
        finishNavigation();
        $("#entryTitle").focus({ preventScroll: true });
      } else if (action === "edit") {
        openMaterialEditor(material);
      } else if (action === "favorite") {
        material.favorite = !material.favorite;
        refreshMaterials();
        list.querySelector(`[data-material-id="${CSS.escape(material.id)}"] [data-material-action="favorite"]`)?.focus({ preventScroll: true });
        showToast(material.favorite ? "已收藏素材" : "已取消收藏");
      } else if (action === "delete" && window.confirm("确定删除这条素材吗？")) {
        removeEntryMaterials(entry, ({ id }) => id === material.id);
        refreshMaterials();
        showToast("已删除素材");
      }
    });
  }
  els.libraryContent.addEventListener("change", (event) => {
    if (!event.target.matches("[data-material-review]")) return;
    const material = state.materials.find(({ id }) => id === event.target.closest("[data-material-id]").dataset.materialId);
    if (!material) return;
    material.reviewStatus = event.target.value;
    refreshMaterials();
    els.libraryContent.querySelector(`[data-material-id="${CSS.escape(material.id)}"] [data-material-review]`)?.focus({ preventScroll: true });
    showToast(`复习状态已更新为「${MATERIAL_REVIEW[material.reviewStatus]}」`);
  });
}
