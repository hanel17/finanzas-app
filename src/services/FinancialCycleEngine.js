/**
 * FINANCIAL CYCLE ENGINE - HR FINANZAS
 * Motor desacoplado para la gestión de ciclos financieros personalizados.
 */

export const CycleFrequency = {
  MONTHLY: "monthly",
  BIWEEKLY: "biweekly",
  WEEKLY: "weekly",
  EVERY_14_DAYS: "every_14",
  EVERY_15_DAYS: "every_15",
  CUSTOM: "custom"
}

export class FinancialCycleEngine {

  static getCurrentCycle(config, referenceDate = new Date()) {
    const ref = new Date(referenceDate)
    const year = ref.getFullYear()
    const month = ref.getMonth()
    const day = ref.getDate()

    let startDate = new Date(ref)
    let endDate = new Date(ref)

    const payDay = Number(config?.pay_day_1) || 25
    const frequency = config?.frequency || CycleFrequency.MONTHLY

    if (frequency === CycleFrequency.MONTHLY) {
      if (day >= payDay) {
        startDate = new Date(year, month, payDay)
        endDate = new Date(year, month + 1, payDay - 1, 23, 59, 59)
      } else {
        startDate = new Date(year, month - 1, payDay)
        endDate = new Date(year, month, payDay - 1, 23, 59, 59)
      }
    } else if (frequency === CycleFrequency.BIWEEKLY) {
      const payDay2 = Number(config?.pay_day_2) || 15
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
    } else if (frequency === CycleFrequency.WEEKLY) {
      const dayOfWeek = ref.getDay()
      startDate.setDate(ref.getDate() - dayOfWeek)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59)
    } else {
      if (day >= payDay) {
        startDate = new Date(year, month, payDay)
        endDate = new Date(year, month + 1, payDay - 1, 23, 59, 59)
      } else {
        startDate = new Date(year, month - 1, payDay)
        endDate = new Date(year, month, payDay - 1, 23, 59, 59)
      }
    }

    const totalDurationMs = endDate.getTime() - startDate.getTime()
    const totalDays = Math.ceil(totalDurationMs / (1000 * 60 * 60 * 24))
    const elapsedMs = ref.getTime() - startDate.getTime()
    const daysElapsed = Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)))
    const daysRemaining = Math.max(0, totalDays - daysElapsed)
    const progressPercentage = Math.min(100, Math.round((daysElapsed / totalDays) * 100))

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      totalDays,
      daysElapsed,
      daysRemaining,
      progressPercentage,
      formattedRange: `${startDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} → ${endDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
    }
  }

  /**
   * Detecta si un gasto fijo ya fue pagado en este ciclo comparando con transacciones.
   * Busca transacciones con descripcion similar y monto similar dentro del ciclo.
   */
  static isFixedExpensePaid(fixedExpense, cycleTxs) {
    const nameLower = fixedExpense.name.toLowerCase().replace(/[^a-z0-9]/g, "")
    const amount = Number(fixedExpense.amount)

    return cycleTxs.some(t => {
      if (t.type !== "expense") return false
      const descLower = (t.description || "").toLowerCase().replace(/[^a-z0-9]/g, "")
      const txAmount = Number(t.amount)

      // Match por nombre similar (al menos 4 chars en comun) y monto dentro del 20%
      const nameMatch = nameLower.length >= 3 && (
        descLower.includes(nameLower.slice(0, Math.min(6, nameLower.length))) ||
        nameLower.includes(descLower.slice(0, Math.min(6, descLower.length)))
      )
      const amountMatch = Math.abs(txAmount - amount) / Math.max(amount, 1) < 0.20

      return nameMatch || (amountMatch && Math.abs(txAmount - amount) < 200)
    })
  }

  static calculateCycleMetrics({ transactions = [], fixedExpenses = [], incomeConfig = 0, currentCycle }) {
    const start = currentCycle.startDate
    const end = currentCycle.endDate

    const cycleTxs = transactions.filter(t => t.date >= start && t.date <= end)

    const cycleIncomeTx = cycleTxs.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const totalIncome = cycleIncomeTx > 0 ? cycleIncomeTx : Number(incomeConfig || 0)

    const cycleSpent = cycleTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount || 0), 0)

    // Determinar qué gastos fijos caen dentro del ciclo actual
    const cycleStart = new Date(start)
    const cycleEnd = new Date(end)
    const startDay = cycleStart.getDate()
    const endDay = cycleEnd.getDate()
    const crossesMonth = cycleStart.getMonth() !== cycleEnd.getMonth()

    const fixedInCycle = fixedExpenses.filter(e => {
      const due = Number(e.due_day)
      if (!due) return true // sin dia definido, siempre aplica
      if (crossesMonth) {
        // Ciclo cruza mes: ej 27 jul → 11 ago: due_day >= 27 OR due_day <= 11
        return due >= startDay || due <= endDay
      } else {
        // Ciclo dentro del mismo mes
        return due >= startDay && due <= endDay
      }
    })

    const fixedOutOfCycle = fixedExpenses.filter(e => {
      const due = Number(e.due_day)
      if (!due) return false
      if (crossesMonth) {
        return due > endDay && due < startDay
      } else {
        return due < startDay || due > endDay
      }
    })

    // De los que caen en este ciclo, ver cuales ya fueron pagados
    const unpaidFixed = fixedInCycle.filter(e => !this.isFixedExpensePaid(e, cycleTxs))
    const paidFixed = fixedInCycle.filter(e => this.isFixedExpensePaid(e, cycleTxs))

    const committedMoney = unpaidFixed.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const paidCommitted = paidFixed.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    const reallyAvailable = Math.max(0, totalIncome - committedMoney - cycleSpent)

    const dailyRecommended = currentCycle.daysRemaining > 0
      ? Math.round(reallyAvailable / currentCycle.daysRemaining)
      : reallyAvailable

    return {
      totalIncome,
      cycleSpent,
      committedMoney,
      paidCommitted,
      unpaidFixed,
      paidFixed,
      fixedOutOfCycle,
      fixedInCycle,
      reallyAvailable,
      dailyRecommended,
      cycleTxs
    }
  }
}
