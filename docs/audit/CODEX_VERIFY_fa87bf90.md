# CODEX RE-AUDIT — xác nhận fix `fa87bf90` (khép vòng audit 009cdc98)

> Dán khối này cho Codex. Codex chạy trong repo `tunglt6-spec/picklefund` nhánh `main` (có thể `git show fa87bf90`); phần diff + ngữ cảnh đã inline đầy đủ bên dưới nếu không có git.

## BỐI CẢNH
Trong lượt audit trước, Codex báo lỗi **MEDIUM [SECURITY/TENANT]** ở commit `009cdc98`:
> `selfRegister()`/`selfCheckin()` (member-portal) chỉ check `memberId != null` từ JWT payload, không gọi `assertMember(memberId, clubId)` → nếu member bị xóa/đổi CLB lúc access token cũ còn sống, token stale vẫn RSVP/check-in được bằng `memberId` stale.

Commit `fa87bf90` là **bản vá** cho đúng lỗi này. Nhiệm vụ của bạn: **xác nhận bản vá đã đóng kín lỗ hổng, không tạo regression/lỗi mới**, rồi cho verdict khép vòng.

## CÁCH SỬA (tóm tắt để bạn đối chiếu)
- Thay `if (!memberId) throw Forbidden` bằng `const member = await this.assertMember(memberId, clubId)` đặt TRƯỚC `assertSession()` trong cả 2 method.
- Ghi record (upsert/deleteMany) bằng `member.id` (đã verify từ DB) thay vì `memberId` (từ token).
- KHÔNG đổi `JwtStrategy` (quyết định có chủ đích: validate tại điểm mutation là đủ, tránh rủi ro perf/auth toàn hệ).

## ĐIỂM CẦN XÁC MINH (checklist)
1. `assertMember` (đã có sẵn, xem inline) validate ĐÚNG 3 điều: memberId non-null, member tồn tại với `clubId` khớp, `isDeleted:false`. ⇒ token stale (member đã xóa / khác club) BỊ CHẶN trước khi ghi.
2. Bản vá gọi `assertMember` ở CẢ `selfRegister` VÀ `selfCheckin`, TRƯỚC mọi thao tác ghi (`assertSession`, `upsert`, `deleteMany`).
3. Dùng `member.id` (DB-verified), không dùng `memberId` (token) trong `where`/`create` của sessionRegistration + attendanceRecord.
4. KHÔNG regression: đường hợp lệ (member thật, session cùng club) vẫn RSVP/check-in bình thường; vẫn idempotent; guard `session.status==='cancelled'` của selfCheckin còn nguyên.
5. Không lỗi mới: không N+1 nghiêm trọng (1 query member thêm/lần — chấp nhận được cho self-mutation), không nuốt lỗi sai, không lộ thông tin.
6. (Tùy chọn) Còn đường nào KHÁC mà MEMBER_VIEW tự-mutation bằng memberId stale mà chưa qua assertMember không? (vd endpoint self khác). Nếu có, nêu ra.

## OUTPUT
- Verdict: **ĐÃ ĐÓNG (fix hợp lệ, khép vòng)** hoặc **CHƯA ĐÓNG (nêu lỗ hổng còn lại + bằng chứng)**.
- Nếu phát hiện regression/lỗi mới: format `[SEVERITY][DIMENSION] file:line — vấn đề — khắc phục`.

---

## NGỮ CẢNH: `assertMember` (helper đã tồn tại, member-portal.service.ts:23)
````ts
  private async assertMember(memberId: string | null, clubId: string) {
    if (!memberId)
      throw new ForbiddenException('Tài khoản chưa liên kết thành viên.');
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, clubId, isDeleted: false },
    });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên.');
    return member;
  }
````

## DIFF ĐẦY ĐỦ commit `fa87bf90`

````diff
diff --git a/backend/src/member-portal/member-portal.service.spec.ts b/backend/src/member-portal/member-portal.service.spec.ts
index 9f04008c..fc587511 100644
--- a/backend/src/member-portal/member-portal.service.spec.ts
+++ b/backend/src/member-portal/member-portal.service.spec.ts
@@ -250,7 +250,17 @@ describe('MemberPortalService', () => {
       ).rejects.toThrow(ForbiddenException);
     });
 
