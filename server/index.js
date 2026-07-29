import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import apiRouter from './routes/api.js'
import { refreshCorpCodes } from './lib/dart.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

const app = express()
app.use(cors())
app.use(compression())
app.use(express.json())
app.use('/api', apiRouter)

// 프론트엔드는 index.html 한 파일에 전부 들어 있음 (빌드 단계 없음). 로그인 계정 없이
// 관심기업은 브라우저 localStorage에 저장하므로 서버는 DART·네이버 프록시 역할만 한다.
app.use(express.static(rootDir, { index: false }))
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'))
})

if (!process.env.DART_API_KEY) {
  console.warn('[안내] DART_API_KEY가 없어 사업보고서/재무 데이터는 샘플로 대체됩니다. .env에 키를 추가하면 자동으로 실제 데이터로 전환됩니다.')
} else {
  // 최초 검색 요청이 상장기업 전체 목록 다운로드를 기다리지 않도록 기동 시 미리 데워두고,
  // 이후 하루에 한 번씩 강제로 다시 받아와 상장/폐지 등 변경 사항을 매일 반영한다.
  refreshCorpCodes().catch((e) => console.warn('[안내] 기업 목록 초기 로딩 실패:', e.message))
  setInterval(() => {
    refreshCorpCodes().catch((e) => console.warn('[안내] 기업 목록 일일 갱신 실패:', e.message))
  }, ONE_DAY_MS)
}

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`API 서버 실행 중: http://localhost:${PORT}`)
})
