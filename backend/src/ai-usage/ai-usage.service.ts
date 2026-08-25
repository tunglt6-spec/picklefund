/**
 * AiUsageService — ghi nhận sử dụng LLM (token THẬT từ provider) để Command Center tính
 * token/chi phí AI. Cost = token × bảng giá ƯỚC TÍNH (USD/1 triệu token) — token là số thật,
 * chi phí là ước tính (đã ghi rõ ở UI). Ghi best-effort: KHÔNG bao giờ throw ra luồng trả lời.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Giá ước tính USD / 1 triệu token (input, output). Chỉ tính cho Gemini (Google, có tính phí).
 *  OpenRouter :free và rule-based = miễn phí → cost 0. Cập nhật khi Google đổi bảng giá. */
const PRICE_PER_1M: Record<string, { in: number; out: number }> = {
  'gemini-3.5-flash': { in: 0.1, out: 0.4 },
  'gemini-3.1-flash-lite': { in: 0.05, out: 0.2 },
  'gemini-2.0-flash': { in: 0.1, out: 0.4 },
  'gemini-1.5-flash': { in: 0.075, out: 0.3 },
  default: { in: 0.1, out: 0.4 },
};

export interface AiUsageInput {
  clubId?: string | null;
  agent: string; // 'MAIKA' | 'LISA' | ...
  provider: 'gemini' | 'openrouter' | 'rule-based' | string;
  model?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  success?: boolean;
  fallback?: boolean;
  /** Cost USD đã tính sẵn từ call-site (vd harness litellm/openrouter). Nếu bỏ trống → tự ước tính (chỉ Gemini). */
  estimatedCostUsd?: number | null;
  // Observability chuẩn hoá (Phase 0).
  source?: string | null; // maika | lisa | harness | workflow
  correlationId?: string | null; // nối tới WorkflowRun/AiAction để giải trình 1 lần chạy
  userId?: string | null;
  errorType?: string | null;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private prisma: PrismaService) {}

  private estimateCost(provider: string, model: string | null | undefined, promptT: number, completionT: number): number {
    if (provider !== 'gemini') return 0; // free / rule-based
    const p = (model && PRICE_PER_1M[model]) || PRICE_PER_1M.default;
    return (promptT / 1_000_000) * p.in + (completionT / 1_000_000) * p.out;
  }

  /** Ghi 1 dòng usage. Không throw — lỗi ghi log chỉ warn. */
  async record(input: AiUsageInput): Promise<void> {
    try {
      const promptTokens = Math.max(0, Math.round(input.promptTokens ?? 0));
      const completionTokens = Math.max(0, Math.round(input.completionTokens ?? 0));
      const totalTokens = Math.max(0, Math.round(input.totalTokens ?? promptTokens + completionTokens));
      const cost = input.estimatedCostUsd != null
        ? Math.max(0, input.estimatedCostUsd)
        : this.estimateCost(input.provider, input.model, promptTokens, completionTokens);
      await this.prisma.aiUsageLog.create({
        data: {
          clubId: input.clubId ?? null,
          agent: input.agent.slice(0, 20),
          provider: input.provider,
          model: input.model?.slice(0, 80) ?? null,
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCostUsd: cost,
          latencyMs: input.latencyMs != null ? Math.round(input.latencyMs) : null,
          success: input.success ?? true,
          fallback: input.fallback ?? false,
          source: input.source?.slice(0, 20) ?? input.agent.toLowerCase().slice(0, 20),
          correlationId: input.correlationId?.slice(0, 64) ?? null,
          userId: input.userId ?? null,
          errorType: input.errorType?.slice(0, 60) ?? null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`[AiUsage] record failed: ${err?.message ?? err}`);
    }
  }

  /** Đọc usageMetadata từ kết quả @google/generative-ai (thủ tục an toàn với optional chaining). */
  static readGeminiUsage(result: any): { promptTokens: number; completionTokens: number; totalTokens: number } {
    const u = result?.response?.usageMetadata ?? {};
    return {
      promptTokens: Number(u.promptTokenCount ?? 0) || 0,
      completionTokens: Number(u.candidatesTokenCount ?? 0) || 0,
      totalTokens: Number(u.totalTokenCount ?? 0) || 0,
    };
  }
}