+    it('member stale/đã xóa/khác club → NotFound, KHÔNG chạm session (chống token stale)', async () => {
+      prisma.member.findFirst.mockResolvedValue(null); // member không còn hợp lệ trong club
+      await expect(
+        service.selfRegister('mem-stale', 'club-1', 's1', true),
+      ).rejects.toThrow(NotFoundException);
+      expect(prisma.attendanceSession.findFirst).not.toHaveBeenCalled();
+      expect(prisma.sessionRegistration.upsert).not.toHaveBeenCalled();
+    });
+
     it('session không thuộc club → NotFound (scope clubId)', async () => {
+      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
       prisma.attendanceSession.findFirst.mockResolvedValue(null);
       await expect(
         service.selfRegister('mem-A', 'club-1', 's-other', true),
@@ -261,6 +271,7 @@ describe('MemberPortalService', () => {
     });
 
     it('register=true → upsert theo unique attendanceSessionId_memberId (idempotent)', async () => {
+      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
       prisma.attendanceSession.findFirst.mockResolvedValue(SESSION);
       const r = await service.selfRegister('mem-A', 'club-1', 's1', true);
       expect(prisma.sessionRegistration.upsert).toHaveBeenCalledWith({
@@ -277,6 +288,7 @@ describe('MemberPortalService', () => {
     });
 
     it('register=false → deleteMany scope club+session+member', async () => {
+      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
       prisma.attendanceSession.findFirst.mockResolvedValue(SESSION);
       const r = await service.selfRegister('mem-A', 'club-1', 's1', false);
       expect(prisma.sessionRegistration.deleteMany).toHaveBeenCalledWith({
@@ -293,7 +305,17 @@ describe('MemberPortalService', () => {
       );
     });
 
+    it('member stale/đã xóa/khác club → NotFound, KHÔNG chạm session (chống token stale)', async () => {
+      prisma.member.findFirst.mockResolvedValue(null);
+      await expect(
+        service.selfCheckin('mem-stale', 'club-1', 's1'),
+      ).rejects.toThrow(NotFoundException);
+      expect(prisma.attendanceSession.findFirst).not.toHaveBeenCalled();
+      expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
+    });
+
     it('session không tồn tại trong club → NotFound', async () => {
+      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
       prisma.attendanceSession.findFirst.mockResolvedValue(null);
       await expect(
         service.selfCheckin('mem-A', 'club-1', 's1'),
@@ -301,6 +323,7 @@ describe('MemberPortalService', () => {
     });
 
     it('upsert PRESENT idempotent theo unique attendanceSessionId_memberId', async () => {
+      prisma.member.findFirst.mockResolvedValue(MEMBER_A);
       prisma.attendanceSession.findFirst.mockResolvedValue({
         id: 's1',
         clubId: 'club-1',
diff --git a/backend/src/member-portal/member-portal.service.ts b/backend/src/member-portal/member-portal.service.ts
index 843f6b57..12012359 100644
--- a/backend/src/member-portal/member-portal.service.ts
+++ b/backend/src/member-portal/member-portal.service.ts
@@ -223,23 +223,24 @@ export class MemberPortalService {
     sessionId: string,
     register: boolean,
   ) {
-    if (!memberId)
-      throw new ForbiddenException('Tài khoản chưa liên kết hồ sơ thành viên.');
+    // Xác thực member THẬT với DB (thuộc clubId + chưa xóa) — chống memberId stale
+    // trong access token cũ khi member bị xóa/đổi CLB. Dùng member.id đã verify, không tin token.
+    const member = await this.assertMember(memberId, clubId);
     await this.assertSession(sessionId, clubId);
     if (register) {
       await this.prisma.sessionRegistration.upsert({
         where: {
           attendanceSessionId_memberId: {
             attendanceSessionId: sessionId,
-            memberId,
+            memberId: member.id,
           },
         },
-        create: { clubId, attendanceSessionId: sessionId, memberId },
+        create: { clubId, attendanceSessionId: sessionId, memberId: member.id },
         update: {},
       });
     } else {
       await this.prisma.sessionRegistration.deleteMany({
-        where: { clubId, attendanceSessionId: sessionId, memberId },
+        where: { clubId, attendanceSessionId: sessionId, memberId: member.id },
       });
     }
     return { sessionId, registered: register };
@@ -251,8 +252,8 @@ export class MemberPortalService {
     clubId: string,
     sessionId: string,
   ) {
-    if (!memberId)
-      throw new ForbiddenException('Tài khoản chưa liên kết hồ sơ thành viên.');
+    // Xác thực member THẬT với DB (thuộc clubId + chưa xóa) — chống memberId stale token.
+    const member = await this.assertMember(memberId, clubId);
     const session = await this.assertSession(sessionId, clubId);
     if (session.status === 'cancelled')
       throw new BadRequestException('Buổi chơi đã bị hủy, không thể check-in.');
@@ -260,12 +261,12 @@ export class MemberPortalService {
       where: {
         attendanceSessionId_memberId: {
           attendanceSessionId: sessionId,
-          memberId,
+          memberId: member.id,
         },
       },
       create: {
         attendanceSessionId: sessionId,
-        memberId,
+        memberId: member.id,
         clubId,
         status: 'PRESENT',
       },

````
