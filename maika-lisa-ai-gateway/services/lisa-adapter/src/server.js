import 'dotenv/config'
import express from 'express'
import pino from 'pino'
import pinoHttp from 'pino-http'
import { PickleFundClient } from './picklefund-client/client.js'

const AGENT_NAME = process.env.AGENT_NAME || 'lisa'
const PORT = Number(process.env.PORT || 4102)
const LITELLM_BASE_URL = (process.env.LITELLM_BASE_URL || 'http://localhost:4000').replace(/\/$/, '')
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY || ''
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''
const TELEGRAM_TOKEN = process.env.LISA_TELEGRAM_BOT_TOKEN || ''

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-webhook-secret'],
})
const picklefund = new PickleFundClient({ logger })
const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(pinoHttp({ logger }))

function classifyTask(text) {
  const normalized = text.toLowerCase()
  if (/(quy|quỹ|thanh vien|thành viên|giao dich|giao dịch|bao cao|báo cáo|dong quy|đóng quỹ|chi|thu)/i.test(normalized)) {
    return 'picklefund_business'
  }
  if (/(debug|code|loi|lỗi|bug|deploy)/i.test(normalized)) return 'code_debug'
  if (/(offline|noi bo|nội bộ|local)/i.test(normalized)) return 'offline_internal'
  return 'vietnamese_chat'
}

function modelForTask(taskType) {
  if (taskType === 'picklefund_business' || taskType === 'report') return 'report-primary'
  if (taskType === 'code_debug') return 'code-primary'
  if (taskType === 'offline_internal') return 'offline-local'
  return 'vietnamese-chat'
}

async function callLiteLLM({ taskType, messages }) {
  if (!LITELLM_MASTER_KEY) throw new Error('LITELLM_MASTER_KEY is required')
  const startedAt = Date.now()
  const response = await fetch(`${LITELLM_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: modelForTask(taskType), messages, temperature: 0.2 }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message || `LiteLLM returned ${response.status}`)
  logger.info({
    timestamp: new Date().toISOString(),
    agent_name: AGENT_NAME,
    task_type: taskType,
    model_used: data.model || modelForTask(taskType),
    provider_used: 'litellm',
    fallback_used: data.model && data.model !== modelForTask(taskType),
    latency_ms: Date.now() - startedAt,
    status: 'ok',
  })
  return data.choices?.[0]?.message?.content || ''
}

async function loadPickleFundData(text) {
  const normalized = text.toLowerCase()
  if (/(thanh vien|thành viên|chua dong|chưa đóng)/i.test(normalized)) return picklefund.getMembers()
  if (/(quy|quỹ|ky|kỳ|fund)/i.test(normalized)) return picklefund.getFunds()
  if (/(giao dich|giao dịch|thu|chi|transaction)/i.test(normalized)) return picklefund.getTransactions()
  if (/(bao cao|báo cáo|tong hop|tổng hợp)/i.test(normalized)) return picklefund.getReports()
  return picklefund.getDashboard()
}

async function answer(text, userId = 'unknown') {
  const taskType = classifyTask(text)
  if (taskType === 'picklefund_business') {
    try {
      const intent = await callLiteLLM({
        taskType,
        messages: [
          { role: 'system', content: 'Ban la Lisa, agent ho tro tu dong hoa nhe cho PickleFund. Phan tich y dinh, khong goi Make trong Phase 1.' },
          { role: 'user', content: text },
        ],
      })
      const businessData = await loadPickleFundData(text)
      return callLiteLLM({
        taskType,
        messages: [
          { role: 'system', content: 'Tra loi tieng Viet tu nhien voi persona Lisa. Chi su dung du lieu PickleFund API duoc cung cap. Khong de xuat webhook Make trong Phase 1.' },
          { role: 'user', content: `Cau hoi: ${text}\nY dinh: ${intent}\nDu lieu PickleFund JSON: ${JSON.stringify(businessData).slice(0, 12000)}` },
        ],
      })
    } catch (error) {
      logger.error({
        timestamp: new Date().toISOString(),
        agent_name: AGENT_NAME,
        user_id: userId,
        task_type: taskType,
        provider_used: 'picklefund_api',
        status: 'error',
        error_message: error.message,
      })
      return 'Hien chua truy xuat duoc du lieu PickleFund. Vui long kiem tra API hoac thu lai sau.'
    }
  }
  return callLiteLLM({
    taskType,
    messages: [
      { role: 'system', content: 'Ban la Lisa, agent ho tro tu dong hoa nhe cua PickleFund. Phase 1 khong dung Make. Tra loi ngan gon bang tieng Viet.' },
      { role: 'user', content: text },
    ],
  })
}

async function sendTelegram(chatId, text) {
  if (!TELEGRAM_TOKEN) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', agent: AGENT_NAME, litellm: LITELLM_BASE_URL, timestamp: new Date().toISOString() })
})

app.post('/chat', async (req, res) => {
  try {
    const text = String(req.body?.message || '')
    if (!text.trim()) return res.status(400).json({ error: 'message is required' })
    const result = await answer(text, req.body?.userId)
    res.json({ agent: AGENT_NAME, answer: result })
  } catch (error) {
    req.log.error({ err: error }, 'chat_failed')
    res.status(500).json({ error: 'Lisa dang ban, anh thu lai sau nhe.' })
  }
})

app.post('/telegram/webhook', async (req, res) => {
  if (WEBHOOK_SECRET && req.header('x-webhook-secret') !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'invalid webhook secret' })
  }
  const message = req.body?.message
  const text = message?.text
  const chatId = message?.chat?.id
  if (!text || !chatId) return res.json({ ok: true })
  const result = await answer(text, String(message.from?.id || chatId))
  await sendTelegram(chatId, result)
  res.json({ ok: true })
})

app.listen(PORT, '0.0.0.0', () => {
  logger.info({ msg: 'adapter_started', agent_name: AGENT_NAME, port: PORT })
})
