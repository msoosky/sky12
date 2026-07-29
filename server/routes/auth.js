import { Router } from 'express'
import store from '../lib/store.js'
import { hashPassword, verifyPassword, signToken, requireAuth } from '../lib/auth.js'

const router = Router()
const COOKIE_OPTIONS = { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }

router.post('/register', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: '이메일과 6자 이상의 비밀번호를 입력하세요.' })
  }

  const db = store.readDb()
  if (db.users.find((u) => u.email === email)) {
    return res.status(409).json({ error: '이미 가입된 이메일입니다.' })
  }

  const user = { id: Date.now().toString(36), email, passwordHash: hashPassword(password) }
  db.users.push(user)
  store.writeDb(db)

  const token = signToken({ id: user.id, email: user.email })
  res.cookie('token', token, COOKIE_OPTIONS)
  res.json({ id: user.id, email: user.email })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body || {}
  const db = store.readDb()
  const user = db.users.find((u) => u.email === email)

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
  }

  const token = signToken({ id: user.id, email: user.email })
  res.cookie('token', token, COOKIE_OPTIONS)
  res.json({ id: user.id, email: user.email })
})

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.id, email: req.user.email })
})

export default router
