/**
 * FINANCIAL ENGINE - HR FINANZAS
 * Motor central unico. Toda la app consume este servicio.
 * 
 * MODELO FINANCIERO:
 * 1. Dinero en Mano = saldo anterior + ingresos del ciclo - ahorros enviados
 * 2. Compromisos = pagos obligatorios con vencimiento en este ciclo (no pagados aun)
 * 3. Gastos Realizados = gastos reales del ciclo
 * 4. Dinero Disponible = dinero en mano - compromisos pendientes - gastos realizados
 * 5. Proximo Ciclo = compromisos que vencen despues del cierre
 * 6. Ahorros = independientes, no afectan ciclos
 */

export const CycleFrequency = {
  MONTHLY: "monthly",
  BIWEEKLY: "biweekly",
  WEEKLY: "weekly",
  CUSTOM: "custom"
}

export class FinancialEngine {

  // ─── CICLO ────────────────────────────────────────────────────

  static getCurrentCycle(config, referenceDate = new Date()) {
    const ref = new Date(referenceDate)
    const year = ref.getFullYear()
    const month = ref.getMonth()
    const day = ref.getDate()
    const payDay = Number(config?.pay_day_1) || 27
    const frequency = config?.frequency || CycleFrequency.MONTHLY

    let startDate, endDate

    if (frequency === CycleFrequency.BIWEEKLY) {
      const payDay2 = Number(config?.pay_day_2) || 12
      const first = Math.min(payDay, payDay2)
      const second = Math.max(payDay, payDay2)
      if (day >= second) {
        startDate = new Date(year, month, second)
        endDate = new Date(year, month + 1, first - 1, 23, 59, 59)
      } else if (day >= first) {
        startDate = new Date(year, month, first)
        endDate = new Date(year, month, second - 1, 23, 59, 59)
      } else {
        startDate = new Date(year, month - 1, second)
        endDate = new Date(year, month, first - 1, 23, 59, 59)
      }
    } else {
      // MONTHLY (default)
      if (day >= payDay) {
        startDate = new Date(year, month, payDay)
        endDate = new Date(year, month + 1, payDay - 1, 23, 59, 59)
      } else {
        startDate = new Date(year, month - 1, payDay)
        endDate = new Date(year, month, payDay - 1, 23, 59, 59)
      }
    }

    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    const daysElapsed = Math.max(1, Math.floor((ref - startDate) / (1000 * 60 * 60 * 24)))
    const daysRemaining = Math.max(0, totalDays - daysElapsed)
    const progressPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100))

    const fmt = (d) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      totalDays,
      daysElapsed,
      daysRemaining,
      progressPct,
      formattedRange: `${fmt(startDate)} → ${fmt(endDate)}`
    }
  }

  // ─── COMPROMISOS ──────────────────────────────────────────────

  static getCommitmentsForCycle(fixedExpenses, cycle) {
    const startDay = new Date(cycle.startDate).getDate()
    const endDay = new Date(cycle.endDate).getDate()
    const crossesMonth = new Date(cycle.startDate).getMonth() !== new Date(cycle.endDate).getMonth()

    return fixedExpenses.filter(e => {
      const due = Number(e.due_day)
      if (!due) return true // sin dia = siempre aplica al ciclo actual
      if (crossesMonth) {
        return due >= startDay || due <= endDay
      } else {
        return due >= startDay && due <= endDay
      }
    })
  }

  static getUpcomingCommitments(fixedExpenses, cycle) {
    const startDay = new Date(cycle.startDate).getDate()
    const endDay = new Date(cycle.endDate).getDate()
    const crossesMonth = new Date(cycle.startDate).getMonth() !== new Date(cycle.endDate).getMonth()

    return fixedExpenses.filter(e => {
      const due = Number(e.due_day)
      if (!due) return false
      if (crossesMonth) {
        return due > endDay && due < startDay
      } else {
        return due < startDay || due > endDay
      }
    })
  }

  static isCommitmentPaid(commitment, cycleTxs) {
    const nameLower = commitment.name.toLowerCase().replace(/[^a-z0-9]/g, "")
    const amount = Number(commitment.amount)
    return cycleTxs.some(t => {
      if (t.type !== "expense") return false
      const descLower = (t.description || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      const txAmount = Number(t.amount)
      const nameMatch = nameLower.length >= 3 &&
        descLower.includes(nameLower.slice(0, Math.min(5, nameLower.length)))
      const amountMatch = Math.abs(txAmount - amount) / Math.max(amount, 1) < 0.15
      return nameMatch || amountMatch
    })
  }

  // ─── CALCULO PRINCIPAL ────────────────────────────────────────

  static calculate({
    transactions = [],
    fixedExpenses = [],
    savings = [],
    carryOver = 0,
    incomeConfig = 0,
    cycle
  }) {
    const start = cycle.startDate
    const end = cycle.endDate

    // Transacciones del ciclo
    const cycleTxs = transactions.filter(t => t.date >= start && t.date <= end)
    const cycleIncome = cycleTxs.filter(t => t.type === "income").reduce((s,t) => s + Number(t.amount), 0)
    const cycleSpent = cycleTxs.filter(t => t.type === "expense").reduce((s,t) => s + Number(t.amount), 0)

    // Ingresos: si hay registrados en el ciclo usarlos, sino usar configuracion
    const totalIncome = cycleIncome > 0 ? cycleIncome : Number(incomeConfig || 0)

    // Ahorros enviados en este ciclo
    const cycleSavingsOut = savings
      .filter(s => s.date >= start && s.date <= end && s.type === "deposit")
      .reduce((sum, s) => sum + Number(s.amount), 0)

    // Dinero en mano = saldo anterior + ingresos - ahorros enviados
    const moneyInHand = carryOver + totalIncome - cycleSavingsOut

    // Compromisos de este ciclo
    const cycleCommitments = this.getCommitmentsForCycle(fixedExpenses, cycle)
    const unpaidCommitments = cycleCommitments.filter(e => !this.isCommitmentPaid(e, cycleTxs))
    const paidCommitments = cycleCommitments.filter(e => this.isCommitmentPaid(e, cycleTxs))

    const totalUnpaid = unpaidCommitments.reduce((s,e) => s + Number(e.amount), 0)
    const totalPaid = paidCommitments.reduce((s,e) => s + Number(e.amount), 0)

    // Dinero disponible = dinero en mano - compromisos pendientes - gastos realizados
    const moneyAvailable = Math.max(0, moneyInHand - totalUnpaid - cycleSpent)

    // Gasto diario recomendado
    const dailyBudget = cycle.daysRemaining > 0
      ? Math.round(moneyAvailable / cycle.daysRemaining)
      : moneyAvailable

    // Proyeccion: si sigo gastando al ritmo actual, cuanto queda?
    const dailySpendRate = daysElapsed => cycleSpent / Math.max(daysElapsed, 1)
    const projectedSpend = dailySpendRate(cycle.daysElapsed) * cycle.totalDays
    const projectedCarryOver = Math.max(0, moneyInHand - totalUnpaid - projectedSpend)

    // Salud del ciclo
    let cycleHealth = "excellent"
    const spendRatio = (cycleSpent + totalUnpaid) / Math.max(moneyInHand, 1)
    if (spendRatio > 0.95) cycleHealth = "danger"
    else if (spendRatio > 0.75) cycleHealth = "warning"

    // Compromisos del proximo ciclo
    const upcomingCommitments = this.getUpcomingCommitments(fixedExpenses, cycle)

    // Ahorros totales
    const totalSavingsDeposits = savings.filter(s => s.type === "deposit").reduce((s,x) => s + Number(x.amount), 0)
    const totalSavingsWithdrawals = savings.filter(s => s.type === "withdrawal").reduce((s,x) => s + Number(x.amount), 0)
    const totalSavings = totalSavingsDeposits - totalSavingsWithdrawals

    return {
      // Core numbers
      carryOver,
      totalIncome,
      moneyInHand,
      cycleSpent,
      totalUnpaid,
      totalPaid,
      moneyAvailable,
      dailyBudget,
      cycleSavingsOut,

      // Commitments
      cycleCommitments,
      unpaidCommitments,
      paidCommitments,
      upcomingCommitments,

      // Projections
      projectedCarryOver: Math.round(projectedCarryOver),
      cycleHealth,

      // Savings
      totalSavings,
      totalSavingsDeposits,
      totalSavingsWithdrawals,

      // Raw
      cycleTxs,
    }
  }

  // ─── HEALTH LABEL ─────────────────────────────────────────────

  static getHealthLabel(health) {
    const map = {
      excellent: { emoji: "🟢", label: "Excelente", color: "#10b981", desc: "Vas por debajo del presupuesto" },
      warning:   { emoji: "🟡", label: "Atencion",  color: "#f59e0b", desc: "Poco margen disponible" },
      danger:    { emoji: "🔴", label: "Riesgo",    color: "#f43f5e", desc: "Podrias no llegar al proximo cobro" }
    }
    return map[health] || map.excellent
  }
}
