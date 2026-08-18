/* ============================================================
 * 道系日历 · QA 逻辑回归测试
 * 运行：node test.js
 * 覆盖：
 *   (a) 农历转换正确性（权威锚点）
 *   (b) 节日字典命中（DAO_FESTIVALS）
 *   (c) 边界与闰月
 * ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const WWW = path.resolve(__dirname, "..", "www");
const lunarJs = require(path.join(WWW, "lunar.js"));
const Solar = lunarJs.Solar;

/* ---------- 加载 data.js 中的 DAO_FESTIVALS（浏览器全局 → Node） ---------- */
const dataCode = fs.readFileSync(path.join(WWW, "data.js"), "utf8");
const DAO_FESTIVALS = new Function(dataCode + "\n;return DAO_FESTIVALS;")();

/* ---------- 迷你测试框架 ---------- */
let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log("  \x1b[32mPASS\x1b[0m  " + name);
  } else {
    failed++;
    failures.push({ name: name, detail: detail });
    console.log("  \x1b[31mFAIL\x1b[0m  " + name + (detail ? "  —— " + detail : ""));
  }
}

function section(title) {
  console.log("\n== " + title + " ==");
}

/* ---------- 工具 ---------- */
function lunarOf(y, m, d) {
  return Solar.fromYmd(y, m, d).getLunar();
}

function namesOf(key) {
  return (DAO_FESTIVALS[key] || []).map(function (f) { return f.name; });
}

function anyNameContains(key, substr) {
  return namesOf(key).some(function (n) { return n.indexOf(substr) >= 0; });
}

/* ============================================================
 * (a) 农历转换正确性
 * ============================================================ */
section("(a) 农历转换正确性 —— 权威锚点");

{
  // 1900-01-31 = 1900 年春节（正月初一），1900 庚子年
  const l = lunarOf(1900, 1, 31);
  check("1900-01-31 → 农历正月初一", l.getMonth() === 1 && l.getDay() === 1,
    "库输出: " + l.toString());
  check("1900-01-31 年干支 = 庚子", l.getYearInGanZhi() === "庚子",
    "库输出: " + l.getYearInGanZhi() + "年");
}

{
  // 2000-02-05 = 2000 年春节（正月初一），2000 庚辰年
  const l = lunarOf(2000, 2, 5);
  check("2000-02-05 → 农历正月初一", l.getMonth() === 1 && l.getDay() === 1,
    "库输出: " + l.toString());
  check("2000-02-05 年干支 = 庚辰", l.getYearInGanZhi() === "庚辰",
    "库输出: " + l.getYearInGanZhi() + "年");
}

{
  // 2026-02-17 = 2026 年春节（正月初一），2026 丙午年
  const l = lunarOf(2026, 2, 17);
  check("2026-02-17 → 农历正月初一", l.getMonth() === 1 && l.getDay() === 1,
    "库输出: " + l.toString());
  check("2026-02-17 年干支 = 丙午", l.getYearInGanZhi() === "丙午",
    "库输出: " + l.getYearInGanZhi() + "年");
}

{
  // 2026-08-18（今天）= 农历七月初六，2026 丙午年
  const l = lunarOf(2026, 8, 18);
  check("2026-08-18 → 农历七月初六", l.getMonth() === 7 && l.getDay() === 6,
    "库输出: " + l.toString());
  check("2026-08-18 年干支 = 丙午", l.getYearInGanZhi() === "丙午",
    "库输出: " + l.getYearInGanZhi() + "年");
}

{
  // 2026-12-31 → 农历冬月（十一月）廿二前后（2026 无闰月干扰）
  const l = lunarOf(2026, 12, 31);
  const actual = "库输出: " + l.toString();
  check("2026-12-31 月份 = 冬月(11)", l.getMonth() === 11, actual);
  check("2026-12-31 日期 ≈ 廿二(±2)", l.getDay() >= 20 && l.getDay() <= 24,
    actual + "（day=" + l.getDay() + "）");
}

