import { Router } from 'express'
import { searchCompanies, getReports, getFinancials } from '../lib/dart.js'
import { getPrice, getChartRange, EARLIEST_CHART_YEAR } from '../lib/naver.js'

const router = Router()

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || ''
    if (!q.trim()) return res.json([])
    res.json(await searchCompanies(q))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/company/:corpCode/reports', async (req, res) => {
  try {
    res.json(await getReports(req.params.corpCode))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/company/:corpCode/financials', async (req, res) => {
  try {
    res.json(await getFinancials(req.params.corpCode))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/stock/:stockCode/price', async (req, res) => {
  try {
    res.json(await getPrice(req.params.stockCode))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/stock/:stockCode/chart', async (req, res) => {
  try {
    const startYear = Number(req.query.startYear) || EARLIEST_CHART_YEAR
    const endYear = Number(req.query.endYear) || new Date().getFullYear()
    res.json(await getChartRange(req.params.stockCode, startYear, endYear))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
