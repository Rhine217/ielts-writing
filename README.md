# IELTS Writing Review — 增强复刻版

基于 [pinksoso69/ielts-writing-review](https://github.com/pinksoso69/ielts-writing-review) 复刻并增强的雅思写作复盘工具。单页应用，无需后端，把写作练习拆成**题目、原文、批改、范文、素材和思路**六个部分。

## 相比原版新增的功能

### 1. JSON 文件同步（跨设备共用同一份数据）
侧栏新增「数据文件同步」面板：

- **打开/绑定文件**：直接选择坚果云（或任何网盘）同步目录里**已存在**的 JSON 文件。之后每次修改都会**自动保存**回这个文件，坚果云再同步到你的其他电脑。
- **新建数据文件**：坚果云目录里还没有文件时，用它**选定坚果云文件夹**，应用会自动在文件夹里创建 `ielts-writing-review-data.json` 并绑定（当前数据会写入新文件，之后自动保存；若文件夹里已有同名文件会先询问是否覆盖）。
- **保存到文件**：手动立即写盘（未开启自动保存时用）。
- **自动保存开关**：默认开启，防抖 800ms。
- 文件句柄保存在浏览器 IndexedDB 里，下次打开自动恢复，无需重新选择。

> 自动写回依赖浏览器「文件系统访问 API（File System Access API）」，**仅在 HTTPS（GitHub Pages 等）或 localhost 下的 Chrome / Edge 中可用**。
> 其他环境（直接双击 HTML、Safari/Firefox）会自动降级为「选择文件读取 + 手动保存下载」，数据仍可导出。

**坚果云跨设备用法**：
1. 先部署一次（见下方「部署到任意电脑都能用」），得到一个 HTTPS 网址。
2. 在电脑 A 用 Chrome 打开这个网址，点「打开/绑定文件」（或「新建数据文件」），选择坚果云目录里的 `data.json`。
3. 正常使用，所有改动自动写回该文件 → 坚果云同步。
4. 在电脑 B 用 Chrome 打开同一个网址，同样「打开/绑定文件」选择同一个 `data.json`，两边的记录即一致。

> ⚠️ 不要在同一时间在 A、B 两台电脑上同时编辑，网盘同步会产生冲突。建议只在一台设备编辑。

### 2. 四维小分记录
「我的版本」和「范文版本」面板下各新增一行评分条，可分别记录四个维度的小分：

| 维度 | 英文 | 含义 |
|---|---|---|
| TR | Task Response | 任务完成度 |
| CC | Coherence & Cohesion | 连贯与衔接 |
| LR | Lexical Resource | 词汇资源 |
| GRA | Grammatical Range & Accuracy | 语法广度与准确性 |

- 右上角显示**四维均分**，点击均分胶囊即可把均分填入总分（按雅思 0.5 档四舍五入）。
- 总分仍可独立填写，保留原版能力。

### 3. 主题色选择
侧栏「外观主题」提供 7 套配色：海蓝、森林、蔷薇、紫罗兰、琥珀、石墨、**深夜（深色模式）**。选择即时生效并记住，深色模式会自适应全局配色。

### 4. 错误标注框随内容增高
每条错误标注的「原句/问题」「修改建议」「个人批注」文本框会随着输入内容自动增高，不再固定高度截断。

### 5. 错误标注按类型筛选
错误标注面板顶部新增筛选条，可按 7 种错误类型（语法 / 词汇 / 搭配 / 逻辑 / 衔接 / 任务回应 / 其他）分别显示或隐藏，每种类型带彩色圆点标识与计数。筛选状态会记忆。

### 6. 自定义下拉框
所有原生 `<select>` 替换为自定义下拉框：自定义触发按钮、悬浮面板、hover/选中态、键盘导航（↑/↓ 移动、Enter 选择、Esc 关闭）、自动向上翻页防止溢出。原生的值读写逻辑完全兼容。

## 部署到任意电脑都能用（推荐）

浏览器只允许 **HTTPS 或 localhost** 环境直接写回文件。本地 `localhost` 只在当前电脑有效，要在多台电脑用，**只需部署一次**，之后任何电脑打开同一个 HTTPS 网址即可（自动写回坚果云文件照常工作，无需安装任何东西）。

### 方式一：GitHub Pages（推荐）

1. 注册/登录 GitHub（github.com），新建一个空仓库，例如 `ielts-writing-review`。
2. 在本项目目录执行（把仓库地址换成你自己的）：

```bash
git init -b main
git add index.html app.js styles.css README.md
git commit -m "deploy: IELTS Writing Review"
git remote add origin https://github.com/你的用户名/ielts-writing-review.git
git push -u origin main
```

3. 在仓库页面 **Settings → Pages**，Source 选 `main` 分支、根目录，保存。
4. 等一两分钟，打开 `https://你的用户名.github.io/ielts-writing-review/` 即可，任何电脑都一样。

### 方式二：Netlify Drop（更简单，拖拽即用）

1. 打开 https://app.netlify.com/drop
2. 把 `index.html`、`app.js`、`styles.css` 这三个文件（或整个文件夹）拖进去
3. 得到一个 `https://xxx.netlify.app` 网址，HTTPS，任何电脑可打开

### 本地预览（仅当前电脑调试用）

```bash
python -m http.server 8123
# 浏览器打开 http://localhost:8123/
```

> 直接双击 index.html（file://）能用但**不能自动写回文件**，只适合临时查看。

## 数据格式

数据文件是 JSON，结构如下（与「导出备份」格式兼容，新增了四维评分与主题）：

```json
{
  "app": "ielts-writing-review",
  "version": 2,
  "kind": "data",
  "exportedAt": "2026-08-05T00:00:00.000Z",
  "entries": [
    {
      "id": "entry-...",
      "mode": "task2",
      "title": "城市居民运动减少：原因与措施",
      "essayType": "问题措施",
      "topic": "健康",
      "practiceDate": "2026-04-25",
      "prompt": "...",
      "meaning": "...",
      "draftHtml": "...",
      "modelHtml": "...",
      "draftScore": "5.5",
      "modelScore": "7",
      "draftScores": { "tr": "5", "cc": "5.5", "lr": "5.5", "gra": "5" },
      "modelScores": { "tr": "7", "cc": "7", "lr": "7.5", "gra": "7" },
      "bank": { "collocations": "...", "keyNotes": "...", "...": "..." },
      "corrections": [
        { "source": "...", "fix": "...", "comment": "...", "kind": "词汇" }
      ],
      "stance": "...",
      "arguments": "..."
    }
  ],
  "preferences": {
    "highlightLabels": { "#ffe998": "好表达 / 可复用", "...": "..." },
    "bankLabels": { "task2": { "collocations": "固定搭配", "...": "..." } },
    "examSummary": "...",
    "theme": "ocean",
    "correctionFilter": { "语法": true, "词汇": true, "搭配": true, "逻辑": true, "衔接": true, "任务回应": true, "其他": true }
  }
}
```

旧版 localStorage 数据（v1/v2/v3）会在首次打开时自动迁移。

## 文件说明

| 文件 | 说明 |
|---|---|
| `index.html` | 应用入口 |
| `app.js` | 全部逻辑（数据、渲染、文件同步、自定义下拉框） |
| `styles.css` | 全部样式（主题变量、深色模式、新组件） |
| `original/` | 原版参考代码（只读存档） |
