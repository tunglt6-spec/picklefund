# OpenClaw — AI Teammate Framework

**Mục đích:** Mô tả OpenClaw framework nội bộ
**Trạng thái:** PLANNED/PROPOSED — V2.1, chưa phát triển
**Cập nhật:** 2026-06-29

---

## OpenClaw là gì?

OpenClaw là framework nội bộ PickleFund để xây dựng AI Teammates (Maika, Lisa, Hermes).

Cung cấp:
- Tool definition interface thống nhất
- Memory management cho AI context
- Injection ngữ cảnh PickleFund vào mỗi request

---

## Tại sao không dùng framework có sẵn?

Các framework như LangChain, CrewAI... có thể phù hợp, nhưng OpenClaw được thiết kế riêng cho ngữ cảnh PickleFund với:
- Schema phù hợp với dữ liệu CLB
- Bảo mật multi-tenant tích hợp sẵn
- Kiểm soát hoàn toàn về behavior

---

## Trạng thái

Đây là **đặt tên và định hướng**, chưa có code. Quyết định có tự build hay dùng framework có sẵn sẽ được đưa ra trong ADR-005 mở rộng khi bắt đầu V2.1.
