/* AI-BOT — nút Sửa / Xóa trên từng thẻ Nhiệm vụ & Lịch nhắc (widget Tổng quan + danh sách "Xem tất cả").
 * Chuẩn SaaS: nút biểu tượng ghost 32px (36px trên mobile), tooltip + aria-label, focus ring, màu nguy hiểm riêng cho Xóa,
 * hộp xác nhận (alertdialog) có Hủy mặc định được focus, Esc/nền đóng, xóa xong có toast; Sửa dùng lại khung tạo ở chế độ chỉnh sửa.
 * API ghi dùng token phiên (currentUser.hub_token). Mọi chuỗi từ máy chủ đều được escape. */
(function () {
  'use strict';
  var KIND = { task: { vi: 'nhiệm vụ', api: '/api/skills/task/', list: '/api/tasks', key: 'tasks' }, reminder: { vi: 'lịch nhắc', api: '/api/skills/reminder/', list: '/api/reminders', key: 'reminders' } };
  var edit = null;   // { kind, id, rec }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, ok) { try { if (typeof showToast === 'function') showToast(m, ok !== false); } catch (e) { /* bỏ qua */ } }
  function acc() { try { return (currentUser && currentUser.username) || ''; } catch (e) { return ''; } }
  function token() { try { return (currentUser && currentUser.hub_token) || null; } catch (e) { return null; } }

  async function api(method, url, body) {
    var t = token();
    if (!t) throw new Error('Phiên đăng nhập này chưa hỗ trợ sửa/xóa. Hãy đăng xuất rồi đăng nhập lại.');
    var r = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: body ? JSON.stringify(body) : undefined });
    var j = {}; try { j = await r.json(); } catch (e) { j = {}; }
    if (r.status === 401) throw new Error('Phiên đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.');
    if (r.status === 404) throw new Error('Mục này không còn tồn tại (có thể đã bị xóa).');
    if (!r.ok) throw new Error(typeof j.detail === 'string' ? j.detail : ('Lỗi ' + r.status));
    return j;
  }
  async function record(kind, id) {
    var r = await fetch(KIND[kind].list + '?account_id=' + encodeURIComponent(acc()));
    var j = await r.json();
    return (j[KIND[kind].key] || []).filter(function (x) { return String(x.id) === String(id); })[0] || null;
  }
  async function refresh() {
    try { if (typeof loadDashboardStats === 'function') await loadDashboardStats(); } catch (e) { /* bỏ qua */ }
    try {
      var open = document.getElementById('full-reminders-list-container');
      if (open && open.offsetParent !== null && typeof populateFullRemindersTasksModal === 'function') await populateFullRemindersTasksModal();
    } catch (e) { /* bỏ qua */ }
  }

  // ───── nút trên thẻ ─────
  var BTN = 'inline-flex items-center justify-center w-8 h-8 max-lg:w-9 max-lg:h-9 rounded-lg text-slate-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 cursor-pointer';
  window.rowActions = function (kind, id) {
    var k = KIND[kind]; if (!k || id == null) return '';
    var sid = esc(id);
    return '<div class="flex items-center gap-0.5 flex-shrink-0" role="group" aria-label="Thao tác ' + k.vi + '">' +
      '<button type="button" onclick="event.stopPropagation();rowEdit(\'' + kind + '\',' + sid + ')" title="Sửa ' + k.vi + '" aria-label="Sửa ' + k.vi + '" class="' + BTN + ' hover:text-emerald-700 hover:bg-emerald-50"><i class="fa-solid fa-pen text-[12px]" aria-hidden="true"></i></button>' +
      '<button type="button" onclick="event.stopPropagation();rowDelete(\'' + kind + '\',' + sid + ')" title="Xóa ' + k.vi + '" aria-label="Xóa ' + k.vi + '" class="' + BTN + ' hover:text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500"><i class="fa-solid fa-trash-can text-[12px]" aria-hidden="true"></i></button>' +
      '</div>';
  };

  // ───── xóa (hộp xác nhận) ─────
  function confirmDialog(o) {
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      var m = document.createElement('div');
      m.id = 'row-confirm-modal'; m.setAttribute('role', 'alertdialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'rc-title'); m.setAttribute('aria-describedby', 'rc-desc');
      m.className = 'fixed inset-0 z-[10001] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4';
      m.innerHTML = '<div class="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200">' +
        '<div class="p-5 flex items-start gap-3.5"><div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></div>' +
        '<div class="min-w-0"><h3 id="rc-title" class="font-bold text-sm text-slate-900">' + esc(o.title) + '</h3>' +
        '<p id="rc-desc" class="text-xs text-slate-600 mt-1 leading-relaxed">' + esc(o.message) + '</p>' +
        '<div class="mt-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 break-words">' + esc(o.detail) + '</div></div></div>' +
        '<div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">' +
        '<button type="button" data-rc="cancel" class="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Giữ lại</button>' +
        '<button type="button" data-rc="ok" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"><i class="fa-solid fa-trash-can text-[11px]" aria-hidden="true"></i><span>Xóa vĩnh viễn</span></button></div></div>';
      function done(v) { document.removeEventListener('keydown', onKey, true); m.remove(); try { if (prev && prev.focus) prev.focus(); } catch (e) { /* bỏ qua */ } resolve(v); }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
        if (e.key === 'Tab') { var f = m.querySelectorAll('button'); if (!f.length) return; var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
      m.addEventListener('click', function (e) { if (e.target === m) return done(false); var b = e.target.closest && e.target.closest('[data-rc]'); if (b) done(b.getAttribute('data-rc') === 'ok'); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(m);
      m.querySelector('[data-rc="cancel"]').focus();   // nút an toàn được focus mặc định
    });
  }
  window.rowDelete = async function (kind, id) {
    var k = KIND[kind]; if (!k) return;
    var rec = null; try { rec = await record(kind, id); } catch (e) { rec = null; }
    var ok = await confirmDialog({ title: 'Xóa ' + k.vi + '?', message: 'Thao tác này không thể hoàn tác.', detail: (rec && rec.title) || ('#' + id) });
    if (!ok) return;
    try { await api('DELETE', k.api + encodeURIComponent(id)); toast('Đã xóa ' + k.vi); }
    catch (e) { toast(e.message, false); }
    await refresh();
  };

  // ───── sửa (dùng lại khung tạo nhanh ở chế độ chỉnh sửa) ─────
  function localInput(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  function setEditChrome(on) {
    var tab = document.getElementById('qc-tab-task'); var bar = tab && tab.parentElement;
    if (bar) bar.classList.toggle('hidden', !!on);
    if (!on) return;
    var h = document.getElementById('qc-header-title'), b = document.getElementById('qc-submit-text');
    if (h) h.textContent = edit.kind === 'task' ? 'Sửa nhiệm vụ' : 'Sửa lịch nhắc';
    if (b) b.textContent = 'Lưu thay đổi';
  }
  window.rowEdit = async function (kind, id) {
    var k = KIND[kind]; if (!k) return;
    var rec; try { rec = await record(kind, id); } catch (e) { rec = null; }
    if (!rec) { toast('Không tải được ' + k.vi + ' để sửa. Hãy làm mới trang.', false); return; }
    edit = { kind: kind, id: id, rec: rec };
    await openQuickCreateModal(kind);          // đặt lại các ô rồi mở khung
    var $ = function (x) { return document.getElementById(x); };
    $('qc-input-title').value = rec.title || '';
    if (kind === 'task') { $('qc-input-desc').value = rec.description || ''; var pr = $('qc-select-priority'); if (pr) pr.value = (rec.priority === 'urgent' ? 'high' : rec.priority) || 'normal'; }
    var iso = kind === 'task' ? rec.due_at_utc : rec.remind_at_utc;
    $('qc-input-datetime').value = localInput(iso);   // nhiệm vụ cũ chỉ có hạn dạng chữ → để trống, giữ nguyên nếu không chọn mới
    var rs = $('qc-select-recur'); if (rs) rs.value = (['weekly', 'monthly', 'yearly'].indexOf(rec.recurrence) >= 0) ? rec.recurrence : 'none';
    var bs = $('qc-select-bot'); if (bs && rec.bot_id) { for (var i = 0; i < bs.options.length; i++) { if (bs.options[i].value === rec.bot_id) { bs.selectedIndex = i; break; } } }
    try { updateDatetimePreview(); updateRecurHint(); } catch (e) { /* bỏ qua */ }
    setEditChrome(true);
  };

  // Khi đang sửa: chặn trình xử lý tạo mới (pha capture, chạy trước onsubmit inline) và gửi PUT.
  async function onEditSubmit(e) {
    if (!edit) return;                       // không sửa → để luồng tạo mới chạy bình thường
    e.preventDefault(); e.stopImmediatePropagation();
    var $ = function (x) { return document.getElementById(x); };
    var title = ($('qc-input-title').value || '').trim();
    if (!title) { toast('Vui lòng nhập nội dung!', false); return; }
    var btn = $('qc-btn-submit'); if (btn) btn.disabled = true;
    var rec = edit.rec, dt = $('qc-input-datetime').value, bs = $('qc-select-bot'), opt = bs && bs.selectedIndex >= 0 ? bs.options[bs.selectedIndex] : null;
    var body = { title: title, recurrence: ($('qc-select-recur') || { value: 'none' }).value };
    var botChanged = opt && opt.value && opt.value !== rec.bot_id;
    var gid = opt ? (opt.getAttribute('data-group-id') || '') : '';
    try {
      if (edit.kind === 'task') {
        body.description = ($('qc-input-desc').value || '').trim(); body.priority = $('qc-select-priority').value;
        if (dt) { var d = new Date(dt), now = new Date(), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
          body.due_at_utc = d.toISOString();
          body.due_date = d.toDateString() === now.toDateString() ? hm + ' Hôm nay' : hm + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
        if (botChanged) { body.bot_id = opt.value; body.group_id = gid; }
      } else {
        if (!dt) { toast('Vui lòng chọn thời gian nhắc!', false); if (btn) btn.disabled = false; return; }
        body.remind_at_utc = new Date(dt).toISOString();
        if (botChanged) { body.bot_id = opt.value; body.group_id = gid; body.channel = opt.getAttribute('data-channel') || 'zalo'; body.chat_id = opt.getAttribute('data-chat-id') || gid || 'me'; }
      }
      await api('PUT', KIND[edit.kind].api + encodeURIComponent(edit.id), body);
      toast('Đã lưu thay đổi ' + KIND[edit.kind].vi);
      closeModal('saas-quick-create-modal');
      await refresh();
    } catch (err) { toast(err.message, false); }
    finally { if (btn) btn.disabled = false; }
  }

  // thoát chế độ sửa khi khung đóng (hoặc mở lại bằng "+ Thêm")
  function watch() {
    var m = document.getElementById('saas-quick-create-modal'), f = document.getElementById('saas-quick-create-form');
    if (!m || !f) return setTimeout(watch, 500);
    f.addEventListener('submit', onEditSubmit, true);
    new MutationObserver(function () {
      if (m.classList.contains('hidden') && edit) { edit = null; setEditChrome(false); }
    }).observe(m, { attributes: true, attributeFilter: ['class'] });
  }
  watch();
})();
