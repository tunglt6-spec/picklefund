# CODEX AUDIT — PickleFund V2.2 Tier 3-4 (nhẹ: correctness / regression / scope)

> Dán khối này cho Codex (chạy trong repo `tunglt6-spec/picklefund` nhánh `main`; có thể `git show <hash>`). Diff Tier 3 + Tier 4-code đã inline đầy đủ bên dưới. Tier 1-2 ĐÃ audit xong (verdict GA-ready) — KHÔNG lặp lại.

## BỐI CẢNH & MỨC ĐỘ
Đây là nhóm rủi ro THẤP hơn: UI + logic nhỏ + dọn dead-code + reskin cosmetic. Tất cả ĐÃ deploy prod (health 200), build/test PASS (BE 853 tests, FE tsc+build sạch). Nhiệm vụ: soi **correctness/regression/scope** — KHÔNG cần soi lại security/finance sâu như Tier 1-2 (đã làm). Chỉ báo lỗi THẬT gây sai nghiệp vụ / mất chức năng / regression. Không báo style/lint (đã sạch).

## BẤT BIẾN LIÊN QUAN (đối chiếu nhanh)
- Multi-tenant: query scope `clubId`; id lấy từ JWT.
- MEMBER_VIEW self-scope: chỉ thao tác dữ liệu CHÍNH mình; ẩn action admin.
- Token màu `--pf-*` (primary tím #6D5DFB); KHÔNG hardcode indigo/purple/cyan/gradient (trừ Login.tsx public).
- Finance: Common vs Mini KHÔNG trộn; số liệu Reports/Dashboard/PDF khớp calculator.
- Dead-code xóa phải chắc chắn 0 import/0 route.

## DIMENSIONS: [REGRESSION] [LOGIC] [TENANT] [UI-CONFORMANCE] [SCOPE] [DEAD-CODE-SAFETY]

---

## TIER 3 — MEDIUM (UI có nghiệp vụ / logic nhỏ) — soi từng commit

**`cd2a25b3` — member portal FE (8 màn, nav, role-aware, UI ủy quyền minigame)**
Kiểm: các màn dùng chung admin/member (ScheduleCalendar/SessionRegistration/CheckIn) khi `isMember` CHỈ cho thao tác của CHÍNH member (user.memberId), ẩn/disable action admin + hàng người khác; RSVP/checkin gọi endpoint self-scope `/member/me/...` đúng; `useApiSync` bỏ skip MEMBER_VIEW không gây gọi API 403 thừa/lỗi; nav member không lộ route admin-only; `useMinigameDelegate` gate nút tạo/sửa đúng (staff luôn được; member chỉ khi trong delegates). Regression: admin dùng các màn này vẫn đầy đủ quyền.

**`3c75bf91` — members: email optional**
Kiểm: FE payload bỏ `clubId` (BE lấy JWT) + loại field rỗng; BE `@Transform ''→undefined` cho email ở CẢ Create/Update DTO; không phá validate khi email hợp lệ; không cho phép field lạ.

**`5e71927c` — FinanceDashboard graceful + confirm khóa user**
Kiểm: guard `isLocalToken` + EmptyState khi không có summary (không render null/trắng); `ErrorState` khi API lỗi thật là ĐÚNG (không phải bug); SuperUsers có ConfirmDialog trước khóa/mở khóa (không tác động ngay khi click). Không đổi công thức tài chính.

**`c02e7c7f` + `790fdb92` — copy-member wiring FE Quỹ Chính (desktop + mobile)**
Kiểm: modal Tạo Quỹ Chính (cả desktop `form-chung` lẫn mobile `form-chung-m`) nối đúng 3 prop `showCopyMembers`/`prevPeriodInfo`/`prevPeriodError`; fetch `/fund-periods/previous?type=chung`; `copyMembersFromPreviousPeriod` chỉ gửi khi TẠO MỚI (không khi sửa); backend đã generic (không cần đổi). Không ảnh hưởng modal Quỹ Phụ.

**`532e20fd` — nút xuất PDF/Excel + phiếu thu mobile**
Kiểm: nút xuất trên mobile gọi đúng hàm export đã có (không tạo luồng tính toán mới); guard length>0 trước export; không lộ dữ liệu CLB khác.

## TIER 4 — LOW (code: dead-code/test) — spot-check

**`86540b7d` — bảng overflow-x-auto + xóa dead code** (diff inline CHỈ phần bảng; 2 file xóa là dead)
Kiểm: thêm `overflow-x-auto` cho card bảng (SuperUsers/TreasurerReminders/Contributions) — chỉ đổi class, không đổi cấu trúc bảng. Xác nhận `AIWorkspace.tsx` + `mockMinigameDashboard.ts` bị xóa THẬT SỰ không còn import/route (chạy `git grep -n "AIWorkspace\|mockMinigameDashboard\|mockTournamentDashboard" -- 'frontend/src'` → chỉ còn tự-tham-chiếu/không còn).

**`b4574e2a` — fix 2 spec backend (test-only)**: ai.controller.spec thêm mock TokenAccountingService; hermes-workflow.spec dùng toMatchObject. Chỉ test, không đụng runtime.

**`0e79befd` — xóa dead `mockFundSummary`**: xác nhận export này 0 import trước khi xóa (dead).

## TIER 4 — reskin cosmetic (KHÔNG inline — soi qua git nếu muốn)
`ae898ed0`(Tier A, 69 file) `4261f364` `e4e98d0a` `b1cd14ab` `531472cc` `f7b192c6` `f3791b38` `f2054faf` `b95871c2` `47ac5d2a`.
Bản chất: đổi màu hardcode→token `--pf-*` + migrate layout sang shared-kit. Concern DUY NHẤT: **[UI-CONFORMANCE]/[REGRESSION]** — có commit nào vô tình đổi LOGIC/handler/điều kiện (không chỉ class/màu) không? Có reintroduce hardcode brand color ngoài Login.tsx không? Spot-check vài commit bằng `git show <hash>` nếu có quyền; nếu không, BỎ QUA (đã verify mắt + build sạch).

## OUTPUT
Mỗi lỗi thật: `[SEVERITY][DIMENSION] <commit> file:line — vấn đề (bằng chứng) — khắc phục`.
Bảng verdict theo commit (PASS / cần sửa). Verdict tổng Tier 3-4: OK / CẦN SỬA. Commit sạch ghi PASS, không bịa.

---

# DIFF INLINE

## cd2a25b3 — feat(member-portal): 8 màn portal member + nav + role-aware + UI ủy quyền minigame

````diff
diff --git a/frontend/src/App.tsx b/frontend/src/App.tsx
index 9770d66d..e840553d 100644
--- a/frontend/src/App.tsx
+++ b/frontend/src/App.tsx
@@ -147,22 +147,8 @@ export default function App() {
             <Route path="/fund-periods" element={<FundPeriods />} />
             <Route path="/contributions" element={<Contributions />} />
             <Route path="/expenses" element={<Expenses />} />
-            <Route path="/debts" element={<Debts />} />
             <Route path="/thu-chi" element={<ThuChiHub />} />
             <Route path="/attendance" element={<Attendance />} />
-            <Route path="/activity" element={<WeeklyActivity />} />
-            <Route path="/session-registration" element={<SessionRegistration />} />
-            <Route path="/check-in" element={<CheckIn />} />
-            <Route path="/schedule" element={<ScheduleCalendar />} />
-            <Route path="/finance-dashboard" element={<FinanceDashboard />} />
-            <Route path="/minigames" element={<MinigameList />} />
-            <Route path="/minigames/new" element={<MinigameForm />} />
-            <Route path="/minigames/:id" element={<MinigameDashboard />} />
-            <Route path="/minigames/:id/edit" element={<MinigameForm />} />
-            <Route path="/minigames/:id/groups" element={<GroupAssignment />} />
-            <Route path="/minigames/:id/schedule" element={<MatchSchedule />} />
-            <Route path="/minigames/:id/standings" element={<StandingsPage />} />
-            <Route path="/match-history" element={<MatchHistory />} />
             <Route path="/reports" element={<Reports />} />
             <Route path="/notifications" element={<Notifications />} />
             <Route path="/lisa" element={<LisaChat />} />
@@ -177,6 +163,23 @@ export default function App() {
             <Route path="/treasurer/ledger" element={<TreasurerLedger />} />
             <Route path="/treasurer/reminders" element={<TreasurerReminders />} />
 
+            </Route>
+            {/* Màn dùng chung admin + member (member: read-only / self-scope / theo ủy quyền minigame) */}
+            <Route element={<RoleRoute allow={['SUPER_ADMIN', 'CLUB_ADMIN', 'MEMBER_VIEW']} />}>
+            <Route path="/debts" element={<Debts />} />
+            <Route path="/schedule" element={<ScheduleCalendar />} />
+            <Route path="/session-registration" element={<SessionRegistration />} />
+            <Route path="/check-in" element={<CheckIn />} />
+            <Route path="/activity" element={<WeeklyActivity />} />
+            <Route path="/minigames" element={<MinigameList />} />
+            <Route path="/minigames/new" element={<MinigameForm />} />
+            <Route path="/minigames/:id" element={<MinigameDashboard />} />
+            <Route path="/minigames/:id/edit" element={<MinigameForm />} />
+            <Route path="/minigames/:id/groups" element={<GroupAssignment />} />
+            <Route path="/minigames/:id/schedule" element={<MatchSchedule />} />
+            <Route path="/minigames/:id/standings" element={<StandingsPage />} />
+            <Route path="/match-history" element={<MatchHistory />} />
+            <Route path="/finance-dashboard" element={<FinanceDashboard />} />
             </Route>
             {/* AI Manager (Epic 4) — chỉ SUPER_ADMIN / CLUB_ADMIN */}
             <Route element={<RoleRoute allow={['SUPER_ADMIN', 'CLUB_ADMIN']} />}>
diff --git a/frontend/src/components/layout/BottomNav.tsx b/frontend/src/components/layout/BottomNav.tsx
index 455de686..e154c3f9 100644
--- a/frontend/src/components/layout/BottomNav.tsx
+++ b/frontend/src/components/layout/BottomNav.tsx
@@ -5,6 +5,7 @@ import {
   CheckSquare, BarChart3, Building2, ScrollText,
   Receipt, ListOrdered, CreditCard, Bell,
   Menu, Settings, Trophy,
+  Coins, CalendarDays, CalendarPlus, ClipboardCheck, Activity, History, Wallet,
 } from 'lucide-react'
 import { useAuthStore } from '../../store/authStore'
 import type { Role } from '../../types'
@@ -28,11 +29,32 @@ const treasurerNav: NavItem[] = [
 const memberNav: NavItem[] = [
   { label: 'Tổng quan',   icon: <LayoutDashboard size={22} />, to: '/member/dashboard' },
   { label: 'Phiếu thu',   icon: <Receipt size={22} />,         to: '/member/receipt' },
-  { label: 'Đóng quỹ',   icon: <DollarSign size={22} />,      to: '/member/contributions' },
   { label: 'Lịch chơi',  icon: <Calendar size={22} />,         to: '/member/attendance' },
   { label: 'Thông báo',  icon: <Bell size={22} />,             to: '/member/notifications' },
 ]
 
+// Drawer "Thêm" — danh mục mở rộng theo role.
+const moreItemsByRole: Partial<Record<Role, { label: string; icon: React.ReactNode; to: string }[]>> = {
+  CLUB_ADMIN: [
+    { label: 'Thành viên', icon: <Users size={20} />, to: '/members' },
+    { label: 'Kỳ quỹ', icon: <Calendar size={20} />, to: '/fund-periods' },
+    { label: 'Cài đặt', icon: <Settings size={20} />, to: '/settings' },
+    { label: 'Thông báo', icon: <Bell size={20} />, to: '/notifications' },
+    { label: 'Minigame', icon: <Trophy size={20} />, to: '/minigames' },
+  ],
+  MEMBER_VIEW: [
+    { label: 'Đóng quỹ', icon: <DollarSign size={20} />, to: '/member/contributions' },
+    { label: 'Công nợ', icon: <Coins size={20} />, to: '/debts' },
+    { label: 'Lịch sinh hoạt', icon: <CalendarDays size={20} />, to: '/schedule' },
+    { label: 'Đăng ký buổi', icon: <CalendarPlus size={20} />, to: '/session-registration' },
+    { label: 'Check-in', icon: <ClipboardCheck size={20} />, to: '/check-in' },
+    { label: 'Hoạt động tuần', icon: <Activity size={20} />, to: '/activity' },
+    { label: 'Minigame', icon: <Trophy size={20} />, to: '/minigames' },
+    { label: 'Lịch sử thi đấu', icon: <History size={20} />, to: '/match-history' },
+    { label: 'Tài chính', icon: <Wallet size={20} />, to: '/finance-dashboard' },
+  ],
+}
+
 const superNav: NavItem[] = [
   { label: 'Dashboard', icon: <LayoutDashboard size={22} />, to: '/super/dashboard' },
   { label: 'CLB',       icon: <Building2 size={22} />,       to: '/super/clubs' },
@@ -54,7 +76,8 @@ export function BottomNav() {
   if (!user) return null
 
   const items = navByRole[user.role]
-  const isAdmin = user.role === 'CLUB_ADMIN'
+  const moreItems = moreItemsByRole[user.role] ?? []
+  const hasMore = moreItems.length > 0
 
   return (
     <>
@@ -103,7 +126,7 @@ export function BottomNav() {
               )}
             </NavLink>
           ))}
-          {isAdmin && (
+          {hasMore && (
             <button
               onClick={() => setShowMore(true)}
               className="flex-1 flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-slate-400"
@@ -115,7 +138,7 @@ export function BottomNav() {
         </div>
       </nav>
 
-      {isAdmin && showMore && (
+      {hasMore && showMore && (
         <>
           {/* Backdrop */}
           <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowMore(false)} />
@@ -126,17 +149,11 @@ export function BottomNav() {
               Điều hướng
             </div>
             <div className="grid grid-cols-3 gap-3">
-              {[
-                { label: 'Thành viên', icon: <Users size={20} />, to: '/members' },
-                { label: 'Kỳ quỹ', icon: <Calendar size={20} />, to: '/fund-periods' },
-                { label: 'Cài đặt', icon: <Settings size={20} />, to: '/settings' },
-                { label: 'Thông báo', icon: <Bell size={20} />, to: '/notifications' },
-                { label: 'Minigame', icon: <Trophy size={20} />, to: '/minigames' },
-              ].map(item => (
+              {moreItems.map(item => (
                 <button
                   key={item.to}
                   onClick={() => { navigate(item.to); setShowMore(false) }}
-                  className="flex flex-col items-center gap-1.5 p-3 rounded-[14px] bg-slate-50 hover:bg-slate-100 transition-colors"
+                  className="flex flex-col items-center gap-1.5 p-3 min-h-11 rounded-[14px] bg-slate-50 hover:bg-slate-100 transition-colors"
                 >
                   <span className="[color:var(--pf-primary)]">{item.icon}</span>
                   <span className="text-[11px] font-[600] text-slate-700">{item.label}</span>
diff --git a/frontend/src/components/layout/Sidebar.tsx b/frontend/src/components/layout/Sidebar.tsx
index 32629fe3..bf101c99 100644
--- a/frontend/src/components/layout/Sidebar.tsx
+++ b/frontend/src/components/layout/Sidebar.tsx
@@ -72,6 +72,14 @@ const memberNav: NavItem[] = [
   { label: 'Phiếu Thu',     icon: <Receipt size={18} />,         to: '/member/receipt' },
   { label: 'Lịch sử Đóng',  icon: <DollarSign size={18} />,     to: '/member/contributions' },
   { label: 'Lịch Tham Gia', icon: <Calendar size={18} />,        to: '/member/attendance' },
+  { label: 'Công nợ',      icon: <Coins size={18} />,            to: '/debts' },
+  { label: 'Lịch sinh hoạt', icon: <CalendarDays size={18} />,  to: '/schedule' },
+  { label: 'Đăng ký buổi', icon: <CalendarPlus size={18} />,    to: '/session-registration' },
+  { label: 'Check-in',      icon: <ClipboardCheck size={18} />, to: '/check-in' },
+  { label: 'Hoạt động tuần', icon: <Activity size={18} />,      to: '/activity' },
+  { label: 'Minigame',      icon: <Trophy size={18} />,          to: '/minigames' },
+  { label: 'Lịch sử thi đấu', icon: <History size={18} />,       to: '/match-history' },
+  { label: 'Tài chính',     icon: <Wallet size={18} />,          to: '/finance-dashboard' },
   { label: 'Lisa AI',        icon: <Sparkles size={18} />,        to: '/member/lisa' },
   { label: 'Thông báo',     icon: <Bell size={18} />,            to: '/member/notifications' },
 ]
diff --git a/frontend/src/hooks/useApiSync.ts b/frontend/src/hooks/useApiSync.ts
index 093455dc..b185c118 100644
--- a/frontend/src/hooks/useApiSync.ts
+++ b/frontend/src/hooks/useApiSync.ts
@@ -22,9 +22,7 @@ export function useApiSync() {
 
   useEffect(() => {
     if (!isAuthenticated || !user?.clubId || !accessToken) return
-    // MEMBER_VIEW cũng có clubId nhưng KHÔNG có quyền các endpoint toàn CLB (backend chặn 403).
-    // Bỏ qua sync để không bắn ~8 request thừa + nhiễu log 403; member dùng portal self-scope.
-    if (user.role === 'MEMBER_VIEW') return
+    // MEMBER_VIEW từ V2.3 được đọc read-only dữ liệu CLB (MemberScopeGuard allowlist GET) → sync như các role khác.
     if (isLocalToken(accessToken)) return
     if (syncedRef.current) return
 
diff --git a/frontend/src/hooks/useMinigameDelegate.ts b/frontend/src/hooks/useMinigameDelegate.ts
new file mode 100644
index 00000000..eab79b9f
--- /dev/null
+++ b/frontend/src/hooks/useMinigameDelegate.ts
@@ -0,0 +1,22 @@
+import { useEffect, useState } from 'react'
+import { useAuthStore } from '../store/authStore'
+import api from '../lib/api'
+
+/** Member có được ủy quyền quản lý minigame không (Club.settings.minigameDelegateMemberIds). Admin luôn true. */
+export function useMinigameDelegate() {
+  const { user } = useAuthStore()
+  const isStaff = user?.role === 'CLUB_ADMIN' || user?.role === 'SUPER_ADMIN'
+  const [delegates, setDelegates] = useState<string[]>([])
+  const [loading, setLoading] = useState(!isStaff)
+  useEffect(() => {
+    if (isStaff || !user) return
+    let alive = true
+    api.get('/clubs/me/minigame-delegates')
+      .then(res => { if (alive) setDelegates(res.data?.data ?? []) })
+      .catch(() => { /* mặc định không ủy quyền */ })
+      .finally(() => { if (alive) setLoading(false) })
+    return () => { alive = false }
+  }, [isStaff, user])
+  const canManage = isStaff || (!!user?.memberId && delegates.includes(user.memberId))
+  return { canManage, delegates, setDelegates, loading, isStaff }
+}
diff --git a/frontend/src/pages/admin/CheckIn.tsx b/frontend/src/pages/admin/CheckIn.tsx
index 9e4b42fd..8c724fad 100644
--- a/frontend/src/pages/admin/CheckIn.tsx
+++ b/frontend/src/pages/admin/CheckIn.tsx
@@ -30,7 +30,10 @@ function fmtSession(dateIso: string, courtName?: string, startTime?: string): st
 }
 
 export function CheckIn() {
-  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
+  const user = useAuthStore((s) => s.user)
+  const clubId = user?.clubId ?? ''
+  const isMember = user?.role === 'MEMBER_VIEW'
+  const myMemberId = user?.memberId
   const { sessions } = useClubDataStore((s) => s.getClubData(clubId))
 
   // Buổi gần hôm nay nhất trước (check-in thường cho buổi hôm nay); lấy tối đa 12 buổi.
@@ -98,6 +101,21 @@ export function CheckIn() {
       return next
     })
 
+  // Member self-scope: check-in CHÍNH mình qua PUT /member/me/sessions/:id/checkin (không body).
+  const memberCheckInSelf = async () => {
+    if (!sessionId || !myMemberId || saving) return
+    setSaving(true)
+    try {
+      await api.put(`/member/me/sessions/${sessionId}/checkin`)
+      toast.success('Đã check-in')
+      await load(sessionId)
+    } catch {
+      toast.error('Check-in thất bại. Vui lòng thử lại.')
+    } finally {
+      setSaving(false)
+    }
+  }
+
   const save = async () => {
     if (!sessionId) return
     setSaving(true)
@@ -125,7 +143,7 @@ export function CheckIn() {
         title="Check-in nhanh"
         subtitle="Chọn buổi chơi và điểm danh một chạm"
         actions={
-          sessionId && rows.length > 0 ? (
+          !isMember && sessionId && rows.length > 0 ? (
             <ActionButton icon={<Save size={16} />} onClick={save} disabled={saving}>
               {saving ? 'Đang lưu…' : 'Lưu điểm danh'}
             </ActionButton>
@@ -175,12 +193,15 @@ export function CheckIn() {
               <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                 {rows.map((r) => {
                   const on = present.has(r.memberId)
+                  const isSelf = r.memberId === myMemberId
+                  const disabled = isMember && (!isSelf || on)
                   return (
                     <button
                       key={r.memberId}
-                      onClick={() => toggle(r.memberId)}
+                      onClick={() => (isMember ? (isSelf && !on ? void memberCheckInSelf() : undefined) : toggle(r.memberId))}
                       aria-pressed={on}
-                      className="flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors"
+                      disabled={disabled}
+                      className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                       style={{
                         background: on ? 'var(--pf-primary-soft)' : 'var(--pf-surface)',
                         borderColor: on ? 'var(--pf-primary)' : 'var(--pf-border)',
diff --git a/frontend/src/pages/admin/ScheduleCalendar.tsx b/frontend/src/pages/admin/ScheduleCalendar.tsx
index 598be5b2..4e05aa93 100644
--- a/frontend/src/pages/admin/ScheduleCalendar.tsx
+++ b/frontend/src/pages/admin/ScheduleCalendar.tsx
@@ -65,6 +65,7 @@ function initials(name: string): string {
 export function ScheduleCalendar() {
   const navigate = useNavigate()
   const { user, accessToken } = useAuthStore()
+  const isMember = user?.role === 'MEMBER_VIEW'
   const clubId = user?.clubId ?? ''
   const { sessions, members } = useClubDataStore((s) => s.getClubData(clubId))
   const setSessions = useClubDataStore((s) => s.setSessions)
@@ -198,6 +199,20 @@ export function ScheduleCalendar() {
     }
   }
 
+  // Member self-scope: toggle đăng ký của CHÍNH mình (PUT /member/me/sessions/:id/registration).
+  const handleMemberToggle = async (s: AttendanceSession) => {
+    const myId = user?.memberId
+    if (!myId) return
+    const registered = (regMap[s.id]?.members ?? []).some((m) => m.memberId === myId && m.registered)
+    try {
+      await api.put(`/member/me/sessions/${s.id}/registration`, { register: !registered })
+      toast.success(!registered ? 'Đã đăng ký buổi chơi' : 'Đã hủy đăng ký')
+      void loadRegs(monthSessionKey ? monthSessionKey.split(',') : [])
+    } catch (e: any) {
+      toast.error(e?.response?.data?.message ?? 'Cập nhật đăng ký thất bại')
+    }
+  }
+
   const statusTone = (st: AttendanceSession['status']) => st === 'completed' ? 'neutral' : st === 'cancelled' ? 'danger' : 'success'
   const statusText = (st: AttendanceSession['status']) => st === 'completed' ? 'Đã hoàn tất' : st === 'cancelled' ? 'Đã hủy' : 'Đang mở'
 
@@ -209,7 +224,7 @@ export function ScheduleCalendar() {
       <PageHeader
         title="Lịch sinh hoạt"
         subtitle="Quản lý lịch chơi và đăng ký của CLB"
-        actions={<ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
+        actions={isMember ? undefined : <ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
       />
 
       {sessions.length === 0 ? (
@@ -217,7 +232,7 @@ export function ScheduleCalendar() {
           icon={<CalendarDays size={24} />}
           title="Chưa có buổi chơi"
           description="Tạo buổi chơi ở mục Điểm Danh để hiển thị trên lịch."
-          action={<ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
+          action={isMember ? undefined : <ActionButton icon={<Plus size={16} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
         />
       ) : (
         <div className="flex flex-col gap-5">
@@ -341,7 +356,7 @@ export function ScheduleCalendar() {
                     <CalendarDays size={22} className="[color:var(--pf-primary)]" />
                   </div>
                   <p className="text-sm font-medium [color:var(--pf-text)]">Không có buổi chơi trong ngày này</p>
-                  <ActionButton icon={<Plus size={15} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>
+                  {!isMember && <ActionButton icon={<Plus size={15} />} onClick={() => navigate('/attendance')}>Tạo buổi chơi</ActionButton>}
                 </div>
               ) : (
                 <div className="flex flex-col gap-3">
@@ -399,26 +414,46 @@ export function ScheduleCalendar() {
 
                         {/* Nút chính */}
                         <div className="mt-3 flex gap-2">
-                          <button onClick={() => navigate('/check-in')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)]">
-                            <UserCheck size={14} />Điểm danh
-                          </button>
-                          <button onClick={() => navigate('/session-registration')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]">
-                            <CalendarPlus size={14} />Đăng ký
-                          </button>
+                          {!isMember && (
+                            <button onClick={() => navigate('/check-in')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)]">
+                              <UserCheck size={14} />Điểm danh
+                            </button>
+                          )}
+                          {isMember ? (
+                            (() => {
+                              const myReg = (info?.members ?? []).some((m) => m.memberId === user?.memberId && m.registered)
+                              return (
+                                <button onClick={() => handleMemberToggle(s)} className={cn(
+                                  'inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold',
+                                  myReg
+                                    ? 'border [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]'
+                                    : 'text-white [background:var(--pf-primary)] hover:[background:var(--pf-primary-hover)]',
+                                )}>
+                                  <CalendarPlus size={14} />{myReg ? 'Hủy đăng ký' : 'Đăng ký'}
+                                </button>
+                              )
+                            })()
+                          ) : (
+                            <button onClick={() => navigate('/session-registration')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold [border-color:var(--pf-border)] [color:var(--pf-text)] hover:[background:var(--pf-surface-muted)]">
+                              <CalendarPlus size={14} />Đăng ký
+                            </button>
+                          )}
                         </div>
 
-                        {/* Thao tác nhanh */}
-                        <div className="mt-2 flex items-center gap-1 border-t pt-2 [border-color:var(--pf-border)]">
-                          <button onClick={() => navigate('/attendance')} aria-label="Chỉnh sửa buổi" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-text)]">
-                            <Pencil size={12} />Sửa
-                          </button>
-                          <button onClick={() => handleCopy(s)} aria-label="Sao chép buổi" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-text)]">
-                            <Copy size={12} />Sao chép
-                          </button>
-                          <button onClick={() => setConfirmDel(s)} aria-label="Xóa buổi" className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]">
-                            <Trash2 size={12} />Xóa
-                          </button>
-                        </div>
+                        {/* Thao tác nhanh (chỉ admin) */}
+                        {!isMember && (
+                          <div className="mt-2 flex items-center gap-1 border-t pt-2 [border-color:var(--pf-border)]">
+                            <button onClick={() => navigate('/attendance')} aria-label="Chỉnh sửa buổi" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-text)]">
+                              <Pencil size={12} />Sửa
+                            </button>
+                            <button onClick={() => handleCopy(s)} aria-label="Sao chép buổi" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-muted)] hover:[background:var(--pf-surface-muted)] hover:[color:var(--pf-text)]">
+                              <Copy size={12} />Sao chép
+                            </button>
+                            <button onClick={() => setConfirmDel(s)} aria-label="Xóa buổi" className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium [color:var(--pf-color-danger)] hover:[background:var(--pf-color-danger-soft)]">
+                              <Trash2 size={12} />Xóa
+                            </button>
+                          </div>
+                        )}
                       </div>
                     )
                   })}
diff --git a/frontend/src/pages/admin/SessionRegistration.tsx b/frontend/src/pages/admin/SessionRegistration.tsx
index 71961e40..5a3a8842 100644
--- a/frontend/src/pages/admin/SessionRegistration.tsx
+++ b/frontend/src/pages/admin/SessionRegistration.tsx
@@ -26,7 +26,10 @@ function fmtSession(dateIso: string, courtName?: string, startTime?: string): st
 }
 
 export function SessionRegistration() {
-  const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
+  const user = useAuthStore((s) => s.user)
+  const clubId = user?.clubId ?? ''
+  const isMember = user?.role === 'MEMBER_VIEW'
+  const myMemberId = user?.memberId
   const { sessions } = useClubDataStore((s) => s.getClubData(clubId))
 
   const upcoming = useMemo(() => {
@@ -77,6 +80,23 @@ export function SessionRegistration() {
       return next
     })
 
+  // Member self-scope: chỉ toggle CHÍNH mình, lưu ngay qua PUT /member/me/sessions/:id/registration.
+  const memberToggleSelf = async () => {
+    if (!sessionId || !myMemberId || saving) return
+    const register = !selected.has(myMemberId)
+    setSaving(true)
+    try {
+      await api.put(`/member/me/sessions/${sessionId}/registration`, { register })
+      toggle(myMemberId)
+      setRows((rs) => rs.map((r) => (r.memberId === myMemberId ? { ...r, registered: register } : r)))
+      toast.success(register ? 'Đã đăng ký buổi chơi' : 'Đã hủy đăng ký')
+    } catch {
+      toast.error('Cập nhật đăng ký thất bại. Vui lòng thử lại.')
+    } finally {
+      setSaving(false)
+    }
+  }
+
   const save = async () => {
     if (!sessionId) return
     setSaving(true)
@@ -99,7 +119,7 @@ export function SessionRegistration() {
         title="Đăng ký buổi chơi"
         subtitle="Chọn buổi sắp tới và đánh dấu thành viên tham gia"
         actions={
-          sessionId && rows.length > 0 ? (
+          !isMember && sessionId && rows.length > 0 ? (
             <ActionButton icon={<Save size={16} />} onClick={save} disabled={saving}>
               {saving ? 'Đang lưu…' : 'Lưu đăng ký'}
             </ActionButton>
@@ -150,12 +170,15 @@ export function SessionRegistration() {
               <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                 {rows.map((r) => {
                   const on = selected.has(r.memberId)
+                  const isSelf = r.memberId === myMemberId
+                  const disabled = isMember && !isSelf
                   return (
                     <button
                       key={r.memberId}
-                      onClick={() => toggle(r.memberId)}
+                      onClick={() => (isMember ? (isSelf ? void memberToggleSelf() : undefined) : toggle(r.memberId))}
                       aria-pressed={on}
-                      className="flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors"
+                      disabled={disabled}
+                      className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
                       style={{
                         background: on ? 'var(--pf-primary-soft)' : 'var(--pf-surface)',
                         borderColor: on ? 'var(--pf-primary)' : 'var(--pf-border)',
diff --git a/frontend/src/pages/admin/minigame/MinigameList.tsx b/frontend/src/pages/admin/minigame/MinigameList.tsx
index 3191a142..a799fb55 100644
--- a/frontend/src/pages/admin/minigame/MinigameList.tsx
+++ b/frontend/src/pages/admin/minigame/MinigameList.tsx
@@ -13,11 +13,13 @@ import { useCallback, useEffect, useRef, useState } from 'react'
 import { useNavigate } from 'react-router-dom'
 import {
   Plus, Eye, Edit2, Trash2, Trophy, Users, Activity, CheckCircle2,
-  PlayCircle, AlertCircle, RefreshCw,
+  PlayCircle, AlertCircle, RefreshCw, UserCheck, Check,
 } from 'lucide-react'
 import api from '../../../lib/api'
 import { useMinigameStore } from '../../../store/minigameStore'
 import { useAuthStore } from '../../../store/authStore'
+import { useClubDataStore } from '../../../store/clubDataStore'
+import { useMinigameDelegate } from '../../../hooks/useMinigameDelegate'
 import type { MinigameStatus, MiniGame } from '../../../types/minigame'
 import { useIsMobile } from '../../../hooks/useIsMobile'
 import toast from 'react-hot-toast'
@@ -78,6 +80,41 @@ export function MinigameList() {
   const { getMinigames, deleteMinigame, setMinigamesFromApi, participants, groups, matches } = useMinigameStore()
   const minigames = getMinigames(clubId)
   const isMobile = useIsMobile()
+  const { canManage } = useMinigameDelegate()
+  const isClubAdmin = user?.role === 'CLUB_ADMIN'
+  const activeMembers = useClubDataStore((s) => s.getClubData(clubId).members).filter((m) => m.status === 'active')
+
+  /* ── Ủy quyền minigame (CLUB_ADMIN) ── */
+  const [showDelegateModal, setShowDelegateModal] = useState(false)
+  const [delegateIds, setDelegateIds] = useState<Set<string>>(new Set())
+  const [delegateSaving, setDelegateSaving] = useState(false)
+
+  const openDelegateModal = async () => {
+    setShowDelegateModal(true)
+    try {
+      const res = await api.get('/clubs/me/minigame-delegates')
+      setDelegateIds(new Set((res.data?.data ?? []) as string[]))
+    } catch { /* giữ danh sách rỗng */ }
+  }
+  const toggleDelegate = (memberId: string) =>
+    setDelegateIds((prev) => {
+      const next = new Set(prev)
+      if (next.has(memberId)) next.delete(memberId)
+      else next.add(memberId)
+      return next
+    })
+  const saveDelegates = async () => {
+    setDelegateSaving(true)
+    try {
+      await api.patch('/clubs/me/minigame-delegates', { memberIds: [...delegateIds] })
+      toast.success('Đã cập nhật ủy quyền')
+      setShowDelegateModal(false)
+    } catch (err: any) {
+      toast.error(err?.response?.data?.message ?? 'Cập nhật ủy quyền thất bại')
+    } finally {
+      setDelegateSaving(false)
+    }
+  }
 
   const [search, setSearch] = useState('')
   const [modeTab, setModeTab] = useState<ModeTab>('all')
@@ -170,7 +207,14 @@ export function MinigameList() {
   )
 
   const headerActions = (
-    <ActionButton icon={<Plus size={16} />} onClick={() => navigate('/minigames/new')}>Tạo minigame</ActionButton>
+    <div className="flex items-center gap-2">
+      {isClubAdmin && (
+        <ActionButton variant="secondary" icon={<UserCheck size={16} />} onClick={() => void openDelegateModal()}>Ủy quyền</ActionButton>
+      )}
+      {canManage && (
+        <ActionButton icon={<Plus size={16} />} onClick={() => navigate('/minigames/new')}>Tạo minigame</ActionButton>
+      )}
+    </div>
   )
 
   /* ── Progress bar (completion) ── */
@@ -186,8 +230,8 @@ export function MinigameList() {
   const RowActions = ({ r }: { r: TourRow }) => (
     <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
       <IconBtn label="Xem chi tiết" onClick={() => navigate(`/minigames/${r.mg.id}`)}><Eye size={15} /></IconBtn>
-      <IconBtn label="Chỉnh sửa" onClick={() => navigate(`/minigames/${r.mg.id}/edit`)}><Edit2 size={15} /></IconBtn>
-      <IconBtn label="Hủy giải đấu" danger onClick={() => handleDelete(r.mg.id, r.mg.name)}><Trash2 size={15} /></IconBtn>
+      {canManage && <IconBtn label="Chỉnh sửa" onClick={() => navigate(`/minigames/${r.mg.id}/edit`)}><Edit2 size={15} /></IconBtn>}
+      {canManage && <IconBtn label="Hủy giải đấu" danger onClick={() => handleDelete(r.mg.id, r.mg.name)}><Trash2 size={15} /></IconBtn>}
     </div>
   )
 
@@ -274,7 +318,7 @@ export function MinigameList() {
               ) : (
                 <EmptyState icon={<Trophy size={26} />} title="Chưa có giải đấu nào"
                   description="Tạo giải đấu / minigame đầu tiên cho câu lạc bộ."
-                  action={<ActionButton icon={<Plus size={15} />} onClick={() => navigate('/minigames/new')}>Tạo minigame</ActionButton>} />
+                  action={canManage ? <ActionButton icon={<Plus size={15} />} onClick={() => navigate('/minigames/new')}>Tạo minigame</ActionButton> : undefined} />
               )
             ) : isMobile ? (
               <div className="p-3">
@@ -306,7 +350,7 @@ export function MinigameList() {
           </div>
 
           {/* ── Mobile sticky quick action: Tạo minigame ── */}
-          {isMobile && (
+          {isMobile && canManage && (
             <div className="pointer-events-none fixed right-4 z-30" style={{ bottom: 'calc(132px + env(safe-area-inset-bottom))' }}>
               <ActionButton className="pointer-events-auto h-12 w-12 shadow-lg" iconOnly ariaLabel="Tạo minigame" icon={<Plus size={20} />} onClick={() => navigate('/minigames/new')} />
             </div>
@@ -314,6 +358,53 @@ export function MinigameList() {
         </>
       )}
 
+      {/* ── Modal ủy quyền minigame (CLUB_ADMIN) ── */}
+      {isClubAdmin && showDelegateModal && (
+        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
+          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDelegateModal(false)} />
+          <div role="dialog" aria-modal="true" aria-label="Ủy quyền quản lý minigame" className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white [box-shadow:var(--pf-shadow)]">
+            <div className="flex items-center justify-between border-b px-5 py-4 border-[color:var(--pf-border)]">
+              <h2 className="flex items-center gap-2 text-base font-semibold [color:var(--pf-text)]">
+                <UserCheck size={18} className="[color:var(--pf-primary)]" />Ủy quyền quản lý minigame
+              </h2>
+              <button onClick={() => setShowDelegateModal(false)} aria-label="Đóng" className="flex h-9 w-9 items-center justify-center rounded-xl text-lg [color:var(--pf-color-muted)]"><span aria-hidden>✕</span></button>
+            </div>
+            <div className="flex-1 overflow-y-auto px-5 py-4">
+              <p className="mb-3 text-xs [color:var(--pf-color-muted)]">Thành viên được chọn có thể tạo và quản lý minigame như admin.</p>
+              {activeMembers.length === 0 ? (
+                <p className="py-6 text-center text-sm [color:var(--pf-color-muted)]">Chưa có thành viên hoạt động</p>
+              ) : (
+                <div className="flex flex-col gap-1.5">
+                  {activeMembers.map((m) => {
+                    const on = delegateIds.has(m.id)
+                    return (
+                      <button key={m.id} onClick={() => toggleDelegate(m.id)} aria-pressed={on}
+                        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors"
+                        style={{
+                          background: on ? 'var(--pf-primary-soft)' : 'var(--pf-surface)',
+                          borderColor: on ? 'var(--pf-primary)' : 'var(--pf-border)',
+                        }}>
+                        <span className="truncate text-sm font-medium [color:var(--pf-text)]">{m.fullName}</span>
+                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
+                          style={on
+                            ? { background: 'var(--pf-primary)', color: 'var(--pf-primary-on)', borderColor: 'var(--pf-primary)' }
+                            : { borderColor: 'var(--pf-border)', color: 'transparent' }}>
+                          <Check size={14} />
+                        </span>
+                      </button>
+                    )
+                  })}
+                </div>
+              )}
+            </div>
+            <div className="flex items-center gap-3 border-t px-5 py-4 border-[color:var(--pf-border)]">
+              <ActionButton variant="secondary" fullWidth onClick={() => setShowDelegateModal(false)}>Hủy</ActionButton>
+              <ActionButton fullWidth onClick={() => void saveDelegates()} disabled={delegateSaving}>{delegateSaving ? 'Đang lưu…' : 'Lưu'}</ActionButton>
+            </div>
+          </div>
+        </div>
+      )}
+
       {/* ── Mobile filter bottom sheet ── */}
       {showFilterSheet && (
         <div className="fixed inset-0 z-50 flex items-end">

````

## 3c75bf91 — fix(members): tạo thành viên không cần email — bỏ clubId khỏi body + '' coi như bỏ trống

````diff
diff --git a/backend/src/members/members.dto.ts b/backend/src/members/members.dto.ts
index c2ef8e69..2f2c5b5e 100644
--- a/backend/src/members/members.dto.ts
+++ b/backend/src/members/members.dto.ts
@@ -6,6 +6,11 @@ import {
   IsNotEmpty,
   MaxLength,
 } from 'class-validator';
+import { Transform } from 'class-transformer';
+
+/** Form gửi chuỗi rỗng cho field không bắt buộc → coi như bỏ trống (tránh fail @IsEmail trên ''). */
+const emptyToUndefined = ({ value }: { value: unknown }) =>
+  typeof value === 'string' && value.trim() === '' ? undefined : value;
 
 export class CreateMemberDto {
   @IsString()
@@ -18,6 +23,7 @@ export class CreateMemberDto {
   @MaxLength(20)
   phone?: string;
 
+  @Transform(emptyToUndefined)
   @IsOptional()
   @IsEmail()
   email?: string;
@@ -43,6 +49,7 @@ export class UpdateMemberDto {
   @MaxLength(20)
   phone?: string;
 
+  @Transform(emptyToUndefined)
   @IsOptional()
   @IsEmail()
   email?: string;
diff --git a/frontend/src/pages/admin/Members.tsx b/frontend/src/pages/admin/Members.tsx
index ccbed9b2..cef6f621 100644
--- a/frontend/src/pages/admin/Members.tsx
+++ b/frontend/src/pages/admin/Members.tsx
@@ -472,15 +472,24 @@ export function Members() {
 
   const handleSave = async (form: typeof emptyForm) => {
     setIsSaving(true)
+    // KHÔNG gửi clubId (backend lấy từ JWT, DTO cấm field lạ); field optional rỗng → bỏ khỏi payload
+    // để không vướng @IsEmail/@IsString trên chuỗi rỗng.
+    const payload = {
+      fullName: form.fullName,
+      joinDate: form.joinDate,
+      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
+      ...(form.email.trim() ? { email: form.email.trim() } : {}),
+      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
+    }
     try {
       if (editMember) {
-        const res = await api.put(`/members/${editMember.id}`, form)
+        const res = await api.put(`/members/${editMember.id}`, payload)
         const updated = res.data?.data ?? { ...editMember, ...form }
         setMembers(prev => prev.map(m => m.id === editMember.id ? { ...m, ...updated } : m))
         closeForm()
         toast.success('Cập nhật thành viên thành công!')
       } else {
-        const res = await api.post('/members', { ...form, clubId })
+        const res = await api.post('/members', payload)
         const created = res.data?.data
         setMembers(prev => [...prev, { ...created }])
         closeForm()

````

## 5e71927c — fix(v2.2): FinanceDashboard graceful state + confirm dialog khóa user

````diff
diff --git a/frontend/src/pages/admin/FinanceDashboard.tsx b/frontend/src/pages/admin/FinanceDashboard.tsx
index 2c74da47..6518852b 100644
--- a/frontend/src/pages/admin/FinanceDashboard.tsx
+++ b/frontend/src/pages/admin/FinanceDashboard.tsx
@@ -32,6 +32,9 @@ interface Summary {
 }
 
 const num = (v: unknown): number => (v == null ? 0 : Number(v) || 0)
+function isLocalToken(token?: string | null) {
+  return !!token && (token.startsWith('local-token-') || token.startsWith('token-'))
+}
 const CHART_INCOME = '#059669' // --pf-green (tiền)
 const CHART_EXPENSE = '#E11D48' // --pf-accent-rose (chi)
 const DONUT_COMMON = '#059669' // Quỹ Chính
@@ -39,6 +42,7 @@ const DONUT_MINI = '#7C3AED' // Quỹ Phụ
 
 export function FinanceDashboard() {
   const clubId = useAuthStore((s) => s.user?.clubId) ?? ''
+  const accessToken = useAuthStore((s) => s.accessToken)
   const { fundPeriods } = useClubDataStore((s) => s.getClubData(clubId))
   const activePeriod = useMemo(
     () => fundPeriods.find((p) => p.status === 'active') ?? null,
@@ -50,6 +54,14 @@ export function FinanceDashboard() {
   const [error, setError] = useState(false)
 
   const load = useCallback(async (periodId: string) => {
+    // Đồng bộ pattern với Reports.tsx/ThuChiHub.tsx/Debts.tsx: token demo/local thì
+    // không gọi API thật (không có backend tương ứng) — tránh treo ErrorState vô ích.
+    if (isLocalToken(accessToken)) {
+      setSummary(null)
+      setError(false)
+      setLoading(false)
+      return
+    }
     setLoading(true)
     setError(false)
     try {
@@ -72,7 +84,7 @@ export function FinanceDashboard() {
     } finally {
       setLoading(false)
     }
-  }, [])
+  }, [accessToken])
 
   useEffect(() => {
     if (activePeriod) void load(activePeriod.id)
@@ -188,7 +200,9 @@ export function FinanceDashboard() {
             </ChartCard>
           </div>
         </div>
-      ) : null}
+      ) : (
+        <EmptyState icon={<Wallet size={24} />} title="Chưa có dữ liệu" description="Không tải được số liệu tài chính cho kỳ quỹ này." />
+      )}
     </PageShell>
   )
 }
diff --git a/frontend/src/pages/super/SuperUsers.tsx b/frontend/src/pages/super/SuperUsers.tsx
index 4e1c4a67..8e544d84 100644
--- a/frontend/src/pages/super/SuperUsers.tsx
+++ b/frontend/src/pages/super/SuperUsers.tsx
@@ -3,6 +3,7 @@ import { Search, UserCheck, UserX, Shield, Users } from 'lucide-react'
 import api from '../../lib/api'
 import { PageHeader } from '../../components/layout/PageHeader'
 import { Badge } from '../../components/ui/Badge'
+import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
 import type { Role } from '../../types'
 import toast from 'react-hot-toast'
 
@@ -27,6 +28,8 @@ export function SuperUsers() {
   const [users, setUsers] = useState<UserRow[]>([])
   const [search, setSearch] = useState('')
   const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')
+  const [pendingToggle, setPendingToggle] = useState<UserRow | null>(null)
+  const [toggling, setToggling] = useState(false)
 
   useEffect(() => {
     api.get('/users').then(res => {
@@ -45,12 +48,16 @@ export function SuperUsers() {
 
   const toggleActive = async (u: UserRow) => {
     const next = !u.isActive
+    setToggling(true)
     try {
       await api.put(`/users/${u.id}`, { isActive: next })
       setUsers(prev => prev.map(x => x.id === u.id ? { ...x, isActive: next } : x))
       toast.success(`${next ? 'Mở khóa' : 'Khóa'} tài khoản ${u.username}`)
     } catch {
       toast.error('Thao tác thất bại')
+    } finally {
+      setToggling(false)
+      setPendingToggle(null)
     }
   }
 
@@ -153,7 +160,7 @@ export function SuperUsers() {
                   </td>
                   <td className="text-center">
                     <button
-                      onClick={() => toggleActive(u)}
+                      onClick={() => setPendingToggle(u)}
                       disabled={u.role === 'SUPER_ADMIN'}
                       className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                         ${u.isActive
@@ -177,6 +184,21 @@ export function SuperUsers() {
           </table>
         </div>
       </div>
+
+      <ConfirmDialog
+        open={!!pendingToggle}
+        variant={pendingToggle?.isActive ? 'danger' : 'warning'}
+        title={pendingToggle?.isActive ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
+        message={
+          pendingToggle?.isActive
+            ? `Khóa tài khoản "${pendingToggle?.username}"? Người dùng này sẽ không thể đăng nhập cho tới khi được mở khóa lại.`
+            : `Mở khóa tài khoản "${pendingToggle?.username}"?`
+        }
+        confirmLabel={toggling ? 'Đang xử lý...' : (pendingToggle?.isActive ? 'Khóa' : 'Mở khóa')}
+        cancelLabel="Hủy bỏ"
+        onCancel={() => setPendingToggle(null)}
+        onConfirm={() => pendingToggle && toggleActive(pendingToggle)}
+      />
     </div>
   )
 }

````

## c02e7c7f — feat(fund-periods): đồng bộ 'sao chép thành viên kỳ trước' sang Tạo Quỹ Chính

````diff
diff --git a/frontend/src/pages/admin/FundPeriods.tsx b/frontend/src/pages/admin/FundPeriods.tsx
index d2e03be1..5cf575f8 100644
--- a/frontend/src/pages/admin/FundPeriods.tsx
+++ b/frontend/src/pages/admin/FundPeriods.tsx
@@ -78,10 +78,13 @@ export function FundPeriods() {
   const [editingGame, setEditingGame] = useState<FundPeriod | null>(null)
   const [viewPeriod, setViewPeriod] = useState<FundPeriod | null>(null)
 
-  // FUND-IMPL-01: thông tin kỳ Quỹ Phụ gần nhất để hiển thị block "sao chép thành viên"
-  // trong modal Tạo Quỹ Phụ. undefined = đang tải, null = không có kỳ trước / lỗi tải.
+  // FUND-IMPL-01: thông tin kỳ gần nhất để hiển thị block "sao chép thành viên"
+  // trong modal Tạo Quỹ. undefined = đang tải, null = không có kỳ trước / lỗi tải.
+  // Áp dụng cho CẢ Quỹ Chính (chung) lẫn Quỹ Phụ (game) — nghiệp vụ giống nhau.
   const [prevGamePeriod, setPrevGamePeriod] = useState<PreviousPeriodInfo | null | undefined>(undefined)
   const [prevGamePeriodError, setPrevGamePeriodError] = useState(false)
+  const [prevChungPeriod, setPrevChungPeriod] = useState<PreviousPeriodInfo | null | undefined>(undefined)
+  const [prevChungPeriodError, setPrevChungPeriodError] = useState(false)
 
   useEffect(() => {
     if (!showCreateGame || editingGame) return
@@ -104,6 +107,26 @@ export function FundPeriods() {
     return () => { cancelled = true }
   }, [showCreateGame, editingGame])
 
+  useEffect(() => {
+    if (!showCreateChung || editingChung) return
+    let cancelled = false
+    setPrevChungPeriod(undefined)
+    setPrevChungPeriodError(false)
+    api.get('/fund-periods/previous', { params: { type: 'chung' } }).then(res => {
+      if (cancelled) return
+      const info = res.data?.data as PreviousPeriodInfo | null
+      setPrevChungPeriod(info)
+      if (info && info.memberCount > 0) {
+        setFormChung(f => ({ ...f, copyMembersFromPreviousPeriod: true }))
+      }
+    }).catch(() => {
+      if (cancelled) return
+      setPrevChungPeriod(null)
+      setPrevChungPeriodError(true)
+    })
+    return () => { cancelled = true }
+  }, [showCreateChung, editingChung])
+
   const openEdit = (p: FundPeriod) => {
     const form = periodToForm(p)
     if ((p.type ?? 'chung') === 'chung') {
@@ -1163,6 +1186,9 @@ export function FundPeriods() {
         editing={!!editingChung}
         isSaving={isSaving}
         onSubmit={handleSave('chung', formChung, editingChung, () => { setShowCreateChung(false); setEditingChung(null); setFormChung({ ...emptyForm }) })}
+        showCopyMembers
+        prevPeriodInfo={prevChungPeriod}
+        prevPeriodError={prevChungPeriodError}
       />
 
       {/* Quỹ Phụ modal (create or edit) */}
@@ -1938,7 +1964,7 @@ function FundModal({ open, onClose, title, subtitle, formId, form, setForm, onSu
             {!prevPeriodError && prevPeriodInfo && prevPeriodInfo.memberCount > 0 && form.copyMembersFromPreviousPeriod && (
               <div className="mt-2.5 space-y-2.5">
                 <p className="text-xs text-slate-600">
-                  Hệ thống sẽ sao chép danh sách thành viên từ kỳ quỹ gần nhất của Quỹ Phụ này.
+                  Hệ thống sẽ sao chép danh sách thành viên từ kỳ quỹ gần nhất cùng loại.
                 </p>
                 <div className="rounded-[12px] border p-3 [background:var(--pf-surface)] [border-color:var(--pf-primary-soft)] space-y-1">
                   <p className="text-[11px] font-[600] uppercase tracking-wide [color:var(--pf-color-muted)]">Kỳ quỹ gần nhất</p>

````

## 790fdb92 — fix(fund-periods): nối copy-member cho modal mobile Tạo Quỹ Chính

````diff
diff --git a/frontend/src/pages/admin/FundPeriods.tsx b/frontend/src/pages/admin/FundPeriods.tsx
index 5cf575f8..76a30b71 100644
--- a/frontend/src/pages/admin/FundPeriods.tsx
+++ b/frontend/src/pages/admin/FundPeriods.tsx
@@ -763,6 +763,9 @@ export function FundPeriods() {
           onSubmit={handleSave('chung', formChung, editingChung, () => { setShowCreateChung(false); setEditingChung(null) })}
           editing={!!editingChung}
           isSaving={isSaving}
+          showCopyMembers
+          prevPeriodInfo={prevChungPeriod}
+          prevPeriodError={prevChungPeriodError}
         />
         <FundModal
           open={showCreateGame}

````

## 532e20fd — fix(v2.2): đồng bộ nút xuất PDF/Excel + Tạo phiếu thu trên mobile

````diff
diff --git a/frontend/src/pages/admin/Contributions.tsx b/frontend/src/pages/admin/Contributions.tsx
index d7401b62..8cffb72f 100644
--- a/frontend/src/pages/admin/Contributions.tsx
+++ b/frontend/src/pages/admin/Contributions.tsx
@@ -243,13 +243,22 @@ export function Contributions() {
           </div>
           <div className="flex items-center gap-2">
             {contributions.length > 0 && (
-              <button
-                onClick={() => exportContribExcel(activePeriod?.name ?? 'ThuQuy', contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })))}
-                aria-label="Xuất Excel"
-                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
-              >
-                <FileSpreadsheet size={16} />
-              </button>
+              <>
+                <button
+                  onClick={() => exportContribExcel(activePeriod?.name ?? 'ThuQuy', contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })))}
+                  aria-label="Xuất Excel"
+                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
+                >
+                  <FileSpreadsheet size={16} />
+                </button>
+                <button
+                  onClick={() => exportContribPDF(activePeriod?.name ?? 'Thu Quỹ', contributions.map(c => ({ member: c.member?.fullName ?? c.payerName ?? '', date: formatDate(c.paymentDate), amount: c.amount, method: c.paymentMethod, confirmed: c.isConfirmed })), commonTotal + miniTotal)}
+                  aria-label="Xuất PDF"
+                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
+                >
+                  <FileText size={16} />
+                </button>
+              </>
             )}
             <button
               onClick={openCreate}
diff --git a/frontend/src/pages/admin/FundPeriods.tsx b/frontend/src/pages/admin/FundPeriods.tsx
index 76a30b71..b9339d25 100644
--- a/frontend/src/pages/admin/FundPeriods.tsx
+++ b/frontend/src/pages/admin/FundPeriods.tsx
@@ -599,8 +599,10 @@ export function FundPeriods() {
                         <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-emerald-600 border border-emerald-200 active:bg-emerald-50 flex items-center justify-center gap-1"
                           onClick={() => handleSetStatus(p, 'active')}><LockOpen size={13} />Mở lại</button>
                       )}
+                      <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] active:[background:var(--pf-primary-soft)]"
+                        onClick={() => handleGenerateReceipts(p.id)} aria-label="Tạo phiếu thu"><FileText size={13} /></button>
                       <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-red-500 border border-red-200 active:bg-red-50"
-                        onClick={() => handleDelete(p)}><Trash2 size={13} /></button>
+                        onClick={() => handleDelete(p)} aria-label="Xóa"><Trash2 size={13} /></button>
                     </div>
                   </div>
                 ))}
@@ -643,8 +645,10 @@ export function FundPeriods() {
                         <button className="flex-1 py-1.5 rounded-[10px] text-[13px] font-[600] text-emerald-600 border border-emerald-200 active:bg-emerald-50 flex items-center justify-center gap-1"
                           onClick={() => handleSetStatus(p, 'active')}><LockOpen size={13} />Mở lại</button>
                       )}
+                      <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] [color:var(--pf-primary)] border [border-color:var(--pf-primary-soft)] active:[background:var(--pf-primary-soft)]"
+                        onClick={() => handleGenerateReceipts(p.id)} aria-label="Tạo phiếu thu"><FileText size={13} /></button>
                       <button className="px-3 py-1.5 rounded-[10px] text-[13px] font-[600] text-red-500 border border-red-200 active:bg-red-50"
-                        onClick={() => handleDelete(p)}><Trash2 size={13} /></button>
+                        onClick={() => handleDelete(p)} aria-label="Xóa"><Trash2 size={13} /></button>
                     </div>
                   </div>
                 ))}
diff --git a/frontend/src/pages/admin/minigame/StandingsPage.tsx b/frontend/src/pages/admin/minigame/StandingsPage.tsx
index b03025fe..ae85896f 100644
--- a/frontend/src/pages/admin/minigame/StandingsPage.tsx
+++ b/frontend/src/pages/admin/minigame/StandingsPage.tsx
@@ -85,6 +85,9 @@ export function StandingsPage() {
             <button onClick={doExportPng} aria-label="Tải ảnh" className="flex h-9 w-9 items-center justify-center rounded-xl [background:var(--pf-primary-soft)] [color:var(--pf-primary)] active:opacity-70">
               <ImageIcon size={16} />
             </button>
+            <button onClick={doExportPdf} aria-label="Xuất PDF" className="flex h-9 w-9 items-center justify-center rounded-xl [background:var(--pf-primary-soft)] [color:var(--pf-primary)] active:opacity-70">
+              <FileText size={16} />
+            </button>
             {canShare() && (
               <button onClick={doShare} aria-label="Chia sẻ" className="flex h-9 w-9 items-center justify-center rounded-xl text-white [background:var(--pf-primary)] active:opacity-70">
                 <Share2 size={16} />
diff --git a/frontend/src/pages/treasurer/TreasurerIncome.tsx b/frontend/src/pages/treasurer/TreasurerIncome.tsx
index 20e214bf..e8c810b8 100644
--- a/frontend/src/pages/treasurer/TreasurerIncome.tsx
+++ b/frontend/src/pages/treasurer/TreasurerIncome.tsx
@@ -251,6 +251,12 @@ export function TreasurerIncome() {
                 <CheckCircle size={11} />{isBulkConfirming ? '…' : `XN tất cả (${unconfirmedIds.length})`}
               </button>
             )}
+            {contributions.length > 0 && (
+              <button onClick={exportExcel} aria-label="Xuất Excel"
+                className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-slate-100 text-slate-600 active:bg-slate-200">
+                <Download size={14} />
+              </button>
+            )}
             <button onClick={openCreate}
               className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[12px] font-[700] [background:var(--pf-primary)] text-white active:opacity-80">
               <Plus size={13} />Ghi nhận

````

## b4574e2a — fix(test): sửa 2 spec backend lỗi tsc (ai.controller + hermes-workflow)

````diff
diff --git a/backend/src/ai/ai.controller.spec.ts b/backend/src/ai/ai.controller.spec.ts
index 30096c0d..81038ec5 100644
--- a/backend/src/ai/ai.controller.spec.ts
+++ b/backend/src/ai/ai.controller.spec.ts
@@ -21,7 +21,11 @@ describe('AiController — POST /ai/chat', () => {
       chat: jest.fn(),
       getHealthStatus: jest.fn(),
     };
-    controller = new AiController(service, gateway as any);
+    const tokenAccounting = {
+      getUsageSummary: jest.fn(),
+      recordUsage: jest.fn(),
+    } as any;
+    controller = new AiController(service, gateway as any, tokenAccounting);
   });
 
   it('routes a chat request through the gateway and wraps the response', async () => {
diff --git a/backend/src/workflows/hermes-workflow.service.spec.ts b/backend/src/workflows/hermes-workflow.service.spec.ts
index fef10b02..fa570c6e 100644
--- a/backend/src/workflows/hermes-workflow.service.spec.ts
+++ b/backend/src/workflows/hermes-workflow.service.spec.ts
@@ -144,7 +144,7 @@ describe('HermesWorkflowService', () => {
       const run = await service.testTrigger('r1', 'club-1', ACTOR, {
         unpaidCount: 5,
       });
-      expect(run.status).toBe('CANCELLED');
+      expect(run).toMatchObject({ status: 'CANCELLED' });
       expect(aiActions.create).not.toHaveBeenCalled();
     });
 
@@ -153,7 +153,7 @@ describe('HermesWorkflowService', () => {
       const run = await service.testTrigger('r1', 'club-1', ACTOR, {
         unpaidCount: 0,
       });
-      expect(run.status).toBe('COMPLETED');
+      expect(run).toMatchObject({ status: 'COMPLETED' });
       expect(aiActions.create).not.toHaveBeenCalled();
     });
 
@@ -167,7 +167,7 @@ describe('HermesWorkflowService', () => {
         requestedByAi: 'HERMES',
       });
       expect(aiActions.create).toHaveBeenCalledWith('club-1', 'u1', createArg);
-      expect(run.status).toBe('WAITING_APPROVAL');
+      expect(run).toMatchObject({ status: 'WAITING_APPROVAL' });
     });
 
     it('điều kiện lỗi (op không hỗ trợ) → FAILED an toàn, không ném ra ngoài', async () => {
@@ -176,7 +176,7 @@ describe('HermesWorkflowService', () => {
         conditionsJson: { field: 'x', op: 'BOGUS', value: 1 },
       });
       const run = await service.testTrigger('r1', 'club-1', ACTOR, { x: 1 });
-      expect(run.status).toBe('FAILED');
+      expect(run).toMatchObject({ status: 'FAILED' });
       expect(aiActions.create).not.toHaveBeenCalled();
     });
 
@@ -188,7 +188,7 @@ describe('HermesWorkflowService', () => {
       const run = await service.testTrigger('r1', 'club-1', ACTOR, {
         unpaidCount: 2,
       });
-      expect(run.status).toBe('COMPLETED');
+      expect(run).toMatchObject({ status: 'COMPLETED' });
       expect(aiActions.create).not.toHaveBeenCalled();
     });
   });
@@ -254,7 +254,7 @@ describe('HermesWorkflowService', () => {
       const run = (await service.testTrigger('r1', 'club-1', ACTOR, {
         x: 1,
       })) as Record<string, unknown>;
-      expect(run.status).toBe('FAILED');
+      expect(run).toMatchObject({ status: 'FAILED' });
       expect(run.errorMessage).toBe('Workflow thất bại. Xem log máy chủ.');
       expect(String(run.errorMessage)).not.toContain('BOGUS_SECRET_OP');
     });

````

## 0e79befd — chore(v2.2): xóa dead code mockFundSummary khỏi mockData

````diff
diff --git a/frontend/src/lib/mockData.ts b/frontend/src/lib/mockData.ts
index 9e4fcf07..3374ca6d 100644
--- a/frontend/src/lib/mockData.ts
+++ b/frontend/src/lib/mockData.ts
@@ -1,4 +1,4 @@
-import type { Club, Member, FundPeriod, AttendanceSession, FundContribution, LivingExpense, FundPeriodSummary, SuperAdminStats } from '../types'
+import type { Club, Member, FundPeriod, AttendanceSession, FundContribution, LivingExpense, SuperAdminStats } from '../types'
 
 export const mockClubs: Club[] = [
   { id: 'club-1', name: 'CLB Pickleball Hà Nội', code: 'PBHN', address: 'Sân Mỹ Đình, Hà Nội', contactEmail: 'pbhn@gmail.com', contactPhone: '0912345678', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z', _count: { members: 18, fundPeriods: 2 } },
@@ -67,29 +67,6 @@ export const mockExpenses: LivingExpense[] = [
   { id: 'exp-4', clubId: 'club-1', fundSource: 'COMMON' as const, allocationEnabled: true, fundPeriodId: 'fp-2', amount: 500000, description: 'Mua vợt dùng chung', allocationRule: 'FUND_ONLY', expenseDate: '2026-04-10', createdBy: 'user-1', createdAt: '2026-04-10T00:00:00Z' },
 ]
 
-export const mockFundSummary: FundPeriodSummary = {
-  totalIncome: 8000000,
-  totalExpenses: 6455704,
-  courtExpenses: 5387500,
-  livingExpenses: 1068204,
-  balance: 1544296,
-  totalAttendance: 78,
-  costPerAttendance: 82765,
-  unpaidCount: 2,
-  negativeBalanceCount: 0,
-  lowAttendanceCount: 1,
-  members: [
-    { memberId: 'mem-1', memberName: 'Nguyễn Văn A', attendedSessions: 13, amountPaid: true, courtCost: 731250, livingCost: 178205, totalCost: 909455, balance: 90545, contributionPaid: true },
-    { memberId: 'mem-2', memberName: 'Trần Thị B', attendedSessions: 11, amountPaid: true, courtCost: 618750, livingCost: 150641, totalCost: 769391, balance: 230609, contributionPaid: true },
-    { memberId: 'mem-3', memberName: 'Lê Văn C', attendedSessions: 10, amountPaid: true, courtCost: 562500, livingCost: 136923, totalCost: 699423, balance: 300577, contributionPaid: true },
-    { memberId: 'mem-4', memberName: 'Phạm Thị D', attendedSessions: 9, amountPaid: false, courtCost: 506250, livingCost: 123205, totalCost: 629455, balance: 370545, contributionPaid: false },
-    { memberId: 'mem-5', memberName: 'Hoàng Văn E', attendedSessions: 13, amountPaid: true, courtCost: 731250, livingCost: 178205, totalCost: 909455, balance: 90545, contributionPaid: true },
-    { memberId: 'mem-6', memberName: 'Đặng Thị F', attendedSessions: 8, amountPaid: true, courtCost: 450000, livingCost: 109487, totalCost: 559487, balance: 440513, contributionPaid: true },
-    { memberId: 'mem-7', memberName: 'Bùi Văn G', attendedSessions: 7, amountPaid: true, courtCost: 393750, livingCost: 95769, totalCost: 489519, balance: 510481, contributionPaid: true },
-    { memberId: 'mem-8', memberName: 'Vũ Thị H', attendedSessions: 7, amountPaid: false, courtCost: 393750, livingCost: 95769, totalCost: 489519, balance: 510481, contributionPaid: false },
-  ],
-}
-
 export const mockSuperStats: SuperAdminStats = {
   totalClubs: 3,
   activeClubs: 2,

````

## 86540b7d — (CHỈ phần bảng overflow; 2 file xóa AIWorkspace.tsx + mockMinigameDashboard.ts là dead-code, bỏ khỏi inline)

````diff
diff --git a/frontend/src/pages/admin/Contributions.tsx b/frontend/src/pages/admin/Contributions.tsx
index eb3b894d..d7401b62 100644
--- a/frontend/src/pages/admin/Contributions.tsx
+++ b/frontend/src/pages/admin/Contributions.tsx
@@ -539,7 +539,7 @@ export function Contributions() {
               <p className="text-sm text-slate-400">Chưa có khoản thu Quỹ Chính nào.</p>
             </div>
           ) : (
-            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
+            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-x-auto">
               <table className="table-base">
                 <thead>
                   <tr>
@@ -601,7 +601,7 @@ export function Contributions() {
               <p className="text-sm text-slate-400">Chưa có khoản thu Quỹ Phụ nào.</p>
             </div>
           ) : (
-            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
+            <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-x-auto">
               <table className="table-base">
                 <thead>
                   <tr>
diff --git a/frontend/src/pages/super/SuperUsers.tsx b/frontend/src/pages/super/SuperUsers.tsx
index 54591e9c..4e1c4a67 100644
--- a/frontend/src/pages/super/SuperUsers.tsx
+++ b/frontend/src/pages/super/SuperUsers.tsx
@@ -123,7 +123,7 @@ export function SuperUsers() {
           </div>
         </div>
 
-        <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
+        <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-x-auto">
           <table className="table-base">
             <thead>
               <tr>
diff --git a/frontend/src/pages/treasurer/TreasurerReminders.tsx b/frontend/src/pages/treasurer/TreasurerReminders.tsx
index 15d62002..5a8867dd 100644
--- a/frontend/src/pages/treasurer/TreasurerReminders.tsx
+++ b/frontend/src/pages/treasurer/TreasurerReminders.tsx
@@ -268,7 +268,7 @@ export function TreasurerReminders() {
 
         {/* Unpaid members */}
         {unpaidMembers.length > 0 && (
-          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
+          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-x-auto">
             <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
               <Bell size={14} className="text-red-500" />
               <h3 className="text-sm font-semibold text-slate-800">Thành viên chưa đóng quỹ</h3>
@@ -320,7 +320,7 @@ export function TreasurerReminders() {
 
         {/* Pending confirmation */}
         {pendingMembers.length > 0 && (
-          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-hidden">
+          <div className="bg-white rounded-xl border border-slate-100 shadow-[var(--shadow-card)] overflow-x-auto">
             <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
               <Clock size={14} className="text-amber-500" />
               <h3 className="text-sm font-semibold text-slate-800">Chờ xác nhận thanh toán</h3>

````