/* ============================================================
 * (b) 节日字典命中
 * ============================================================ */
section("(b) 节日字典命中 —— DAO_FESTIVALS");

check("1-9 含「玉皇上帝圣诞」", anyNameContains("1-9", "玉皇上帝圣诞"),
  "实际: " + namesOf("1-9").join("、"));
check("1-15 含「上元」", anyNameContains("1-15", "上元"),
  "实际: " + namesOf("1-15").join("、"));
check("1-15 含「元宵节」", anyNameContains("1-15", "元宵节"),
  "实际: " + namesOf("1-15").join("、"));
check("7-15 含「中元」", anyNameContains("7-15", "中元"),
  "实际: " + namesOf("7-15").join("、"));
check("10-15 含「下元」", anyNameContains("10-15", "下元"),
  "实际: " + namesOf("10-15").join("、"));
check("12-23 含「祭灶」", anyNameContains("12-23", "祭灶"),
  "实际: " + namesOf("12-23").join("、"));
check("5-5 含「端午节」", anyNameContains("5-5", "端午节"),
  "实际: " + namesOf("5-5").join("、"));
check("5-5 含「地腊」", anyNameContains("5-5", "地腊"),
  "实际: " + namesOf("5-5").join("、"));
check("1-1 含「春节」", anyNameContains("1-1", "春节"),
  "实际: " + namesOf("1-1").join("、"));
check("1-1 含「天腊」", anyNameContains("1-1", "天腊"),
  "实际: " + namesOf("1-1").join("、"));

/* ============================================================
 * (c) 边界与闰月
 * ============================================================ */
section("(c) 边界与闰月");

{
  let ok1 = true, ok2 = true, e1 = "", e2 = "";
  try { Solar.fromYmd(1, 1, 1); } catch (e) { ok1 = false; e1 = e.message; }
  try { Solar.fromYmd(9999, 12, 31); } catch (e) { ok2 = false; e2 = e.message; }
  check("公元 1-1-1 不抛异常", ok1, e1);
  check("9999-12-31 不抛异常", ok2, e2);
}

{
  // 2025 有闰六月：逐日扫描找到 闰六月十五
  let found = null;
  let cursor = Solar.fromYmd(2025, 1, 1);
  let guard = 0;
  while (guard++ < 400) {
    const l = cursor.getLunar();
    if (l.getMonth() === -6 && l.getDay() === 15) { found = cursor; break; }
    cursor = cursor.next(1);
  }
  check("2025 闰六月十五 存在", found !== null, "未在 2025 年找到闰六月十五");
  if (found) {
    const ll = found.getLunar();
    const key = Math.abs(ll.getMonth()) + "-" + ll.getDay();
    check("闰六月十五 getMonth() = -6", ll.getMonth() === -6, "实际: " + ll.getMonth());
    check("闰六月十五 key = 6-15", key === "6-15",
      "实际: " + key + "（公历 " + found.getYear() + "-" + found.getMonth() + "-" + found.getDay() + "）");
  }
}

{
  // 2026 全年逐日冒烟
  let err = null, count = 0;
  try {
    let c = Solar.fromYmd(2026, 1, 1);
    for (let i = 0; i < 365; i++) {
      const s = Solar.fromYmd(c.getYear(), c.getMonth(), c.getDay());
      s.getLunar();
      c = c.next(1);
      count++;
    }
  } catch (e) { err = e; }
  check("2026 全年 365 天逐日遍历不抛异常", err === null && count === 365,
    err ? err.message : "遍历天数=" + count);
}

/* ---------- 汇总 ---------- */
console.log("\n========================================");
console.log("总计: " + (passed + failed) + " | PASS: " + passed + " | FAIL: " + failed);
if (failed > 0) {
  console.log("\n失败明细:");
  failures.forEach(function (f) {
    console.log("  - " + f.name + (f.detail ? " —— " + f.detail : ""));
  });
}
console.log("========================================");
process.exit(failed > 0 ? 1 : 0);
