import { Router } from 'express'
import store from '../lib/store.js'
import { requireAuth } from '../lib/auth.js'

const router = Router()
router.use(requireAuth)

router.get('/', (req, res) => {
  const db = store.readDb()
  res.json(db.watchlist.filter((w) => w.userId === req.user.id))
})

router.post('/', (req, res) => {
  const { corpCode, corpName, stockCode } = req.body || {}
  if (!corpCode || !stockCode) {
    return res.status(400).json({ error: '기업 정보가 올바르지 않습니다.' })
  }

  const db = store.readDb()
  if (db.watchlist.find((w) => w.userId === req.user.id && w.corpCode === corpCode)) {
    return res.status(409).json({ error: '이미 관심종목에 추가되어 있습니다.' })
  }

  const item = { id: Date.now().toString(36), userId: req.user.id, corpCode, corpName, stockCode }
  db.watchlist.push(item)
  store.writeDb(db)
  res.json(item)
})

router.delete('/:id', (req, res) => {
  const db = store.readDb()
  db.watchlist = db.watchlist.filter((w) => !(w.id === req.params.id && w.userId === req.user.id))
  store.writeDb(db)
  res.json({ ok: true })
})

export default router
