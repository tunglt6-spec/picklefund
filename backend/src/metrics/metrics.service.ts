/**
 * MetricsService — đếm request/lỗi HTTP theo từng phút (in-memory ring buffer) để Command
 * Center tính req/phút + error-rate. Số THẬT (traffic quan sát được); reset khi restart tiến
 * trình và chỉ phản ánh cửa sổ gần đây. Lỗi = HTTP status >= 500 (lỗi máy chủ).
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  /** key = epoch-minute (Date.now()/60000). Giữ tối đa ~60 phút gần nhất. */
  private readonly buckets = new Map<number, { total: number; errors: number }>();

  record(status: number) {
    const m = Math.floor(Date.now() / 60000);
    let b = this.buckets.get(m);
    if (!b) {
      b = { total: 0, errors: 0 };
      this.buckets.set(m, b);
      for (const k of this.buckets.keys()) if (k < m - 60) this.buckets.delete(k);
    }
    b.total++;
    if (status >= 500) b.errors++;
  }

  /** Tổng hợp cửa sổ `windowMin` phút gần nhất. errorRate = null nếu không có request nào. */
  snapshot(windowMin = 5): { requestsPerMin: number; errorRate: number | null } {
    const now = Math.floor(Date.now() / 60000);
    let total = 0;
    let errors = 0;
    for (let m = now - windowMin + 1; m <= now; m++) {
      const b = this.buckets.get(m);
      if (b) { total += b.total; errors += b.errors; }
    }
    return {
      requestsPerMin: Math.round((total / windowMin) * 10) / 10,
      errorRate: total > 0 ? Math.round((errors / total) * 1000) / 10 : null,
    };
  }
}
