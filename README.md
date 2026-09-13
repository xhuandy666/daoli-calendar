<img src="build/icon.png" width="112" alt="道历应用图标">

# 道历 · 五行日记

离线日历与个人手记应用：查看农历、干支、道家节日与每日宜忌，按天记录心情、经历和五行感受。

本仓库基于 [qianye-wuyu/daoli-calendar](https://github.com/qianye-wuyu/daoli-calendar)，由 [xhuandy666](https://github.com/xhuandy666/daoli-calendar) 增加 macOS Electron 桌面端、干支五行配色、每日手记与独立应用图标，保留上游 Web 页面和 Android 工程。

## 功能

- 日历：公历、农历、生肖、道历纪年、节气、节日、宜忌与词条说明。
- 五行配色：年、月、日干支逐字着色，月历显示当日日干支。
- 八字十神：手动填写四柱或仅日主，自动标注年、月、日干支与月历中每日的十神，并可展开地支藏干对照。
- 每日手记：正文、心情与五行的「滋养／平衡／消耗」感受，输入即保存。
- 月历圆点标记有日记的日期，可按天读取、修改和删除。
- JSON 备份导出与合并导入；确认后覆盖同日记录，无效备份拒绝导入。
- macOS 系统编辑菜单、缩放和单实例运行，关闭窗口后可从 Dock 重新打开。
- 日历和手记在本机运行，无需账户或网络。

## macOS 使用

当前安装包适配 Apple Silicon（M 系列芯片）。双击 `道历.app` 即可运行，也可打开 DMG，将应用拖到桌面或「应用程序」文件夹。

仓库不提交安装包二进制文件，源码构建后产物如下：

| 产物 | 路径 |
| --- | --- |
| 应用 | `dist/mac-arm64/道历.app` |
| 安装镜像 | `dist/Daoli-1.2.0-arm64.dmg` |
| 压缩包 | `dist/Daoli-1.2.0-arm64.zip` |

本地构建未经过 Apple Developer 签名和公证，不提供自动更新。Intel 版本可以单独构建，但尚未实机验证。

## 源码运行与打包

需要 Node.js 与 npm，已在 macOS arm64、Node.js 24 环境验证。首次安装及打包需要下载依赖，应用运行无需联网。

```bash
git clone https://github.com/xhuandy666/daoli-calendar.git
cd daoli-calendar
npm ci
npm start

# Apple Silicon：APP、DMG 和 ZIP
npm run dist:mac

# Intel：单独构建，未实机验证
npx electron-builder --mac dmg zip --x64

# Electron 端到端测试，需要图形桌面环境
npm test
```

测试覆盖自动保存、重启恢复、日期隔离、备份导出与恢复、无效导入、保存失败保护和窄屏布局，使用临时用户目录，不会修改个人日记。

浏览器端可直接打开 `www/index.html`，或在 `www` 目录启动静态服务器。浏览器与桌面版的数据独立，可通过备份迁移。

## 五行配色

| 五行 | 天干 | 地支 | 颜色 |
| --- | --- | --- | --- |
| 木 | 甲、乙 | 寅、卯 | 绿色 |
| 火 | 丙、丁 | 巳、午 | 红色 |
| 土 | 戊、己 | 辰、戌、丑、未 | 赭黄 |
| 金 | 庚、辛 | 申、酉 | 银灰 |
| 水 | 壬、癸 | 子、亥 | 蓝色 |

配色使用干支本属五行。五行感受由本人填写，用于自我观察，不自动推断五行与经历的因果关系。

## 手动八字与十神

打开页面顶部「我的八字」，可以手动输入年、月、日、时四柱，也可以选择「仅日主」。四柱模式从输入的日柱提取日干，逐柱校验六十甲子组合，不校验四柱是否对应某个真实出生时间。不收集出生日期、地点，也不提供排盘。

十神以保存的日干为参照，复用内置 lunar 引擎的十神和地支藏干表。天干直接取十神；地支简表取藏干本气，并在「地支藏干十神」中列出其他藏干。例如癸日主遇寅，本气甲为伤官，其余丙为正财、戊为正官；癸遇乙则为食神。不会使用地支序号的阴阳直接代替藏干阴阳，也不涉及纳音、喜用神或吉凶预测。

年柱按立春日换年，月柱按交节日换月，日柱按所选公历日（零点换日）。这是按日期展示的口径，不细分当天交节的具体时刻，公历同一月份跨交节日可能显示不同月柱。生肖与农历纪年仍沿用农历日期显示。

八字资料单独保存在本机 Local Storage 的 `daoli.bazi.v1` 中，重启保留，清除资料不删除日记。日记备份暂不包含八字资料，更换设备需重新填写。资料未设置或读取失败时不显示个人十神。修改八字后历史日期的十神会按新日主重新计算，日记正文保持不变。

## 日记与备份

日记以 Local Storage 保存于 Electron 用户数据目录，通常位于 `~/Library/Application Support/daoli-calendar/`，不同启动方式下目录名称可能不同。移动应用到桌面不会把日记搬入应用包，替换应用时应保留原用户数据目录。

数据不上传服务器、不进入 Git，也没有额外加密。删除用户数据或清理浏览器站点存储会移除日记，建议定期「导出备份」。备份为可读 JSON，请妥善保管。

导入会合并日期，确认后覆盖同日记录，建议先备份现有数据。保存失败时，编辑区保留草稿并阻止切换日期，可先导出备份。导入上限为 20 MB，单日日记正文上限为 100,000 字符。

## Android

保留上游 Capacitor 8 工程。本 fork 的新功能尚未重新验证 Android APK，上游 APK 不包含本 fork 的日记改动。

修改 Web 资源后，先同步再构建：

```bash
npx cap sync android
cd android
./gradlew assembleDebug
```

需要与工程配置匹配的 JDK 和 Android SDK；产物为 `android/app/build/outputs/apk/debug/app-debug.apk`。

## 项目结构

```text
build/icon.png          macOS 图标源图，打包时转换为 ICNS
electron/main.cjs       Electron 主进程与原生菜单
www/index.html         页面结构
www/style.css          日历、五行和手记样式
www/app.js             日历交互
www/journal.js         日记存储、备份与五行配色
www/bazi.js            手动八字资料与十神对照
www/lunar.js           本地农历计算引擎
www/data.js            道家节日资料
tests/desktop.spec.cjs  Electron 端到端测试
tests/bazi.spec.cjs     十神映射、资料保存与交节边界测试
android/               上游 Android 工程
dist/                  本机构建产物，不提交到 Git
```

图标采用深青珐琅底、金色太极和日历页，由内置 imagegen 生成。完整提示词见 [图标设计说明](build/ICON.md)。

## 致谢与许可

- 原项目：[qianye-wuyu/daoli-calendar](https://github.com/qianye-wuyu/daoli-calendar)。
- 农历与道历引擎：[6tail/lunar-javascript](https://github.com/6tail/lunar-javascript)。
- 道家节日资料沿用上游整理，参考《天皇至道太清玉册·朝修吉辰章》等。
- 桌面打包使用 Electron 与 electron-builder，Android 工程使用 Capacitor。

[MIT License](LICENSE)，保留上游作者的版权声明。
