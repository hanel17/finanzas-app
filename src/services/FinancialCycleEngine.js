/**
 * FINANCIAL CYCLE ENGINE - HR FINANZAS
 * Motor desacoplado para la gestión de ciclos financieros personalizados.
 */

export const CycleFrequency = {
  MONTHLY: 'monthly',          // del X al Y (ej: 25 al 24)
  BIWEEKLY: 'biweekly',        // Quincenal (ej: 15 y 30)
  WEEKLY: 'weekly',            // Semanal
  EVERY_14_DAYS: 'every_14',   // Cada 14 días
  EVERY_15_DAYS: 'every_15',   // Cada 15 días
  CUSTOM: 'custom'
}

export class FinancialCycleEngine {
  
  /**
   * Obtiene o genera las fechas inicio/fin del ciclo actual basado en la configuración.
   */
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
      const dayOfWeek = ref.getDay() // 0 = Domingo
      startDate.setDate(ref.getDate() - dayOfWeek)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59)
    } else {
      // Fallback a mensual 25 al 24
      if (day >= payDay) {
        startDate = new Date(year, month, payDay)
        endDate = new Date(year, month + 1, payDay - 1, 23, 59, 59)
      } else {
        startDate = new Date(year, month - 1, payDay)
        endDate = new Date(year, month, payDay - 1, 23, 59, 59)
      }
    }

    // Métricas de tiempo del ciclo
    const totalDurationMs = endDate.getTime() - startDate.getTime()
    const totalDays = Math.ceil(totalDurationMs / (1000 * 60 * 60 * 24))
    
    const elapsedMs = ref.getTime() - startDate.getTime()
    const daysElapsed = Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)))
    const daysRemaining = Math.max(0, totalDays - daysElapsed)
    
    const progressPercentage = Math.min(100, Math.round((daysElapsed / totalDays) * 100))

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays,
      daysElapsed,
      daysRemaining,
      progressPercentage,
      formattedRange: `${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} → ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
    }
  }

  /**
   * Calcula el dinero libre y el limite diario recomendado considerando Dinero Comprometido
   */
  static calculateCycleMetrics({ transactions = [], fixedExpenses = [], incomeConfig = 0, currentCycle }) {
    const start = currentCycle.startDate
    const end = currentCycle.endDate

    // Transacciones filtradas estrictamente dentro del ciclo actual
    const cycleTxs = transactions.filter(t => t.date >= start && t.date <= end)

    const cycleIncomeTx = cycleTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0)
    const totalIncome = cycleIncomeTx > 0 ? cycleIncomeTx : Number(incomeConfig || 0)

    const cycleSpent = cycleTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0)

    // Gastos Fijos Comprometidos
    const committedMoney = fixedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)

    // Dinero Realmente Disponible para Gastar
    const reallyAvailable = Math.max(0, totalIncome - committedMoney - cycleSpent)

    // Dinero Diario Recomendado
    const dailyRecommended = currentCycle.daysRemaining > 0 
      ? Math.round(reallyAvailable / currentCycle.daysRemaining) 
      : reallyAvailable

    return {
      totalIncome,
      cycleSpent,
      committedMoney,
      reallyAvailable,
      dailyRecommended,
      cycleTxs
    }
  }
}
