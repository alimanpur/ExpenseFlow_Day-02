/**
 * ExpenseFlow - Dashboard Service
 * Aggregates summary data for the main dashboard using FinancialEngine.
 * Every metric is derived from backend aggregation pipelines.
 */
const financialEngine = require('./financial.engine');

class DashboardService {
  async getDashboard(userId) {
    return financialEngine.getDashboard(userId);
  }
}

module.exports = new DashboardService();
