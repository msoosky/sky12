import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import apiRouter from './routes/api.js'
import authRouter from './routes/auth.js'
import watchlistRouter from './routes/watchlist.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

const app = express()
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRouter)
app.use('/api/watchlist', watchlistRouter)
app.use('/api', apiRouter)

// 프론트엔드는 index.html 한 파일에 전부 들어 있음 (빌드 단계 없음)
app.use(express.static(rootDir, { index: false }))
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'))
})

if (!process.env.DART_API_KEY) {
  console.warn('[안내] DART_API_KEY가 없어 사업보고서/재무 데이터는 샘플로 대체됩니다. .env에 키를 추가하면 자동으로 실제 데이터로 전환됩니다.')
}

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`API 서버 실행 중: http://localhost:${PORT}`)
})
