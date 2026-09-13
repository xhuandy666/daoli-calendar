/* ============================================================
 * 道系日历 · 业务逻辑
 * 零网络依赖：全部数据来自 lunar.js 引擎 + 本地 data.js 字典
 * ============================================================ */
(function () {
  "use strict";

  /* ---------- 基础工具 ---------- */

  /**
   * 构造日期。注意：JS 原生 new Date(y,...) 会把 0–99 年映射为 1900+y，
   * 这里用 setFullYear 保证公元 1–9999 年全部正确。
   */
  function makeDate(y, m, d) {
    var dt = new Date(0);
    dt.setFullYear(y, m - 1, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  }

  /** 归一化日期：去掉时分秒，返回当日零点（年份安全） */
  function normDate(d) {
    return makeDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  /** 由 y/m/d 构造 Solar */
  function solarOf(y, m, d) {
    return Solar.fromYmd(y, m, d);
  }

  /** 某月天数（格里高利历，1–9999 通用） */
  function daysInMonth(y, m) {
    if (m === 2) {
      return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
    }
    return [4, 6, 9, 11].indexOf(m) >= 0 ? 30 : 31;
  }

  /** 农历键：月-日（闰月取正） */
  function lunarKey(lunar) {
    return Math.abs(lunar.getMonth()) + "-" + lunar.getDay();
  }

  /** 归一化节日名：去标点/“节”字/后缀，便于比较核心词 */
  function normName(s) {
    return s
      .replace(/[·、｜|]/g, "")
      .replace(/节/g, "")
      .replace(/(圣诞|成道|下降|出巡|诞辰|日)$/, "");
  }

  /** 同神异名表：名称不同但实为同一神明（用于去重） */
  var NAME_VARIANTS = [
    ["玄天上帝", "真武大帝"]
  ];

  /** 两节日名是否近似（含相同核心词，用于去重） */
  function namesOverlap(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var na = normName(a);
    var nb = normName(b);
    if (na.length < 2 || nb.length < 2) return false;
    if (na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0) return true;
    // 共享任意 2 字连续核心词（如“老祖天师”与“祖天师张道陵”共享“天师”）
    for (var i = 0; i + 2 <= na.length; i++) {
      if (nb.indexOf(na.substr(i, 2)) >= 0) return true;
    }
    // 同神异名（如“玄天上帝”即“真武大帝”）
    for (var k = 0; k < NAME_VARIANTS.length; k++) {
      var va = NAME_VARIANTS[k][0];
      var vb = NAME_VARIANTS[k][1];
      if ((na.indexOf(va) >= 0 && nb.indexOf(vb) >= 0) ||
          (na.indexOf(vb) >= 0 && nb.indexOf(va) >= 0)) {
        return true;
      }
    }
    return false;
  }

  /** 节日排序：重要在前，其次按类型优先级 */
  var TYPE_ORDER = ["三元", "腊日", "圣诞", "成道", "传统节日", "祭祀", "斋日"];
  function sortFestivals(list) {
    return list.slice().sort(function (x, y) {
      var dx = (x.imp ? 0 : 1) - (y.imp ? 0 : 1);
      if (dx !== 0) return dx;
      var tx = TYPE_ORDER.indexOf(x.type);
      var ty = TYPE_ORDER.indexOf(y.type);
      return (tx < 0 ? 99 : tx) - (ty < 0 ? 99 : ty);
    });
  }

  /** lunar.js 传统节日/道历节日的默认说明 */
  function defaultDesc(name) {    var d = {
      "春节": "正月初一，一年之始。道门设坛祈福，民间拜年贺岁，辞旧迎新。",
      "元宵节": "正月十五，张灯结彩、赏灯猜谜、吃元宵，象征团圆圆满。",
      "端午节": "五月初五，赛龙舟、吃粽子、挂艾草，驱邪避瘟，纪念屈原。",
      "七夕节": "七月初七，牛郎织女相会，民间乞巧，祈求姻缘美满、心灵手巧。",
      "中秋节": "八月十五，月圆人圆，赏月、吃月饼、祭月，寄托团圆思念。",
      "重阳节": "九月初九，登高赏菊、敬老爱老，寓意长久长寿、步步高升。",
      "腊八节": "十二月初八，熬腊八粥、祭祖敬神，庆贺丰收、祈福迎祥。",
      "除夕": "岁末最后一天，守岁、贴春联、吃年夜饭，辞旧迎新。"
    };
    return d[name] || "农历传统节日，道俗共庆，宜斋戒祈福、祭祀祖先。";
  }

  /** 宜/忌词条通俗解释（点击 chip 弹窗显示） */
  var YIJI_DESC = {
    "祭祀": "祭拜神明、供奉祖先。宜诚心恭敬，以表追思。",
    "祈福": "祈祷祝福。宜诚心许愿，心态平和、勿贪。",
    "斋醮": "设坛斋戒、诵经礼忏。宜清心寡欲，戒荤辛。",
    "入殓": "将逝者遗体入棺。宜庄重肃穆。",
    "破土": "动土开工（破土动工）。宜择吉日良辰。",
    "启钻": "挖掘墓穴（开金井），为安葬准备。",
    "安葬": "举行葬礼安葬逝者。宜庄重肃穆。",
    "嫁娶": "结婚办喜事。宜择良辰、百年好合。",
    "入宅": "搬入新居。宜择吉日、清洁新宅。",
    "搬家": "搬迁新居。宜择吉日。",
    "搬新房": "搬入新居。宜红火兴旺。",
    "作灶": "修建或修整厨房灶台。宜家宅平安。",
    "纳采订盟": "订婚/交换信物。宜真心实意。",
    "修坟": "修整坟墓。宜尽孝道、慎终追远。",
    "立碑": "树立墓碑/纪念碑。宜庄重。",
    "开市": "开业/开始营业。宜大吉。",
    "开业": "开业/开张。宜大吉。",
    "开张": "开业/开张。",
    "动土": "动土施工/建造/装修。宜稳固根基。",
    "破屋坏垣": "拆除房屋或围墙。宜去旧迎新。",
    "解除": "解除困境/禁忌。宜释怀。",
    "余事勿取": "宜静养守正，不宜冒进。",
    "造庙": "修建道观/祠堂。宜虔诚。",
    "安香": "安顿香火/安奉神位。",
    "出火": "搬出灶火/神位。宜择时。",
    "纳财": "纳取财富/收账。",
    "开光": "神像/法器开光点眼。宜庄严。",
    "酬神": "答谢神明庇佑。",
    "塑绘": "雕塑绘画神像。",
    "冠笄": "成人礼。",
    "裁衣": "制作新衣。",
    "经络": "中医经络/针灸治疗。",
    "针灸": "针灸治疗。",
    "治病": "寻医问药。",
    "求医治病": "求医问药。",
    "求嗣": "祈求子嗣。",
    "赴任": "赴任就职。",
    "上官": "上任/晋升官职。",
    "出行": "外出/出行。",
    "会亲友": "拜访亲友/聚会。",
    "沐浴": "沐浴洁身。",
    "理发": "剪发剃头。",
    "教牛马": "训练牛马。",
    "伐木": "砍伐木材。",
    "开池": "开挖池塘。",
    "畋猎": "打猎捕兽。",
    "取渔": "捕鱼打渔。",
    "雕刻": "雕刻/篆刻。",
    "竖柱上梁": "立柱上梁（建房关键节点）。",
    "上梁": "上房梁。",
    "盖屋合脊": "盖屋顶合脊。",
    "穿井": "开凿水井。",
    "补垣": "修补墙垣。",
    "造船": "制造船只。",
    "出师": "出兵/学成出师。",
    "筑堤防": "筑堤防水。",
    "放水": "放水开闸。",
    "酝酿": "酿酒酝酿。",
    "开仓": "开仓出粮。",
    "挂匾": "悬挂牌匾。",
    "造桥": "建造桥梁。",
    "铺路": "铺设道路。",
    "纳畜": "收养牲畜。",
    "安床": "安放床铺。",
    "沐浴剃头": "沐浴洁身并剪发。",
    "整手足甲": "修剪手足指甲。",
    "扫舍": "打扫屋舍。",
    "平治道涂": "平整道路。",
    "修造": "建筑修缮。",
    "兴造": "建筑营造。",
    "拆卸": "拆除建筑/器具。",
    "纳采": "议定婚事。",
    "问名": "合婚问名。",
    "嫁娶纳婿": "结婚/招女婿。",
    "归宁": "回娘家。",
    "安葬破土": "安葬并破土。",
    "斋醮解除": "斋醮并解除禁忌。",
    "诸事不宜": "诸事不宜，宜静守。",
    "诸事勿取": "诸事不宜，主动静守。",
    "馀事勿取": "宜静养守正，不宜冒进。",
    "习艺": "学习技艺（书法、绘画、武术、匠艺等），宜专心。",
    "交易": "买卖交易/签合同，宜明辨。",
    "作梁": "制作房梁，宜稳固耐久。",
    "修门": "修整/安装门户，宜家宅安宁。",
    "修饰垣墙": "修整围墙/院墙。",
    "入学": "开学/入学堂/拜师，宜勤奋。",
    "出货财": "出货/出账/出财。",
    "分居": "分家/分居另过。",
    "割蜜": "割取蜂蜜，宜有节制。",
    "合寿木": "为逝者备棺木。",
    "合帐": "制作/安设床帐。",
    "合脊": "合屋顶大梁（建房关键节点）。",
    "坏垣": "拆除围墙/旧垣。",
    "塞穴": "堵塞洞穴/蚁穴。",
    "安机械": "安装/购置机器机械。",
    "安碓磑": "安装碓磑（舂米器具）。",
    "定磉": "奠定柱础石。",
    "开厕": "修建/清理厕所。",
    "开柱眼": "为木柱凿榫眼。",
    "开渠": "开凿水渠。",
    "开生坟": "为在世长辈修建生基。",
    "归岫": "归隐山林。",
    "成服": "为逝者穿戴寿衣。",
    "掘井": "开挖水井。",
    "断蚁": "剿灭蚁害。",
    "普渡": "道教普渡（超度亡魂），宜斋戒。",
    "架马": "安装/使用织布机或马车。",
    "栽种": "栽种/种植作物，宜应时令。",
    "求医": "求医问药。",
    "牧养": "放牧/饲养六畜。",
    "畋猎": "打猎捕兽。",
    "盖屋": "盖建房屋。",
    "破屋": "拆除旧屋。",
    "移徙": "搬迁/迁移住所。",
    "移柩": "迁移灵柩。",
    "立券": "订立契约/字据。",
    "竖柱": "竖立柱子。",
    "纳婿": "招女婿入门。",
    "结网": "编织渔网/绳网。",
    "置产": "购置产业。",
    "谢土": "谢土神/安土地。",
    "起基": "动土起基（开工建房）。",
    "进人口": "家中新进人口（嫁娶/收养等）。",
    "造仓": "修建粮仓。",
    "造畜稠": "建造畜栏/圈舍。",
    "造车器": "制造车辆/器具。",
    "除服": "除去丧服（守丧期满）。",
    "雇佣": "雇佣/招聘用人。",
    "乘船": "乘坐船只。",
    "行丧": "操办丧事。",
    "词讼": "诉讼/打官司。",
    "探病": "探望病人。",
    "嫁娶纳婿": "结婚/招婿（合称）。",
    "安葬破土": "安葬并破土（合称）。"
  };

  /**
   * 重要下降日白名单（据《天皇至道太清玉册·朝修吉辰章》及道教斋日体系）：
   * 北斗/南斗（朝斗核心）、真武、太乙救苦天尊、三官、雷祖（雷声普化天尊）、
   * 吕祖（纯阳）、玉皇、斗姆、天曹（考校功过）、三清级降现（老君/元始/灵宝）。
   * 其余"××下降/降现"以及冷门"××飞升/升仙"一律过滤，避免刷屏淹没大日子。
   */
  var KEEP_DROP_DAYS = ["北斗", "南斗", "真武", "太乙救苦", "三官", "雷声普化", "雷祖", "吕纯阳", "纯阳", "玉皇", "斗姆", "天曹", "太上老君", "元始", "灵宝"];

  /** 道历节日保留判定：只保留值得展示的下降日，过滤高频重复的下降/飞升日 */
  function isTaoFestivalWorth(name) {
    if (/下降|降现|降世|巡查/.test(name)) {
      return KEEP_DROP_DAYS.some(function (k) { return name.indexOf(k) >= 0; });
    }
    if (/飞升|升仙|拔宅|上升/.test(name)) {
      return false;
    }
    return true;
  }

  /* ---------- 状态 ---------- */

  var state = {
    today: normDate(new Date()),
    selected: normDate(new Date()),
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth() + 1 // 1-12
  };

  function ymd(d) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function ymdOf(y, m, d) {
    return y + "-" + m + "-" + d;
  }

  /* ---------- 节日收集 ---------- */

  /** 汇总某一天的全部节日：字典 + lunar 传统节日 + lunar 道历节日 */
  function collectFestivals(lunar) {
    var out = [];
    var key = lunarKey(lunar);

    // 1) 本地道家节日字典（主数据源）
    var dict = DAO_FESTIVALS[key] || [];
    dict.forEach(function (f) {
      out.push({ name: f.name, type: f.type, desc: f.desc, imp: f.imp || 0 });
    });

    // 2) lunar.js 农历传统节日（春节/端午/除夕等），按名去重
    lunar.getFestivals().forEach(function (name) {
      var dup = out.some(function (f) { return namesOverlap(f.name, name); });
      if (!dup) {
        out.push({ name: name, type: "传统节日", desc: defaultDesc(name), imp: 0 });
      }
    });

    // 3) lunar.js 道历节日（天腊/三元等），按名去重；过滤高频重复的下降/飞升日
    lunar.getTao().getFestivals().forEach(function (tf) {
      var name = tf.getName();
      if (!isTaoFestivalWorth(name)) return;
      var dup = out.some(function (f) { return namesOverlap(f.name, name); });
      if (!dup) {
        out.push({
          name: name,
          type: "祭祀",
          desc: tf.getRemark() || defaultDesc(name),
          imp: 0
        });
      }
    });

    return sortFestivals(out);
  }

  /* ---------- 渲染：今日视图 ---------- */

  function renderToday() {
    var d = state.selected;
    var solar = solarOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var lunar = solar.getLunar();
    var tao = lunar.getTao();

    setText("tSolar", solar.getYear() + "年" + solar.getMonth() + "月" + solar.getDay() + "日");
    setText("tWeek", "星期" + solar.getWeekInChinese());
    setText("tLunar", "农历 " + lunar.toString());
    setText("tShengxiao", "生肖 · " + lunar.getYearShengXiao());
    setText("tTao", "道历" + tao.toString().split("年")[0] + "年");
    DaoliJournal.colorize(el("tGzY"), lunar.getYearInGanZhi() + "年");
    DaoliJournal.colorize(el("tGzM"), lunar.getMonthInGanZhi() + "月");
    DaoliJournal.colorize(el("tGzD"), lunar.getDayInGanZhi() + "日");
    DaoliJournal.show(DaoliJournal.dateKey(d));

    // 节气
    var jieqi = lunar.getJieQi();
    var jqLine = el("tJieqi");
    if (jieqi) {
      jqLine.hidden = false;
      jqLine.innerHTML = "今日节气 · <b>" + jieqi + "</b>";
    } else {
      jqLine.hidden = true;
    }

    // 节日列表
    var fests = collectFestivals(lunar);
    var festBox = el("tFestivals");
    if (fests.length === 0) {
      festBox.innerHTML = '<div class="fest-empty">今日无特殊节日</div>';
    } else {
      festBox.innerHTML = "";
      fests.forEach(function (f) {
        var item = document.createElement("div");
        item.className = "fest-item";
        var badgeClass = "badge" + (f.imp ? " imp" : "") + " t-" + f.type;
        item.innerHTML =
          '<span class="badge ' + badgeClass + '">' + f.type + "</span>" +
          '<span class="name">' + f.name + "</span>" +
          '<span class="arrow">›</span>';
        item.addEventListener("click", function () {
          openFestivalModal(f, lunar);
        });
        festBox.appendChild(item);
      });
    }

    // 宜忌
    fillList("tYi", "yi", lunar.getDayYi() || []);
    fillList("tJi", "ji", lunar.getDayJi() || []);

    // 日期选择器同步
    var picker = el("datePicker");
    var iso = DaoliJournal.dateKey(d);
    if (picker.value !== iso) picker.value = iso;
  }

  function fillList(id, type, arr) {
    var ul = el(id);
    ul.innerHTML = "";
    (arr || []).forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      li.dataset.term = item;
      li.dataset.type = type;
      li.addEventListener("click", function () {
        openYiJiModal(type, item);
      });
      ul.appendChild(li);
    });
    if (!arr || arr.length === 0) {
      var li = document.createElement("li");
      li.textContent = "无";
      li.style.opacity = "0.6";
      ul.appendChild(li);
    }
  }

  /* ---------- 渲染：月历 ---------- */

  function renderCalendar() {
    var y = state.calYear;
    var m = state.calMonth;
    var todayYmd = ymd(state.today);
    var selYmd = ymd(state.selected);

    setText("calYearBtn", y + "年");
    setText("calMonthLabel", m + "月");

    // 上月/下月信息（用于补齐首尾空格）
    var prevY = m === 1 ? y - 1 : y;
    var prevM = m === 1 ? 12 : m - 1;
    var nextY = m === 12 ? y + 1 : y;
    var nextM = m === 12 ? 1 : m + 1;

    var firstWeek = solarOf(y, m, 1).getWeek(); // 0=周日
    var dim = daysInMonth(y, m);
    var dimPrev = daysInMonth(prevY, prevM);
    var totalCells = Math.ceil((firstWeek + dim) / 7) * 7;

    var grid = el("calGrid");
    grid.innerHTML = "";

    for (var i = 0; i < totalCells; i++) {
      var cellY, cellM, cellD, muted = false;
      if (i < firstWeek) {
        muted = true;
        cellY = prevY; cellM = prevM; cellD = dimPrev - firstWeek + 1 + i;
      } else if (i >= firstWeek + dim) {
        muted = true;
        cellY = nextY; cellM = nextM; cellD = i - firstWeek - dim + 1;
      } else {
        cellY = y; cellM = m; cellD = i - firstWeek + 1;
      }

      if (cellY < 1 || cellY > 9999) {
        grid.appendChild(document.createElement("div"));
        continue;
      }
      var cell = document.createElement("button");
      cell.type = "button";
      cell.setAttribute("aria-label", cellY + "年" + cellM + "月" + cellD + "日");
      cell.className = "day-cell" + (muted ? " is-muted" : "");
      cell.dataset.y = cellY;
      cell.dataset.m = cellM;
      cell.dataset.d = cellD;

      var solar = solarOf(cellY, cellM, cellD);
      var lunar = solar.getLunar();
      var key = lunarKey(lunar);
      var fests = DAO_FESTIVALS[key] || [];
      var hasFest = fests.length > 0;

      if (hasFest) cell.classList.add("has-fest");

      var marks = "";
      if (hasFest) {
        var impCount = fests.filter(function (f) { return f.imp; }).length;
        marks = '<span class="mark ' + (impCount > 0 ? "imp" : "norm") + '">' +
          (impCount > 0 ? "◆" : "✦") + "</span>";
      }

      cell.innerHTML =
        marks +
        '<div class="sd">' + cellD + "</div>" +
        '<div class="ld">' + lunar.getDayInChinese() + "</div>";
      var gz = document.createElement("div");
      gz.className = "cal-ganzhi";
      DaoliJournal.colorize(gz, lunar.getDayInGanZhi());
      cell.appendChild(gz);
      if (DaoliJournal.has(DaoliJournal.dateKey(makeDate(cellY, cellM, cellD)))) {
        cell.classList.add("has-journal");
      }

      // 月历徽章：显示最重要的一个节日名，其余以 +N 提示
      if (!muted && hasFest) {
        let top = sortFestivals(fests)[0];
        let festivalLunar = lunar;
        var more = fests.length - 1;
        var b = document.createElement("div");
        b.className = "cal-badge t-" + top.type + (top.imp ? " imp" : "");
        b.textContent = top.name + (more > 0 ? " +" + more : "");
        b.addEventListener("click", function (ev) {
          ev.stopPropagation();
          openFestivalModal(top, festivalLunar);
        });
        cell.appendChild(b);
      }

      var curYmd = ymdOf(cellY, cellM, cellD);
      if (curYmd === todayYmd) cell.classList.add("is-today");
      if (curYmd === selYmd) cell.classList.add("is-selected");

      cell.addEventListener("click", function () {
        selectDate(parseInt(this.dataset.y, 10), parseInt(this.dataset.m, 10), parseInt(this.dataset.d, 10));
      });

      grid.appendChild(cell);
    }

  }

  /* ---------- 状态变更 ---------- */

  function selectDate(y, m, d) {
    if (!DaoliJournal.canLeave()) return;
    state.selected = makeDate(y, m, d);
    // 若点的是相邻月（灰格），月历也跟随跳转
    if (y !== state.calYear || m !== state.calMonth) {
      state.calYear = y;
      state.calMonth = m;
    }
    renderToday();
    renderCalendar();
    if (window.innerWidth < 900) switchTab("today");
  }

  function shiftDay(delta) {
    if (!DaoliJournal.canLeave()) return;
    var d = new Date(state.selected.getTime());
    d.setDate(d.getDate() + delta); // setDate 自动处理跨月/跨年，且年份安全
    if (d.getFullYear() < 1 || d.getFullYear() > 9999) return; // 超出引擎范围
    state.selected = d;
    // 若跳出当前月历月份，月历跟随
    if (d.getFullYear() !== state.calYear || (d.getMonth() + 1) !== state.calMonth) {
      state.calYear = d.getFullYear();
      state.calMonth = d.getMonth() + 1;
    }
    renderToday();
    renderCalendar();
  }

  function shiftMonth(delta) {
    var m = state.calMonth + delta;
    var y = state.calYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    y = Math.min(9999, Math.max(1, y));
    state.calYear = y;
    state.calMonth = m;
    renderCalendar();
  }

  /* ---------- 弹窗 ---------- */

  function openFestivalModal(f, lunar) {
    setText("mTitle", f.name);
    var dateStr = "农历" + lunar.getMonthInChinese() + "月" + lunar.getDayInChinese() +
      " · " + lunar.getSolar().getYear() + "年" + lunar.getSolar().getMonth() + "月" + lunar.getSolar().getDay() + "日";
    setText("mDate", dateStr + " · " + f.type);
    setText("mDesc", f.desc || "（暂无简介）");
    el("festModal").classList.add("show");
  }

  /** 宜/忌词条弹窗（复用 festModal）。无字典兜底通用说明，避免"暂无详解" */
  function openYiJiModal(type, term) {
    setText("mTitle", term);
    setText("mDate", (type === "yi" ? "宜：适合做" : "忌：不宜做") + " 的事");
    if (YIJI_DESC[term]) {
      setText("mDesc", YIJI_DESC[term]);
    } else {
      var verb = type === "yi" ? "此日宜行" : "此日忌行";
      setText("mDesc", verb + "「" + term + "」相关之事。" + (type === "yi" ? "宜：顺应时令、择善而从。" : "忌：避其锋芒、待时而动。") + "具体含义可参《玉匣记》《协纪辨方书》等传统黄历典籍。");
    }
    el("festModal").classList.add("show");
  }

  function closeFestivalModal() {
    el("festModal").classList.remove("show");
  }

  function openYearModal() {
    el("yearInput").value = state.calYear;
    el("yearModal").classList.add("show");
    setTimeout(function () { el("yearInput").focus(); }, 120);
  }

  function closeYearModal() {
    el("yearModal").classList.remove("show");
  }

  function jumpToYear() {
    var raw = parseInt(el("yearInput").value, 10);
    if (isNaN(raw)) { closeYearModal(); return; }
    var y = Math.min(9999, Math.max(1, raw));
    state.calYear = y;
    renderCalendar();
    closeYearModal();
  }

  /* ---------- Tab（手机端） ---------- */

  function switchTab(name) {
    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === name);
    });
    var paneCal = el("pane-calendar");
    var paneToday = el("pane-today");
    paneCal.classList.toggle("active", name === "calendar");
    paneToday.classList.toggle("active", name === "today");
    if (name === "calendar") renderCalendar();
  }

  /* ---------- 小工具 ---------- */

  function el(id) { return document.getElementById(id); }

  function setText(id, text) {
    el(id).textContent = text;
  }

  /* ---------- 事件绑定 ---------- */

  function bindEvents() {
    el("calPrev").addEventListener("click", function () { shiftMonth(-1); });
    el("calNext").addEventListener("click", function () { shiftMonth(1); });
    el("calToday").addEventListener("click", function () {
      state.calYear = state.today.getFullYear();
      state.calMonth = state.today.getMonth() + 1;
      renderCalendar();
    });
    el("calYearBtn").addEventListener("click", openYearModal);

    el("prevDay").addEventListener("click", function () { shiftDay(-1); });
    el("nextDay").addEventListener("click", function () { shiftDay(1); });
    el("goToday").addEventListener("click", function () {
      if (!DaoliJournal.canLeave()) return;
      state.selected = normDate(new Date());
      state.calYear = state.selected.getFullYear();
      state.calMonth = state.selected.getMonth() + 1;
      renderToday();
      renderCalendar();
    });
    el("datePicker").addEventListener("change", function (ev) {
      if (!DaoliJournal.canLeave()) { ev.target.value = DaoliJournal.dateKey(state.selected); return; }
      var v = ev.target.value;
      if (!v) return;
      var parts = v.split("-");
      var d = makeDate(Math.min(9999, Math.max(1, parseInt(parts[0], 10))), parseInt(parts[1], 10), parseInt(parts[2], 10));
      state.selected = d;
      state.calYear = d.getFullYear();
      state.calMonth = d.getMonth() + 1;
      renderToday();
      renderCalendar();
    });

    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.dataset.tab); });
    });

    el("mClose").addEventListener("click", closeFestivalModal);
    el("festModal").addEventListener("click", function (ev) {
      if (ev.target === this) closeFestivalModal();
    });

    el("yClose").addEventListener("click", closeYearModal);
    el("yearModal").addEventListener("click", function (ev) {
      if (ev.target === this) closeYearModal();
    });
    el("yearGo").addEventListener("click", jumpToYear);
    el("yearInput").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") jumpToYear();
    });

    // Android WebView 返回键关闭弹窗（若宿主支持 history 后退）
    window.addEventListener("popstate", function () {
      if (el("festModal").classList.contains("show")) closeFestivalModal();
      if (el("yearModal").classList.contains("show")) closeYearModal();
    });
  }

  /* ---------- 手机端滑动切换（今日 ⇄ 月历） ---------- */

  var _swipeX = 0, _swipeY = 0;

  function bindSwipe() {
    var main = document.querySelector(".main");
    if (!main) return;
    main.addEventListener("touchstart", function (e) {
      _swipeX = e.touches[0].clientX;
      _swipeY = e.touches[0].clientY;
    }, { passive: true });
    main.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - _swipeX;
      var dy = e.changedTouches[0].clientY - _swipeY;
      // 水平位移需超过 50px 且明显大于垂直位移（排除上下滚动）
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      var cur = document.querySelector(".tabs button.active");
      if (!cur) return;
      var tab = cur.dataset.tab;
      if (dx < 0 && tab === "today") switchTab("calendar");
      else if (dx > 0 && tab === "calendar") switchTab("today");
    }, { passive: true });
  }

  /* ---------- 启动 ---------- */

  function init() {
    DaoliJournal.init();
    document.addEventListener("journal-updated", function () {
      renderCalendar();
      el("journalDelete").disabled = !DaoliJournal.has(DaoliJournal.dateKey(state.selected));
    });
    bindEvents();
    if (window.innerWidth < 900) bindSwipe(); // 手机端启用左右滑动切换
    renderToday();
    renderCalendar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
