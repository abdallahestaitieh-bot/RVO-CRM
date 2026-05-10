const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  const db = getDb();

  // MRR = sum of active (non-churned) clients' monthly contract value
  const mrrData = db.prepare(`
    SELECT 
      SUM(contract_value / 12.0) as mrr,
      COUNT(*) as active_clients
    FROM clients 
    WHERE is_churned = 0
  `).get();

  // Pipeline value by stage
  const pipelineByStage = db.prepare(`
    SELECT stage, SUM(deal_value) as total_value, COUNT(*) as deal_count
    FROM deals
    GROUP BY stage
  `).all();

  // All stages for complete picture
  const stages = [
    'Lead Generation', 'Inquiry', 'Qualification', 'Strategy Call',
    'Proposal', 'Close', 'Onboarding', 'Retention', 'Upsell & Referral'
  ];
  
  const stageMap = {};
  for (const s of pipelineByStage) stageMap[s.stage] = s;
  
  const pipelineStages = stages.map((stage, i) => {
    const current = stageMap[stage] || { total_value: 0, deal_count: 0 };
    const next = i < stages.length - 1 ? stageMap[stages[i + 1]] : null;
    const conversionRate = current.deal_count > 0 && next
      ? Math.round((next.deal_count / current.deal_count) * 100)
      : null;
    return {
      stage,
      total_value: current.total_value || 0,
      deal_count: current.deal_count || 0,
      conversion_rate: conversionRate
    };
  });

  // Churn this month vs last month
  const churnThisMonth = db.prepare(`
    SELECT COUNT(*) as count FROM clients
    WHERE is_churned = 1
    AND strftime('%Y-%m', churn_date) = strftime('%Y-%m', 'now')
  `).get();

  const churnLastMonth = db.prepare(`
    SELECT COUNT(*) as count FROM clients
    WHERE is_churned = 1
    AND strftime('%Y-%m', churn_date) = strftime('%Y-%m', datetime('now', '-1 month'))
  `).get();

  // Top 5 deals by value
  const topDeals = db.prepare(`
    SELECT id, company_name, contact_name, deal_value, stage,
      ROUND((julianday('now') - julianday(last_activity_date))) as days_in_stage
    FROM deals
    ORDER BY deal_value DESC
    LIMIT 5
  `).all();

  // Total pipeline value
  const totalPipeline = db.prepare(`SELECT SUM(deal_value) as total FROM deals`).get();

  // MRR trend (last 6 months simulated from client start dates)
  const mrrTrend = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, SUM(contract_value / 12.0) as mrr
    FROM clients
    WHERE is_churned = 0
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all().reverse();

  res.json({
    mrr: Math.round(mrrData.mrr || 0),
    active_clients: mrrData.active_clients || 0,
    total_pipeline: Math.round(totalPipeline.total || 0),
    pipeline_stages: pipelineStages,
    churn_this_month: churnThisMonth.count,
    churn_last_month: churnLastMonth.count,
    top_deals: topDeals,
    mrr_trend: mrrTrend
  });
});

module.exports = router;
