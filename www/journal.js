(function () {
  "use strict";
  const key = "daoli.journal.v1";
  const elements = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
  const groups = { wood: "甲乙寅卯", fire: "丙丁巳午", earth: "戊己辰戌丑未", metal: "庚辛申酉", water: "壬癸亥子" };
  let entries = {}, date = "", failed = false, ready = false;
  const $ = id => document.getElementById(id);
  const dateKey = d => `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
    const d = new Date(value + "T12:00:00");
    return !isNaN(d) && dateKey(d) === value;
  }
  function validate(data) {
    if (!data || data.version !== 1 || !data.entries || typeof data.entries !== "object" || Array.isArray(data.entries)) throw Error("备份格式不正确");
    const clean = {};
    for (const [day, entry] of Object.entries(data.entries)) {
      if (!validDate(day) || !entry || typeof entry.text !== "string" || entry.text.length > 100000 ||
          !["", "低落", "疲惫", "平静", "愉快", "充沛"].includes(entry.mood) ||
          !entry.influences || typeof entry.influences !== "object" || Array.isArray(entry.influences)) throw Error("备份包含无效日记");
      const influences = {};
      for (const element of Object.keys(elements)) {
        const value = entry.influences[element] || "";
        if (!["", "滋养", "平衡", "消耗"].includes(value)) throw Error("五行记录不正确");
        influences[element] = value;
      }
      clean[day] = { text: entry.text, mood: entry.mood, influences };
    }
    return clean;
  }
  function write(next) {
    localStorage.setItem(key, JSON.stringify({ version: 1, entries: next }));
    entries = next;
    failed = false;
    document.dispatchEvent(new Event("journal-updated"));
  }
  function save() {
    const entry = { text: $("journalText").value, mood: $("journalMood").value, influences: {} };
    for (const element of Object.keys(elements)) entry.influences[element] = $("influence-" + element).value;
    const next = { ...entries };
    if (entry.text.trim() || entry.mood || Object.values(entry.influences).some(Boolean)) next[date] = entry;
    else delete next[date];
    try { write(next); $("journalStatus").textContent = "已保存到本机"; }
    catch { failed = true; $("journalStatus").textContent = "保存失败，请导出备份并重试"; }
  }
  function init() {
    for (const [element, name] of Object.entries(elements)) {
      const label = document.createElement("label");
      label.className = "wx-" + element;
      label.textContent = name;
      const select = document.createElement("select");
      select.id = "influence-" + element;
      select.setAttribute("aria-label", name + "的感受");
      ["未记录", "滋养", "平衡", "消耗"].forEach((name, i) => select.add(new Option(name, i ? name : "")));
      label.append(select);
      $("journalElements").append(label);
    }
    try {
      const raw = localStorage.getItem(key);
      entries = raw ? validate(JSON.parse(raw)) : {};
      ready = true;
      $("journalFields").disabled = false;
    } catch { $("journalStatus").textContent = "日记读取失败，原数据未覆盖"; }
    $("journalFields").addEventListener("input", save);
    $("journalDelete").addEventListener("click", () => {
      if (!ready || !confirm("删除这一天的日记？此操作无法撤销。")) return;
      try { const next = { ...entries }; delete next[date]; write(next); show(date); }
      catch { $("journalStatus").textContent = "删除失败，请重试"; }
    });
    $("journalExport").addEventListener("click", () => {
      const next = { ...entries };
      if (failed) {
        next[date] = { text: $("journalText").value, mood: $("journalMood").value, influences: {} };
        for (const e of Object.keys(elements)) next[date].influences[e] = $("influence-" + e).value;
      }
      const raw = ready ? JSON.stringify({ version: 1, entries: next }, null, 2) : localStorage.getItem(key);
      const url = URL.createObjectURL(new Blob([raw || ""], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "daoli-journal-" + dateKey(new Date()) + ".json"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
    $("journalImport").addEventListener("click", () => $("journalFile").click());
    $("journalFile").addEventListener("change", async event => {
      const file = event.target.files[0]; event.target.value = "";
      if (!file) return;
      try {
        if (file.size > 20 * 1024 * 1024) throw Error("备份不能超过 20 MB");
        const imported = validate(JSON.parse(await file.text()));
        if (!ready) throw Error("请先导出并修复原有数据，再导入");
        if (!confirm("合并备份？同一天的已有记录将被备份覆盖。")) return;
        write({ ...entries, ...imported }); show(date);
        $("journalStatus").textContent = "备份已导入";
      } catch (error) { $("journalStatus").textContent = "导入失败：" + error.message; }
    });
    window.addEventListener("beforeunload", event => { if (failed) { event.preventDefault(); event.returnValue = ""; } });
  }
  function show(day) {
    date = day;
    $("journalDate").textContent = date;
    if (!ready) return;
    const entry = entries[date] || { text: "", mood: "", influences: {} };
    $("journalText").value = entry.text;
    $("journalMood").value = entry.mood;
    for (const element of Object.keys(elements)) $("influence-" + element).value = entry.influences[element] || "";
    $("journalStatus").textContent = entries[date] ? "已保存到本机" : "尚无记录";
    $("journalDelete").disabled = !entries[date];
  }
  window.DaoliJournal = {
    init, dateKey, show,
    canLeave: () => !failed,
    has: day => Boolean(entries[day]),
    colorize(node, text) {
      node.replaceChildren();
      for (const char of text) {
        const span = document.createElement("span"); span.textContent = char;
        const element = Object.keys(groups).find(e => groups[e].includes(char));
        if (element) { span.className = "wx-" + element; span.title = char + " · " + elements[element]; }
        node.append(span);
      }
    }
  };
})();
