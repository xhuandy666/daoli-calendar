# 道系日历 · DAOLI CALENDAR

一款**完全离线**的道教日历 App —— 打开即看今天是什么日子：农历、干支、道历纪年、道家节日、每日宜忌，每条节日与宜忌都有通俗详解。支持查看公元 1–9999 年任意一天。

> 道袍深蓝 + 鎏金太极 UI · 无广告 · 无联网 · 无权限请求

## ✨ 功能特性

- 🗓️ **月历视图**：标准 7 列网格，农历 + 节日徽章 + 今日高亮，支持任意年份跳转（公元 1–9999 年）
- ☯️ **今日视图**：公历 / 农历 / 干支 / 生肖 / 道历纪年 / 节气 / 节日 / 宜忌一屏尽览
- 🎊 **85+ 道家节日**：神仙圣诞（玉皇大帝、太上老君、真武大帝、吕祖、妈祖、财神…）、三元、五腊、三会，每条附「来历 + 意义 + 这一天做什么」
- ⚠️ **重要下降日**：北斗 / 南斗 / 真武 / 太乙救苦 / 三官 / 雷祖 / 吕祖 / 玉皇 / 斗姆 / 天曹 / 三清降现（据《天皇至道太清玉册·朝修吉辰章》），过滤掉每日刷屏的冷门下降日
- 📖 **宜忌详解**：点击任一宜 / 忌词条，弹窗显示通俗解释（内置 130+ 词条 + 通用兜底）
- 📱 **滑动切换**：手机端左右滑动切换「今日 ⇄ 月历」
- 🔒 **100% 本地**：农历引擎 + 节日数据全部内嵌，飞行模式可用

## 📸 截图

| 今日视图 | 月历视图 |
|---------|---------|
| 见 `docs/screenshots/` | 见 `docs/screenshots/` |

## 🚀 快速开始

### 直接使用

- **安卓**：下载 [Releases](https://github.com/qianye-wuyu/daoli-calendar/releases) 中的 APK 直接安装（Android 7.0+）
- **电脑**：用浏览器打开 `www/index.html` 即可（Mac / Windows / Linux 通用）

### 从源码构建 APK

1. 安装 **JDK 17+** 与 **Android SDK**（compileSdk 36 / minSdk 24）
2. 构建：

```bash
cd android
export JAVA_HOME=<你的 JDK 路径>
export ANDROID_HOME=<你的 Android SDK 路径>
./gradlew assembleDebug
```

3. 产物：`android/app/build/outputs/apk/debug/app-debug.apk`

## 📂 目录结构

```
daoli-calendar/
├── www/                          # Web 应用源码（核心）
│   ├── index.html                # 页面骨架
│   ├── style.css                 # 样式（道袍深蓝主题）
│   ├── app.js                    # 业务逻辑
│   ├── data.js                   # 道家节日字典（85+ 条目）
│   └── lunar.js                  # 农历/道历引擎（6tail lunar，勿改）
├── android/                      # Capacitor 安卓工程
│   ├── app/src/main/assets/      # 打包进 APK 的资源
│   ├── app/src/main/java/        # MainActivity
│   ├── build.gradle
│   ├── gradle/wrapper/           # Gradle Wrapper（8.14.3）
│   └── variables.gradle          # SDK 版本配置
├── docs/screenshots/             # 截图
├── README.md
└── LICENSE
```

## 🛠 技术栈

| 组件 | 说明 |
|------|------|
| [lunar-javascript](https://github.com/6tail/lunar-javascript) | 农历/道历计算引擎（支持公历 1–9999 年、道历纪年、干支、节气、宜忌） |
| [Capacitor](https://capacitorjs.com/) | Web → 原生安卓打包（v7） |
| 原生 Web 技术 | 纯 HTML/CSS/JS，无任何前端框架依赖 |

## 📚 数据来源与致谢

- 农历 / 道历 / 宜忌数据：[6tail/lunar-javascript](https://github.com/6tail/lunar-javascript)（MIT License）
- 道家节日体系：参考《天皇至道太清玉册·朝修吉辰章》、道教之音整理
- UI 审美：[Taste Enhancer](https://github.com/)（WorkBuddy 审美增强技能）

## 📄 许可证

[MIT](LICENSE) © qianye-wuyu

---

*福生无量天尊 ☯ 观天之道 · 执天之行 · 尽矣*
