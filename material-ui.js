function materialOptions(options, selected) {
  return options.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function renderMaterialTabs(container, active) {
  container.innerHTML = Object.entries(MATERIAL_TYPES).map(([key, { label }]) =>
    `<button class="note-tab ${key === active ? "active" : ""}" type="button" role="tab" aria-selected="${key === active}" data-material-category="${key}">${label}</button>`,
  ).join("");
}

function materialSource(entry) {
  return entry.mode === "task1" ? entry.essayType : entry.topic;
}

function renderMaterialCard(material, entry, inLibrary) {
  const id = escapeHtml(material.id);
  const topic = materialSource(entry);
  const favorite = Boolean(material.favorite);
  return `<article class="library-card material-card" data-material-id="${id}">
    <div class="material-meta">
      <span class="library-tag ${getTagTone(entry.mode, topic)}">${escapeHtml(topic || "未分类")}</span>
      <span>${MATERIAL_TYPES[material.category].types[material.subtype]}</span>
      <span>${entry.mode === "task1" ? "Task 1" : "Task 2"}</span>
    </div>
    <div class="material-copy">${safeMaterialHtml(material.contentHtml)}</div>
    ${material.translation ? `<div class="material-detail">${escapeHtml(material.translation)}</div>` : ""}
    ${material.context ? `<div class="material-detail">使用场景 · ${escapeHtml(material.context)}</div>` : ""}
    ${material.note ? `<div class="material-detail">备注 · ${escapeHtml(material.note)}</div>` : ""}
    ${material.tags?.length ? `<div class="material-meta">${material.tags.map((tag) => `<span class="material-tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    <button type="button" class="material-source" data-material-action="source">来源 · ${escapeHtml(entry.title || "未命名复盘")}</button>
    <div class="material-actions">
      <button type="button" class="secondary-button" data-material-action="edit">编辑</button>
      <button type="button" class="secondary-button" data-material-action="favorite" aria-pressed="${favorite}">${favorite ? "已收藏" : "收藏"}</button>
      <button type="button" class="remove-button" data-material-action="delete">删除</button>
      ${inLibrary ? `<select data-material-review aria-label="复习状态">${materialOptions(Object.entries(MATERIAL_REVIEW), material.reviewStatus)}</select>` : ""}
    </div>
  </article>`;
}

function renderDetailMaterials() {
  const entry = currentEntry();
  if (!entry) return;
  renderMaterialTabs(els.detailBankTabs, state.bankTab);
  const materials = state.materials.filter((item) => item.sourceEntryId === entry.id && item.category === state.bankTab);
  $("#detailMaterials").innerHTML = materials.map((item) => renderMaterialCard(item, entry, false)).join("") ||
    '<div class="empty-library">本篇还没有这类素材。</div>';
}

function renderLibrary() {
  renderMaterialTabs(els.libraryBankTabs, state.libraryBankTab);
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
  ];
  for (const [selector, label, options] of filters) {
    const select = $(selector);
    select.innerHTML = materialOptions([["", label], ...options], select.value);
  }
  renderLibraryContent();
}

function renderLibraryContent() {
  const query = $("#librarySearch").value.trim().toLowerCase();
  const mode = $("#libraryTask").value;
  const topic = $("#libraryTopic").value;
  const subtype = $("#librarySubtype").value;
  const source = $("#librarySource").value;
  const review = $("#libraryReview").value;
  const favorites = $("#libraryFavorites").checked;
  const entries = new Map(state.entries.map((entry) => [entry.id, entry]));
  const matches = state.materials.filter((item) => {
    const entry = entries.get(item.sourceEntryId);
    if (!entry || item.category !== state.libraryBankTab || (mode && entry.mode !== mode) ||
        (topic && materialSource(entry) !== topic) || (subtype && item.subtype !== subtype) ||
        (source && entry.id !== source) || (review && item.reviewStatus !== review) || (favorites && !item.favorite)) return false;
    const searchable = [item.plainText || materialPlainText(safeMaterialHtml(item.contentHtml)), item.translation, item.note,
      item.context, ...(item.tags || []), entry.title, materialSource(entry), MATERIAL_TYPES[item.category].types[item.subtype]];
    return !query || searchable.join(" ").toLowerCase().includes(query);
  }).sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
    getDateTime(entries.get(b.sourceEntryId).practiceDate) - getDateTime(entries.get(a.sourceEntryId).practiceDate));

  const pages = Math.max(1, Math.ceil(matches.length / LIBRARY_PAGE_SIZE));
  state.libraryPage = Math.min(state.libraryPage, pages);
  const items = matches.slice((state.libraryPage - 1) * LIBRARY_PAGE_SIZE, state.libraryPage * LIBRARY_PAGE_SIZE);
  els.libraryContent.innerHTML = items.length
    ? `<div class="library-card-grid">${items.map((item) => renderMaterialCard(item, entries.get(item.sourceEntryId), true)).join("")}</div>`
    : '<div class="empty-library">没有符合条件的素材。</div>';
  $("#libraryResultCount").textContent = `共 ${matches.length} 条`;
  renderLibraryPagination(pages, matches.length);
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
  $("#materialTranslation").value = data.translation || "";
  $("#materialContext").value = data.context || "";
  $("#materialNote").value = data.note || "";
  $("#materialTags").value = (data.tags || []).join("，");
  dialog.showModal();
  $("#materialBody").focus();
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
  const material = {
    id: existing?.id || `material-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    category: $("#materialCategory").value, subtype: $("#materialSubtype").value, contentHtml, plainText,
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
}

function refreshMaterials() {
  persist();
  if (!els.libraryView.classList.contains("hidden")) renderLibrary();
  else renderDetailMaterials();
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
  $("#materialCancel").addEventListener("click", () => $("#materialDialog").close());
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
    state.libraryPage = 1;
    renderLibraryContent();
  });
  $("#libraryFilters").addEventListener("change", () => {
    state.libraryPage = 1;
    renderLibrary();
  });
  for (const list of [els.libraryContent, $("#detailMaterials")]) {
    list.addEventListener("click", (event) => {
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
        $("#entryTitle").focus();
      } else if (action === "edit") {
        openMaterialEditor(material);
      } else if (action === "favorite") {
        material.favorite = !material.favorite;
        refreshMaterials();
      } else if (action === "delete" && window.confirm("确定删除这条素材吗？")) {
        removeEntryMaterials(entry, ({ id }) => id === material.id);
        refreshMaterials();
      }
    });
  }
  els.libraryContent.addEventListener("change", (event) => {
    if (!event.target.matches("[data-material-review]")) return;
    const material = state.materials.find(({ id }) => id === event.target.closest("[data-material-id]").dataset.materialId);
    if (!material) return;
    material.reviewStatus = event.target.value;
    refreshMaterials();
  });
}
