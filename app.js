(function () {
  const STORAGE_API_KEY = "uber_api_url";
  const STORAGE_LOCAL_EXP = "uber_local_expenses";

  const baseData = window.UBER_DATA;
  let state = {
    shifts: [...baseData.shifts],
    expenses: [...baseData.expenses, ...loadLocalExpenses()],
  };

  const brl = (v) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const num = (v, d = 1) =>
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });

  function loadLocalExpenses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_LOCAL_EXP) || "[]");
    } catch {
      return [];
    }
  }

  function getApiUrl() {
    return localStorage.getItem(STORAGE_API_KEY) || baseData.apiUrl || "";
  }

  function todayBR() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  function renderAll() {
    document.getElementById("cycleLabel").textContent = baseData.cycle.label;
    document.getElementById("updatedAt").textContent = `Atualizado: ${baseData.updatedAt}`;
    document.getElementById("sheetLink").href = baseData.sheetUrl;

    const apiUrl = getApiUrl();
    const syncBadge = document.getElementById("syncBadge");
    if (apiUrl) {
      syncBadge.textContent = "Ao vivo • Google Planilha";
      syncBadge.style.borderColor = "rgba(16,185,129,0.5)";
      syncBadge.style.color = "#10b981";
    } else {
      syncBadge.textContent = "Modo Local";
      syncBadge.style.borderColor = "";
      syncBadge.style.color = "";
    }

    const cycleShifts = state.shifts.filter((s) => s.inCurrentCycle);
    const cycleGross = cycleShifts.reduce((acc, s) => acc + s.gross + s.tips, 0);
    const cycleHours = cycleShifts.reduce((acc, s) => acc + s.hours, 0);
    const cycleTrips = cycleShifts.reduce((acc, s) => acc + s.trips, 0);

    const cycleExpenses = state.expenses.filter((e) => e.inCurrentCycle !== false);
    const fuelCost = cycleExpenses
      .filter((e) => e.category === "Combustível")
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const otherCosts = cycleExpenses
      .filter((e) => e.category !== "Combustível")
      .reduce((acc, e) => acc + Number(e.amount || 0), 0);

    const totalCosts = baseData.cycle.rentalCost + fuelCost + otherCosts;
    const netBalance = cycleGross - totalCosts;
    const uniqueDays = new Set(cycleShifts.map((s) => s.date)).size;
    const avgDaily = uniqueDays ? cycleGross / uniqueDays : 0;

    // KPIs
    document.getElementById("kpiGross").textContent = brl(cycleGross);
    document.getElementById("kpiGrossFoot").textContent =
      `${uniqueDays} dias • ${cycleTrips} corridas • ${num(cycleHours)}h`;

    document.getElementById("kpiCosts").textContent = brl(totalCosts);
    document.getElementById("kpiCostsFoot").textContent =
      `Aluguel ${brl(baseData.cycle.rentalCost)} + Combustível ${brl(fuelCost)}` +
      (otherCosts > 0 ? ` + Outros ${brl(otherCosts)}` : "");

    const netEl = document.getElementById("kpiNet");
    netEl.textContent = brl(netBalance);
    netEl.className = `kpi-value mono ${netBalance >= 0 ? "text-emerald" : "text-rose"}`;
    document.getElementById("kpiNetFoot").textContent =
      netBalance >= 0
        ? "Lucro líquido já no bolso!"
        : `Faltam ${brl(Math.abs(netBalance))} para zerar custos`;

    document.getElementById("kpiDailyAvg").textContent = brl(avgDaily);
    document.getElementById("kpiDailyFoot").textContent =
      `Meta diária: ${brl(baseData.goals.dailyFloor)} – ${brl(baseData.goals.dailyTarget)}`;

    // Break-even thermometer
    const pct = totalCosts > 0 ? Math.min(100, Math.max(0, (cycleGross / totalCosts) * 100)) : 100;
    document.getElementById("thermoPct").textContent = `${num(pct)}% quitado`;
    document.getElementById("thermoFill").style.width = `${pct}%`;

    const statusBadge = document.getElementById("thermoBadge");
    if (netBalance >= 0) {
      statusBadge.className = "thermo-status ok";
      statusBadge.textContent = `Custos 100% pagos • Lucro livre: ${brl(netBalance)}`;
    } else {
      statusBadge.className = "thermo-status warn";
      statusBadge.textContent = `Faltam ${brl(Math.abs(netBalance))} para zerar a semana`;
    }
    document.getElementById("thermoStart").textContent = `R$ 0`;
    document.getElementById("thermoMid").textContent =
      `Aluguel: ${brl(baseData.cycle.rentalCost)}`;
    document.getElementById("thermoEnd").textContent =
      `Ponto de equilíbrio: ${brl(totalCosts)}`;

    renderChart();
    renderBlocks();
    updateSim(Number(document.getElementById("simSlider").value), totalCosts, cycleGross);
    renderCategories();
    renderTables(cycleExpenses);
  }

  function renderChart() {
    const dayMap = new Map();
    state.shifts.forEach((s) => {
      if (!dayMap.has(s.date)) {
        dayMap.set(s.date, {
          date: s.date,
          label: s.dayLabel,
          inCycle: s.inCurrentCycle,
          b1: 0,
          b2: 0,
        });
      }
      const d = dayMap.get(s.date);
      if (s.block.startsWith("Bloco 1")) d.b1 += s.gross + s.tips;
      else d.b2 += s.gross + s.tips;
    });

    const days = Array.from(dayMap.values());
    const maxVal = Math.max(550, ...days.map((d) => d.b1 + d.b2));
    const chartW = 560;
    const chartH = 250;
    const padL = 48;
    const padR = 16;
    const padT = 22;
    const padB = 38;
    const innerW = chartW - padL - padR;
    const innerH = chartH - padT - padB;
    const yPos = (v) => padT + innerH - (v / maxVal) * innerH;

    let svg = `<svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;max-width:${chartW}px;height:auto;display:block;">`;
    [300, 400, 450].forEach((ref) => {
      const y = yPos(ref);
      const col = ref === 450 ? "#10b981" : ref === 400 ? "#f59e0b" : "#64748b";
      svg += `<line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" stroke="${col}" stroke-dasharray="4 4" stroke-opacity="0.55" />`;
      svg += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="${col}" font-size="10" font-family="JetBrains Mono, monospace">${ref}</text>`;
    });

    const barStep = innerW / Math.max(1, days.length);
    const barW = Math.min(54, barStep * 0.56);

    days.forEach((d, idx) => {
      const cx = padL + barStep * idx + barStep / 2;
      const x = cx - barW / 2;
      const total = d.b1 + d.b2;

      const h1 = (d.b1 / maxVal) * innerH;
      const y1 = padT + innerH - h1;
      svg += `<rect x="${x}" y="${y1}" width="${barW}" height="${h1}" rx="4" fill="#3b82f6" opacity="${d.inCycle ? 0.95 : 0.45}" />`;

      if (d.b2 > 0) {
        const h2 = (d.b2 / maxVal) * innerH;
        const y2 = y1 - h2;
        svg += `<rect x="${x}" y="${y2}" width="${barW}" height="${h2}" rx="4" fill="#10b981" opacity="${d.inCycle ? 0.95 : 0.45}" />`;
      }

      const topY = yPos(total) - 6;
      svg += `<text x="${cx}" y="${topY}" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="700" font-family="JetBrains Mono, monospace">R$${Math.round(total)}</text>`;
      svg += `<text x="${cx}" y="${chartH - 14}" text-anchor="middle" fill="${d.inCycle ? "#e2e8f0" : "#64748b"}" font-size="11" font-weight="600">${d.label}</text>`;
    });
    svg += `</svg>`;
    document.getElementById("dailyChart").innerHTML = svg;
  }

  function renderBlocks() {
    const b1Shifts = state.shifts.filter((s) => s.block.startsWith("Bloco 1"));
    const b2Shifts = state.shifts.filter((s) => s.block.startsWith("Bloco 2"));
    const sumBlock = (arr) => {
      const h = arr.reduce((a, s) => a + s.hours, 0);
      const g = arr.reduce((a, s) => a + s.gross + s.tips, 0);
      return { count: arr.length, hours: h, gross: g, rate: h ? g / h : 0 };
    };
    const b1 = sumBlock(b1Shifts);
    const b2 = sumBlock(b2Shifts);
    const maxRate = Math.max(b1.rate, b2.rate, 1);

    document.getElementById("b1Rate").textContent = `${brl(b1.rate)}/h`;
    document.getElementById("b1Bar").style.width = `${(b1.rate / maxRate) * 100}%`;
    document.getElementById("b1Meta").textContent = `${b1.count} turnos • ${num(b1.hours)}h • ${brl(b1.gross)}`;

    document.getElementById("b2Rate").textContent = `${brl(b2.rate)}/h`;
    document.getElementById("b2Bar").style.width = `${(b2.rate / maxRate) * 100}%`;
    document.getElementById("b2Meta").textContent = `${b2.count} turnos • ${num(b2.hours)}h • ${brl(b2.gross)}`;

    const diffPct = b1.rate ? ((b2.rate - b1.rate) / b1.rate) * 100 : 0;
    document.getElementById("blockInsight").innerHTML =
      `<strong>Insight:</strong> O <strong>Bloco 2 (18h–22h)</strong> está pagando <strong>+${num(diffPct)}% por hora</strong> em relação ao dia. Vale priorizar as noites de sexta e sábado para acelerar o lucro líquido.`;
  }

  function updateSim(targetNet, totalCosts, cycleGross) {
    document.getElementById("simTargetDisplay").textContent = brl(targetNet);
    const neededGross = Math.max(0, totalCosts + targetNet - cycleGross);
    const perDay = neededGross / baseData.cycle.daysRemaining;
    const withFuelBuffer = perDay * 1.22;
    document.getElementById("simTotalNeed").textContent = brl(neededGross);
    document.getElementById("simPerDay").textContent = brl(perDay);
    document.getElementById("simWithFuel").textContent = brl(withFuelBuffer);
  }

  function renderCategories() {
    const totalCat = baseData.categories.reduce((a, c) => a + c.total, 0);
    document.getElementById("catList").innerHTML = baseData.categories
      .map((c) => {
        const share = totalCat ? (c.total / totalCat) * 100 : 0;
        return `
          <div class="cat-item">
            <div class="cat-top">
              <span><strong>${c.name}</strong> <span style="color:var(--muted)">(${c.trips} corridas • ticket ${brl(c.avgTicket)})</span></span>
              <span class="mono"><strong>${brl(c.total)}</strong> (${num(share, 0)}%)</span>
            </div>
            <div class="block-bar-bg">
              <div class="block-bar-fill" style="width:${share}%;background:${c.color};"></div>
            </div>
          </div>`;
      })
      .join("");
  }

  function renderTables(cycleExpenses) {
    document.getElementById("shiftsTableBody").innerHTML = [...state.shifts]
      .reverse()
      .map((s) => {
        const total = s.gross + s.tips;
        const rate = s.hours ? total / s.hours : 0;
        const meta = s.block.startsWith("Bloco 1") ? baseData.goals.block1 : baseData.goals.block2;
        const hit = total >= meta;
        return `
          <tr>
            <td class="mono">${s.date}</td>
            <td>${s.block}</td>
            <td class="mono">${s.start} – ${s.end}</td>
            <td class="mono">${num(s.hours)}h</td>
            <td class="mono">${s.trips}</td>
            <td class="mono"><strong>${brl(total)}</strong></td>
            <td class="mono">${brl(rate)}/h</td>
            <td><span class="badge ${hit ? "badge-green" : "badge-amber"}">${hit ? "Bateu meta" : "Abaixo"}</span></td>
            <td><span class="badge ${s.inCurrentCycle ? "badge-blue" : "badge-muted"}">${s.inCurrentCycle ? "Atual" : "Anterior"}</span></td>
          </tr>`;
      })
      .join("");

    document.getElementById("expensesTableBody").innerHTML = [...cycleExpenses]
      .reverse()
      .map(
        (e) => `
          <tr>
            <td class="mono">${e.date}</td>
            <td>${e.category}</td>
            <td>${e.fuelType || "-"}</td>
            <td class="mono text-amber"><strong>${brl(Number(e.amount))}</strong></td>
            <td style="color:var(--muted)">${e.note || "-"}</td>
          </tr>`
      )
      .join("");
  }

  function parseAnyDate(val) {
    if (!val) return null;
    if (typeof val === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [dd, mm, yyyy] = val.split("/").map(Number);
      return new Date(yyyy, mm - 1, dd);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatDateBR(d) {
    if (!d) return "--";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  function formatShortDay(d) {
    if (!d) return "--";
    const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${names[d.getDay()]} ${dd}/${mm}`;
  }

  function parseTimeHM(val) {
    if (!val) return "--:--";
    if (typeof val === "string" && /^\d{2}:\d{2}$/.test(val)) return val;
    const m = String(val).match(/(\d{2}):(\d{2}):\d{2}/);
    if (m) return `${m[1]}:${m[2]}`;
    return String(val);
  }

  function hoursBetween(startHM, endHM) {
    const [sh, sm] = startHM.split(":").map(Number);
    const [eh, em] = endHM.split(":").map(Number);
    if ([sh, sm, eh, em].some(isNaN)) return 0;
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  }

  function isInCurrentCycle(d) {
    if (!d) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffToTue = (today.getDay() - 2 + 7) % 7;
    const cycleStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToTue);
    const cycleEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth(), cycleStart.getDate() + 6);
    return d >= cycleStart && d <= cycleEnd;
  }

  async function syncFromSheet() {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;
    try {
      const res = await fetch(apiUrl);
      const json = await res.json();
      if (json.ok && Array.isArray(json.shifts)) {
        state.shifts = json.shifts.map((s) => {
          const d = parseAnyDate(s.date);
          const start = parseTimeHM(s.start);
          const end = parseTimeHM(s.end);
          const hrs = s.hours > 0 && s.hours < 24 ? Number(s.hours) : hoursBetween(start, end);
          return {
            ...s,
            date: formatDateBR(d),
            dayLabel: formatShortDay(d),
            inCurrentCycle: isInCurrentCycle(d),
            start,
            end,
            hours: hrs,
          };
        });
        state.expenses = (json.expenses || []).map((e) => {
          const d = parseAnyDate(e.date);
          return {
            ...e,
            date: formatDateBR(d),
            inCurrentCycle: isInCurrentCycle(d),
          };
        });
        baseData.updatedAt = `${todayBR()} (ao vivo)`;
        renderAll();
      }
    } catch (err) {
      console.warn("Falha ao sincronizar com Google Planilha:", err);
    }
  }

  // Events
  const simSlider = document.getElementById("simSlider");
  const simBtns = document.querySelectorAll(".sim-btn");
  simBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      simBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      simSlider.value = btn.dataset.val;
      renderAll();
    });
  });
  simSlider.addEventListener("input", () => {
    simBtns.forEach((b) => b.classList.remove("active"));
    renderAll();
  });

  // Tab switcher (Shift vs Expense)
  const tabShiftBtn = document.getElementById("tabShiftBtn");
  const tabExpenseBtn = document.getElementById("tabExpenseBtn");
  const quickShiftForm = document.getElementById("quickShiftForm");
  const quickExpenseForm = document.getElementById("quickExpenseForm");

  tabShiftBtn.addEventListener("click", () => {
    tabShiftBtn.classList.add("active");
    tabExpenseBtn.classList.remove("active");
    quickShiftForm.style.display = "grid";
    quickExpenseForm.style.display = "none";
    document.getElementById("formMsg").textContent = "";
  });

  tabExpenseBtn.addEventListener("click", () => {
    tabExpenseBtn.classList.add("active");
    tabShiftBtn.classList.remove("active");
    quickExpenseForm.style.display = "grid";
    quickShiftForm.style.display = "none";
    document.getElementById("formMsg").textContent = "";
  });

  // Auto-fill times when switching block
  document.getElementById("shiftBlock").addEventListener("change", (e) => {
    const isB1 = e.target.value.startsWith("Bloco 1");
    document.getElementById("shiftStart").value = isB1 ? "09:00" : "18:00";
    document.getElementById("shiftEnd").value = isB1 ? "17:00" : "22:00";
  });

  // Quick shift submit
  quickShiftForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const gross = Number(document.getElementById("shiftGross").value);
    const block = document.getElementById("shiftBlock").value;
    const start = document.getElementById("shiftStart").value || "09:00";
    const end = document.getElementById("shiftEnd").value || "17:00";
    const tripsRaw = document.getElementById("shiftTrips").value;
    const kmRaw = document.getElementById("shiftKm").value;
    const msgEl = document.getElementById("formMsg");
    const btn = document.getElementById("btnSaveShift");

    if (!gross || gross <= 0) return;

    const now = new Date();
    const payload = {
      type: "shift",
      date: todayBR(),
      dayLabel: formatShortDay(now),
      inCurrentCycle: true,
      block,
      start,
      end,
      hours: hoursBetween(start, end),
      trips: tripsRaw ? Number(tripsRaw) : 0,
      km: kmRaw ? Number(kmRaw) : null,
      gross,
      tips: 0,
    };

    const apiUrl = getApiUrl();
    btn.disabled = true;
    btn.textContent = "Salvando...";

    if (apiUrl) {
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.ok) {
          msgEl.className = "form-msg text-emerald";
          msgEl.textContent = `Ganhos salvos na Google Planilha (${brl(gross)})! Atualizando painel...`;
          document.getElementById("shiftGross").value = "";
          document.getElementById("shiftTrips").value = "";
          document.getElementById("shiftKm").value = "";
          await syncFromSheet();
        } else {
          throw new Error(json.error || "Erro ao salvar");
        }
      } catch (err) {
        msgEl.className = "form-msg text-rose";
        msgEl.textContent = `Erro ao enviar para a planilha: ${err.message}`;
      }
    } else {
      state.shifts.push(payload);
      renderAll();
      msgEl.className = "form-msg text-amber";
      msgEl.textContent = `Turno adicionado na visualização local (${brl(gross)}).`;
    }

    btn.disabled = false;
    btn.textContent = "Salvar Ganhos";
  });

  // Quick expense submit
  quickExpenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById("expAmount").value);
    const category = document.getElementById("expCategory").value;
    const fuelType = document.getElementById("expFuel").value;
    const liters = document.getElementById("expLiters").value;
    const note = document.getElementById("expNote").value.trim() || "Lançado pelo painel";
    const msgEl = document.getElementById("formMsg");
    const btn = document.getElementById("btnSaveExpense");

    if (!amount || amount <= 0) return;

    const payload = {
      date: todayBR(),
      inCurrentCycle: true,
      category,
      fuelType: category === "Combustível" ? fuelType : "-",
      liters: liters ? Number(liters) : null,
      amount,
      note,
    };

    const apiUrl = getApiUrl();
    btn.disabled = true;
    btn.textContent = "Salvando...";

    if (apiUrl) {
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.ok) {
          msgEl.className = "form-msg text-emerald";
          msgEl.textContent = `Salvo na Google Planilha (${brl(amount)})! Atualizando painel...`;
          document.getElementById("quickExpenseForm").reset();
          await syncFromSheet();
        } else {
          throw new Error(json.error || "Erro ao salvar");
        }
      } catch (err) {
        msgEl.className = "form-msg text-rose";
        msgEl.textContent = `Erro ao enviar para a planilha: ${err.message}`;
      }
    } else {
      const localList = loadLocalExpenses();
      localList.push(payload);
      localStorage.setItem(STORAGE_LOCAL_EXP, JSON.stringify(localList));
      state.expenses.push(payload);
      document.getElementById("quickExpenseForm").reset();
      renderAll();
      msgEl.className = "form-msg text-amber";
      msgEl.textContent = `Salvo localmente (${brl(amount)}). Conecte o Apps Script em "⚙ Conectar Planilha" para gravar direto na nuvem!`;
    }

    btn.disabled = false;
    btn.textContent = "Salvar Gasto";
  });

  // Modal API URL
  const modal = document.getElementById("apiModal");
  document.getElementById("btnConfigApi").addEventListener("click", () => {
    document.getElementById("apiUrlInput").value = getApiUrl();
    modal.classList.add("open");
  });
  document.getElementById("btnCloseModal").addEventListener("click", () => {
    modal.classList.remove("open");
  });
  document.getElementById("btnSaveApiUrl").addEventListener("click", async () => {
    const val = document.getElementById("apiUrlInput").value.trim();
    if (val) localStorage.setItem(STORAGE_API_KEY, val);
    else localStorage.removeItem(STORAGE_API_KEY);
    modal.classList.remove("open");
    renderAll();
    await syncFromSheet();
  });

  renderAll();
  syncFromSheet();
})();
