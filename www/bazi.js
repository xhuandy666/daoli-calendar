(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./lunar.js").LunarUtil);
  else root.DaoliBazi = factory(root.LunarUtil);
})(typeof window === "undefined" ? globalThis : window, function (lunarUtil) {
  "use strict";
  const key = "daoli.bazi.v1";
  const stems = "甲乙丙丁戊己庚辛壬癸";
  const names = { year: "年柱", month: "月柱", day: "日柱", time: "时柱" };
  let profile = null;
  const $ = id => document.getElementById(id);

  function validate(value) {
    if (!value || value.version !== 1 || !["pillars", "master"].includes(value.mode)) throw Error("八字资料格式不正确");
    if (value.mode === "master") {
      if (typeof value.dayMaster !== "string" || value.dayMaster.length !== 1 || !stems.includes(value.dayMaster)) throw Error("请选择日主天干");
      return { version: 1, mode: "master", dayMaster: value.dayMaster };
    }
    const pillars = {};
    for (const field of Object.keys(names)) {
      const raw = value.pillars && value.pillars[field];
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!lunarUtil.JIA_ZI.includes(text)) throw Error(names[field] + "须为有效干支，如甲子");
      pillars[field] = text;
    }
    return { version: 1, mode: "pillars", pillars, dayMaster: pillars.day[0] };
  }

  function relation(dayMaster, char) {
    if (typeof dayMaster !== "string" || dayMaster.length !== 1 || !stems.includes(dayMaster)) return null;
    if (typeof char !== "string" || char.length !== 1) return null;
    const hidden = lunarUtil.ZHI_HIDE_GAN[char];
    const gan = hidden ? hidden[0] : char;
    if (!stems.includes(gan)) return null;
    return {
      char, stem: gan, god: lunarUtil.SHI_SHEN[dayMaster + gan],
      hidden: hidden ? hidden.map(stem => ({ stem, god: lunarUtil.SHI_SHEN[dayMaster + stem] })) : []
    };
  }

  function setForm() {
    const mode = document.querySelector('input[name="baziMode"]:checked').value;
    $("baziPillars").hidden = mode !== "pillars";
    $("baziMasterField").hidden = mode !== "master";
    $("baziPillars").disabled = mode !== "pillars";
    $("baziMaster").disabled = mode !== "master";
  }

  function updateSummary() {
    const day = profile && profile.dayMaster;
    $("baziSummary").textContent = day ? "我的八字 · " + day + lunarUtil.WU_XING_GAN[day] + "日主" : "我的八字 · 未设置";
    $("baziClear").disabled = !profile;
    $("baziReference").hidden = !profile;
    $("baziReference").textContent = day ? "十神参照：" + day + lunarUtil.WU_XING_GAN[day] + "日主 · 地支取本气" : "";
    document.documentElement.classList.toggle("has-bazi", Boolean(profile));
  }

  function init() {
    for (const stem of stems) $("baziMaster").add(new Option(stem + " · " + lunarUtil.WU_XING_GAN[stem], stem));
    try {
      const raw = localStorage.getItem(key);
      if (raw) profile = validate(JSON.parse(raw));
    } catch { $("baziStatus").textContent = "资料读取失败，可重新填写；原数据尚未覆盖"; }
    if (profile) {
      document.querySelector('input[name="baziMode"][value="' + profile.mode + '"]').checked = true;
      $("baziMaster").value = profile.dayMaster;
      if (profile.pillars) for (const field of Object.keys(names)) $("bazi-" + field).value = profile.pillars[field];
    }
    setForm(); updateSummary();
    document.querySelectorAll('input[name="baziMode"]').forEach(input => input.addEventListener("change", setForm));
    $("baziForm").addEventListener("submit", event => {
      event.preventDefault();
      try {
        const next = validate({ version: 1, mode: document.querySelector('input[name="baziMode"]:checked').value,
          dayMaster: $("baziMaster").value,
          pillars: Object.fromEntries(Object.keys(names).map(field => [field, $("bazi-" + field).value])) });
        localStorage.setItem(key, JSON.stringify(next));
        profile = next; updateSummary();
        $("baziStatus").textContent = "已保存到本机";
        document.dispatchEvent(new Event("bazi-updated"));
      } catch (error) { $("baziStatus").textContent = "未保存：" + error.message; }
    });
    $("baziClear").addEventListener("click", () => {
      if (!confirm("清除八字资料？日记会保留。")) return;
      try {
        localStorage.removeItem(key);
        profile = null;
        $("baziForm").reset(); setForm(); updateSummary();
        $("baziStatus").textContent = "已清除八字资料";
        document.dispatchEvent(new Event("bazi-updated"));
      } catch { $("baziStatus").textContent = "清除失败，请重试"; }
    });
  }

  function annotate(container, ganzhi, compact) {
    if (!profile) return;
    const box = document.createElement("div");
    box.className = compact ? "cal-shishen" : "gz-shishen";
    for (const [i, char] of Array.from(ganzhi).entries()) {
      const result = relation(profile.dayMaster, char);
      if (!result) continue;
      const text = document.createElement("span");
      const label = i ? "支" : "干";
      text.textContent = (compact ? "" : label + " · ") + result.god;
      text.title = char + (i ? "（本气" + result.stem + "）" : "") + " · " + result.god;
      text.setAttribute("aria-label", text.title);
      box.append(text);
    }
    container.append(box);
  }

  function renderToday(lunar) {
    const ganzhis = [lunar.getYearInGanZhiByLiChun(), lunar.getMonthInGanZhi(), lunar.getDayInGanZhi()];
    ["tGzY", "tGzM", "tGzD"].forEach((id, i) => {
      const cell = $(id).parentElement;
      const previous = cell.querySelector(".gz-shishen");
      if (previous) previous.remove();
      annotate(cell, ganzhis[i], false);
    });
    $("baziHidden").hidden = !profile;
    $("baziHiddenList").replaceChildren();
    if (!profile) return;
    ganzhis.forEach((ganzhi, i) => {
      const row = document.createElement("div");
      const result = relation(profile.dayMaster, ganzhi[1]);
      const label = document.createElement("b");
      label.textContent = ["年支", "月支", "日支"][i] + " " + ganzhi[1];
      row.append(label);
      result.hidden.forEach((item, index) => {
        const part = document.createElement("span");
        part.textContent = item.stem + " · " + item.god + (index === 0 ? "（本气）" : "");
        row.append(part);
      });
      $("baziHiddenList").append(row);
    });
  }

  return { init, validate, relation, annotate, renderToday };
});
