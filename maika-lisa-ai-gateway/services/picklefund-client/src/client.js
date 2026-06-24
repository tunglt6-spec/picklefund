const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRIES = 2

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function redactHeaders(headers) {
  const copy = { ...headers }
  if (copy.Authorization) copy.Authorization = '[redacted]'
  if (copy.authorization) copy.authorization = '[redacted]'
  return copy
}

export class PickleFundClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.PICKLEFUND_API_BASE_URL || '').replace(/\/$/, '')
    this.token = options.token || process.env.PICKLEFUND_API_TOKEN || ''
    this.timeoutMs = Number(options.timeoutMs || process.env.PICKLEFUND_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
    this.retries = Number(options.retries || process.env.PICKLEFUND_RETRIES || DEFAULT_RETRIES)
    this.logger = options.logger || console
  }

  ensureConfigured() {
    if (!this.baseUrl) throw new Error('PICKLEFUND_API_BASE_URL is required')
  }

  async request(path, options = {}) {
    this.ensureConfigured()

    const method = options.method || 'GET'
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options.headers || {}),
    }

    let lastError
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      const startedAt = Date.now()

      try {
        this.logger.info?.({
          msg: 'picklefund_request',
          method,
          path,
          attempt,
          headers: redactHeaders(headers),
        })

        const response = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        })
        const text = await response.text()
        const data = text ? JSON.parse(text) : null

        this.logger.info?.({
          msg: 'picklefund_response',
          method,
          path,
          status: response.status,
          latency_ms: Date.now() - startedAt,
        })

        if (response.ok) return data
        if (response.status === 401) throw new Error('PickleFund token khong hop le hoac da het han')
        if (response.status === 403) throw new Error('PickleFund token khong co quyen truy cap')
        if (response.status >= 500) throw new Error('PickleFund API dang loi may chu')
        throw new Error(data?.message || `PickleFund API returned ${response.status}`)
      } catch (error) {
        lastError = error
        if (attempt >= this.retries) break
        await sleep(300 * (attempt + 1))
      } finally {
        clearTimeout(timer)
      }
    }

    throw lastError
  }

  getDashboard() {
    return Promise.all([
      this.request('/api/fund-periods'),
      this.request('/api/contributions/summary'),
      this.request('/api/expenses/summary'),
    ]).then(([funds, income, expenses]) => ({ funds, income, expenses }))
  }

  getMembers() {
    return this.request('/api/members')
  }

  getFunds() {
    return this.request('/api/fund-periods')
  }

  getTransactions() {
    return Promise.all([
      this.request('/api/contributions'),
      this.request('/api/expenses'),
    ]).then(([contributions, expenses]) => ({ contributions, expenses }))
  }

  getReports() {
    return Promise.all([
      this.request('/api/fund-periods'),
      this.request('/api/contributions/summary'),
      this.request('/api/expenses/summary'),
    ]).then(([funds, income, expenses]) => ({ funds, income, expenses }))
  }

  postTransaction(input) {
    this.validateAmount(input?.amount)
    return this.request('/api/contributions', { method: 'POST', body: input })
  }

  postAttendance(input) {
    if (!input || typeof input !== 'object') throw new Error('Attendance payload is required')
    return this.request('/api/attendance', { method: 'POST', body: input })
  }

  validateAmount(amount) {
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number')
    }
  }
}
