import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";

type Payload = {
  amount: number;
  description: string;
  date: string;
  fundSource: "COMMON" | "MINI";
  memberId?: string;
  fundPeriodId?: string;
  costType?: "COURT" | "LIVING";
  allocationRule?: "EQUAL" | "FUND_ONLY";
  paymentMethod?: "cash" | "bank_transfer";
};
type Draft = {
  id: string;
  kind: string;
  status: string;
  payload: Payload;
  createdAt: string;
  expiresAt: string;
  recordId?: string;
};
type IntakeState = {
  enabled: boolean;
  linked: boolean;
  displayName?: string;
  candidate?: string | null;
};
export function ZaloIntakePanel() {
  const user = useAuthStore((s) => s.user);
  const allowed =
    user?.role === "CLUB_ADMIN" || user?.role === "CLUB_TREASURER";
  const [state, setState] = useState<IntakeState | null>(null),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]),
    [members, setMembers] = useState<{ id: string; fullName: string }[]>([]),
    [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [edit, setEdit] = useState<Draft | null>(null),
    [form, setForm] = useState<Payload | null>(null),
    [history, setHistory] = useState(false);
  const [record, setRecord] = useState(false),
    [reject, setReject] = useState(false);
  const error = (e: any) =>
    toast.error(
      e?.response?.data?.message ||
        "Không xử lý được phiếu Zalo. Vui lòng thử lại.",
    );
  const load = async () => {
    try {
      const s = (await api.get("/zalo/intake/state")).data.data;
      setState(s);
      setFailed(false);
      if (s.enabled) {
        const d = (await api.get("/zalo/intake/drafts")).data.data;
        setDrafts(d.drafts);
        setMembers(d.members);
        setPeriods(d.periods);
      }
    } catch (e) {
      setFailed(true);
      error(e);
    }
  };
  useEffect(() => {
    if (allowed) void load();
  }, [allowed]);
  useEffect(() => {
    if (state?.enabled && new URLSearchParams(window.location.search).get("zaloDraft"))
      document.getElementById("zalo-drafts")?.scrollIntoView({ block: "start" });
  }, [state?.enabled, drafts.length]);
  const action = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  };
  if (!allowed) return null;
  const requested = new URLSearchParams(window.location.search).get(
    "zaloDraft",
  );
  const displayed = drafts
    .filter((d) => history || d.status === "PENDING")
    .sort((a, b) => Number(b.id === requested) - Number(a.id === requested));
  const ready =
    !!form &&
    Number.isSafeInteger(form.amount) &&
    form.amount > 0 &&
    !!form.description.trim() &&
    !!form.date &&
    (form.fundSource === "MINI" ||
      (!!form.fundPeriodId &&
        (edit?.kind === "INCOME"
          ? !!form.memberId
          : !!form.costType && !!form.allocationRule)));
  const field = (patch: Partial<Payload>) =>
    setForm((f) => (f ? { ...f, ...patch } : f));
  return (
    <section
      className="pf-glass rounded-2xl p-4 space-y-4"
      id="zalo-drafts" aria-label="Phiếu thu/chi từ Zalo"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">Phiếu thu/chi từ Zalo</h3>
        <Button variant="outline" disabled={busy} onClick={() => action(load)}>
          Làm mới
        </Button>
      </div>
      {!state ? (
        <p role={failed ? "alert" : "status"}>
          {failed
            ? "Không tải được dữ liệu. Bấm Làm mới để thử lại."
            : "Đang tải…"}
        </p>
      ) : !state.enabled ? null : (
        <>
          <p className="text-sm">
            Bot chỉ tạo phiếu chờ kiểm tra. Khoản thu cần xác nhận và khoản chi
            cần duyệt theo quy trình của app.
          </p>
          {!state.linked && (
            <p role="status" className="text-sm">
              Bạn chưa liên kết tài khoản Zalo — liên kết tại Cài đặt → Tài khoản cá nhân → Liên kết Zalo để tạo phiếu bằng bot.
            </p>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">
              Cách nhập lệnh thu/chi
            </summary>
            <div className="mt-2 space-y-2">
              <p>Gõ @ chọn bot rồi gửi một lệnh:</p>
              <code className="block break-words">
                /thu 300000 | Tên thành viên | quỹ chính | DD/MM/YYYY
              </code>
              <p>Hoặc viết tự nhiên: <code>/thu Nguyễn Văn A đóng 300k hôm qua</code>, <code>/chi tiền sân 450.000</code>.</p>
              <code className="block break-words">
                /chi 450000 | Tiền sân | quỹ chính | DD/MM/YYYY
              </code>
              <p>
                Nhập ngày thực tế; dùng “quỹ phụ” nếu cần. Chỉ quản trị và thủ
                quỹ đã liên kết được tạo phiếu. Phiếu hết hạn sau 24 giờ.
              </p>
            </div>
          </details>
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-semibold">Phiếu từ Zalo</h4>
            <Button variant="outline" onClick={() => setHistory(!history)}>
              {history ? "Chỉ phiếu chờ" : "Xem lịch sử"}
            </Button>
          </div>
          {requested && !drafts.some((d) => d.id === requested) && (
            <p role="status" className="text-sm">
              Không tìm thấy phiếu được mở trong danh sách hoặc anh/chị không có
              quyền xem phiếu này.
            </p>
          )}
          {!displayed.length ? (
            <p className="text-sm">
              Chưa có phiếu {history ? "" : "chờ kiểm tra"}.
            </p>
          ) : (
            <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-3">
              {displayed.map((d) => (
                <article
                  key={d.id}
                  className="rounded-xl border border-[color:var(--pf-border)] p-3 space-y-2 min-w-0"
                  style={
                    d.id === requested
                      ? { borderColor: "var(--pf-primary)" }
                      : undefined
                  }
                >
                  <div className="flex justify-between gap-2">
                    <strong
                      className={
                        d.kind === "INCOME" ? "text-green-700" : "text-red-600"
                      }
                    >
                      {d.kind === "INCOME" ? "Thu" : "Chi"} ·{" "}
                      {d.payload.amount.toLocaleString("vi-VN")} đ
                    </strong>
                    <span className="text-xs">
                      {d.status === "RECORDED"
                        ? "Đã ghi chờ duyệt"
                        : d.status === "REJECTED"
                          ? "Đã bỏ"
                          : new Date(d.expiresAt) < new Date()
                            ? "Hết hạn"
                            : "Chờ kiểm tra"}
                    </span>
                  </div>
                  <p className="text-sm break-words">{d.payload.description}</p>
                  <p className="text-xs">
                    {d.payload.date.split("-").reverse().join("/")} ·{" "}
                    {d.payload.fundSource === "COMMON"
                      ? "Quỹ Chính"
                      : "Quỹ Phụ"}
                  </p>
                  {d.status === "PENDING" &&
                    new Date(d.expiresAt) > new Date() && (
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => {
                          setEdit(d);
                          setForm({ ...d.payload });
                          setRecord(false);
                          setReject(false);
                        }}
                      >
                        Mở kiểm tra
                      </Button>
                    )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <Modal
        open={!!edit && !record && !reject}
        title={
          edit?.kind === "INCOME" ? "Kiểm tra phiếu thu" : "Kiểm tra phiếu chi"
        }
        onClose={() => {
          setEdit(null);
          setForm(null);
        }}
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setReject(true)}
            >
              Bỏ phiếu
            </Button>
            <Button disabled={busy || !ready} onClick={() => setRecord(true)}>
              Kiểm tra và ghi
            </Button>
          </div>
        }
      >
        {form && (
          <div className="space-y-3">
            <label className="block text-sm font-semibold">
              Số tiền (VND)
              <input
                className="input-base mt-1 w-full"
                type="number"
                min="1"
                step="1"
                value={form.amount || ""}
                onChange={(e) => field({ amount: Number(e.target.value) })}
              />
            </label>
            <label className="block text-sm font-semibold">
              Nội dung / người nộp
              <input
                className="input-base mt-1 w-full"
                maxLength={200}
                value={form.description}
                onChange={(e) => field({ description: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">
                Ngày
                <input
                  className="input-base mt-1 w-full"
                  type="date"
                  value={form.date}
                  onChange={(e) => field({ date: e.target.value })}
                />
              </label>
              <label className="block text-sm font-semibold">
                Quỹ
                <select
                  className="input-base mt-1 w-full"
                  value={form.fundSource}
                  onChange={(e) =>
                    field({
                      fundSource: e.target.value as Payload["fundSource"],
                      memberId: undefined,
                      fundPeriodId: undefined,
                    })
                  }
                >
                  <option value="COMMON">Quỹ Chính</option>
                  <option value="MINI">Quỹ Phụ</option>
                </select>
              </label>
            </div>
            {form.fundSource === "COMMON" && (
              <label className="block text-sm font-semibold">
                Kỳ quỹ đang mở
                <select
                  className="input-base mt-1 w-full"
                  value={form.fundPeriodId || ""}
                  onChange={(e) => field({ fundPeriodId: e.target.value })}
                >
                  <option value="">Chọn kỳ quỹ</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {edit?.kind === "INCOME" && form.fundSource === "COMMON" && (
              <label className="block text-sm font-semibold">
                Thành viên nộp quỹ
                <select
                  className="input-base mt-1 w-full"
                  value={form.memberId || ""}
                  onChange={(e) => field({ memberId: e.target.value })}
                >
                  <option value="">Chọn đúng thành viên</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {edit?.kind === "INCOME" && (
              <label className="block text-sm font-semibold">
                Hình thức thu
                <select
                  className="input-base mt-1 w-full"
                  value={form.paymentMethod || "bank_transfer"}
                  onChange={(e) =>
                    field({
                      paymentMethod: e.target.value as Payload["paymentMethod"],
                    })
                  }
                >
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                </select>
              </label>
            )}
            {edit?.kind === "EXPENSE" && form.fundSource === "COMMON" && (
              <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">
                  Loại chi
                  <select
                    className="input-base mt-1 w-full"
                    value={form.costType || ""}
                    onChange={(e) =>
                      field({
                        costType: e.target.value as Payload["costType"],
                        allocationRule:
                          e.target.value === "COURT" ? "EQUAL" : undefined,
                      })
                    }
                  >
                    <option value="">Chọn loại chi</option>
                    <option value="COURT">Tiền sân</option>
                    <option value="LIVING">Sinh hoạt</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  Cách phân bổ
                  <select
                    className="input-base mt-1 w-full"
                    value={form.allocationRule || ""}
                    disabled={form.costType === "COURT"}
                    onChange={(e) =>
                      field({
                        allocationRule: e.target
                          .value as Payload["allocationRule"],
                      })
                    }
                  >
                    <option value="">Chọn cách phân bổ</option>
                    <option value="EQUAL">Chia đều</option>
                    <option value="FUND_ONLY">Chỉ trừ quỹ</option>
                  </select>
                </label>
              </div>
            )}
            {form.fundSource === "MINI" && (
              <p className="text-sm">
                Khoản Quỹ Phụ được ghi loại “Khác”, độc lập Quỹ Chính.
              </p>
            )}
            <p className="text-sm">
              Lưu phiếu sẽ tạo khoản thu chờ xác nhận hoặc khoản chi chờ duyệt.
              Chưa tự xác nhận đã nhận/chi tiền.
            </p>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        variant="warning"
        open={record}
        title="Ghi khoản đang kiểm tra?"
        message={`${edit?.kind === "INCOME" ? "Thu" : "Chi"} ${form?.amount.toLocaleString("vi-VN")} đ · ${form?.description} · ${form?.date.split("-").reverse().join("/")} · ${form?.fundSource === "COMMON" ? "Quỹ Chính" : "Quỹ Phụ"}${form?.fundSource === "COMMON" ? " · " + (periods.find((p) => p.id === form.fundPeriodId)?.name || "") : ""}${edit?.kind === "INCOME" && form?.fundSource === "COMMON" ? " · " + (members.find((m) => m.id === form.memberId)?.fullName || "") : ""}. Tạo bản ghi chờ xác nhận/duyệt, không tự duyệt.`}
        confirmLabel="Ghi chờ duyệt"
        onCancel={() => setRecord(false)}
        onConfirm={() =>
          action(async () => {
            if (!edit || !form) return;
            await api.post(`/zalo/intake/drafts/${edit.id}/record`, form);
            setRecord(false);
            setEdit(null);
            setForm(null);
            await load();
            toast.success("Đã ghi khoản chờ xác nhận/duyệt");
          })
        }
      />
      <ConfirmDialog
        open={reject}
        title="Bỏ phiếu nhập Zalo?"
        message="Phiếu sẽ không tạo khoản thu/chi. Lịch sử xử lý được giữ lại."
        confirmLabel="Bỏ phiếu"
        onCancel={() => setReject(false)}
        onConfirm={() =>
          action(async () => {
            if (!edit) return;
            await api.post(`/zalo/intake/drafts/${edit.id}/reject`);
            setReject(false);
            setEdit(null);
            setForm(null);
            await load();
          })
        }
      />
    </section>
  );
}
