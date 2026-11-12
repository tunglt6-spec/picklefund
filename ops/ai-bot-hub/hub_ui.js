/* AI-BOT — bảng "Liên kết PickleFund" (Zalo Hub GĐ3). Chèn vào static/index.html bởi rw-ai-bot-hub-ui.sh.
 * Hiện bên trên lưới bot cho bot Zalo thuộc mẫu "CLB & Thể Thao": tạo mã PF-XXXX-XXXX, xem trạng thái liên kết,
 * xác nhận / bỏ xác nhận nhóm Zalo cho PickleFund, gỡ liên kết. Gọi API /api/hub/v1 bằng token phiên cấp lúc đăng nhập.
 * Không phụ thuộc thư viện; không ghi nội dung tin nhắn; mọi chuỗi từ máy chủ đều được escape. */
(function () {
  'use strict';
  var API = '/api/hub/v1';
  var state = {};          // botId -> { open, loading, err, ov, code, codeAt }
  var lastSig = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bots() {
    try { return (typeof currentBots !== 'undefined' && Array.isArray(currentBots) ? currentBots : []).filter(function (b) { return b.platform === 'zalo' && b.template_key === 'thethao'; }); } catch (e) { return []; }
  }
  function token() { try { return (typeof currentUser !== 'undefined' && currentUser && currentUser.hub_token) || null; } catch (e) { return null; } }
  function toast(m, ok) { try { if (typeof showToast === 'function') showToast(m, ok !== false); } catch (e) { /* bỏ qua */ } }

  async function call(method, path, body) {
    var t = token();
    if (!t) throw new Error('Phiên đăng nhập này chưa có quyền liên kết. Hãy đăng xuất rồi đăng nhập lại.');
    var r = await fetch(API + path, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: body ? JSON.stringify(body) : undefined });
    var j = {}; try { j = await r.json(); } catch (e) { j = {}; }
    if (r.status === 401) throw new Error('Phiên đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.');
    if (!r.ok) throw new Error(typeof j.detail === 'string' ? j.detail : ('Lỗi ' + r.status));
    return j;
  }

  async function load(botId) {
    var s = state[botId] = state[botId] || {};
    s.loading = true; s.err = null; render();
    try { s.ov = await call('GET', '/bots/' + encodeURIComponent(botId) + '/overview'); } catch (e) { s.err = e.message; }
    s.loading = false; render();
  }

  function fmt(ts) { if (!ts) return '—'; var d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts); return isNaN(d) ? String(ts).slice(0, 16) : d.toLocaleString('vi-VN'); }

  function botHtml(b) {
    var s = state[b.bot_id] || {}; var ov = s.ov; var h = '';
    h += '<details data-hub-bot="' + esc(b.bot_id) + '"' + (s.open ? ' open' : '') + ' class="rounded-2xl border border-emerald-200 bg-white/95 p-3 shadow-2xs">';
    h += '<summary class="cursor-pointer text-xs sm:text-sm font-bold text-slate-800 select-none"><i class="fa-solid fa-link text-emerald-600"></i> Liên kết PickleFund — ' + esc(b.bot_name) + '</summary>';
    h += '<div class="mt-3 space-y-3 text-xs sm:text-sm text-slate-700">';
    if (s.err) h += '<p class="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700" role="alert">' + esc(s.err) + '</p>';
    if (s.loading && !ov) h += '<p>Đang tải…</p>';
    if (ov) {
      var link = ov.links && ov.links[0];
      if (!ov.enabled) h += '<p class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800">Tính năng liên kết đang chờ quản trị viên hệ thống bật.</p>';
      if (link) {
        h += '<div class="rounded-xl border border-slate-200 p-2 space-y-1"><p><b>Đã liên kết PickleFund</b>' + (link.club_ref ? ' · CLB <code>' + esc(link.club_ref) + '</code>' : '') + '</p>';
        h += '<p class="text-slate-500">Lệnh chuyển thành công ' + esc(link.forward_ok) + ' · lỗi ' + esc(link.forward_fail) + ' · sự kiện gần nhất ' + esc(fmt(link.last_event_at)) + '</p>';
        if (link.last_error) h += '<p class="text-red-700">Lỗi gần nhất: ' + esc(link.last_error) + '</p>';
        h += '<button data-hub-act="revoke" data-bot="' + esc(b.bot_id) + '" data-link="' + esc(link.link_id) + '" class="mt-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-700 font-semibold">Gỡ liên kết</button></div>';
      } else {
        h += '<div class="rounded-xl border border-slate-200 p-2 space-y-2"><p>Chưa liên kết. Tạo mã rồi dán vào PickleFund (Zalo → “Liên kết từ AI-BOT”). Không cần dán token bot vào PickleFund.</p>';
        if (s.code && Date.now() - s.codeAt < 600000) h += '<p class="text-lg font-extrabold tracking-widest select-all text-emerald-700">' + esc(s.code) + '</p><p class="text-slate-500">Mã có hiệu lực 10 phút, chỉ dùng một lần.</p>';
        h += '<button data-hub-act="code" data-bot="' + esc(b.bot_id) + '" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Tạo mã liên kết PickleFund</button></div>';
      }
      if (link) {
        h += '<div class="rounded-xl border border-slate-200 p-2 space-y-2"><p class="font-semibold">Nhóm Zalo bot đã nhận tin</p>';
        h += '<p class="text-slate-500">Xác nhận nhóm nào PickleFund được phép gửi thông báo vào. Chưa thấy nhóm? Nhắn một tin trong nhóm rồi bấm Làm mới.</p>';
        if (!ov.groups.length) h += '<p>Chưa có nhóm nào.</p>';
        ov.groups.forEach(function (g) {
          var ok = (g.confirmed_for || []).indexOf(link.link_id) >= 0;
          h += '<div class="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><div class="min-w-0"><code class="break-all">' + esc(g.chat_id) + '</code><div class="text-slate-500">' + esc(g.messages) + ' tin · gần nhất ' + esc(fmt(g.last_message_at)) + '</div></div>';
          h += ok ? '<button data-hub-act="unconfirm" data-bot="' + esc(b.bot_id) + '" data-link="' + esc(link.link_id) + '" data-chat="' + esc(g.chat_id) + '" class="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold">Đã xác nhận · Bỏ</button>'
                  : '<button data-hub-act="confirm" data-bot="' + esc(b.bot_id) + '" data-link="' + esc(link.link_id) + '" data-chat="' + esc(g.chat_id) + '" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Xác nhận cho PickleFund</button>';
          h += '</div>';
        });
        h += '</div>';
      }
    }
    h += '<button data-hub-act="refresh" data-bot="' + esc(b.bot_id) + '" class="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold">' + (s.loading ? 'Đang tải…' : 'Làm mới') + '</button>';
    h += '</div></details>';
    return h;
  }

  function panel() {
    var grid = document.getElementById('customer-bots-grid'); if (!grid || !grid.parentNode) return null;
    var p = document.getElementById('hub-pf-panel');
    if (!p) {
      p = document.createElement('div'); p.id = 'hub-pf-panel'; p.className = 'mb-4 space-y-2';
      p.addEventListener('click', onClick);
      p.addEventListener('toggle', function (e) {
        var d = e.target; if (!d || !d.getAttribute) return; var id = d.getAttribute('data-hub-bot'); if (!id) return;
        var s = state[id] = state[id] || {}; s.open = d.open; if (d.open && !s.ov && !s.loading) load(id);
      }, true);
      grid.parentNode.insertBefore(p, grid);
    }
    return p;
  }

  function render() {
    var list = bots(); var p = document.getElementById('hub-pf-panel');
    if (!list.length) { if (p) p.remove(); return; }
    p = panel(); if (!p) return;
    p.innerHTML = list.map(botHtml).join('');
  }

  async function onClick(e) {
    var btn = e.target.closest && e.target.closest('[data-hub-act]'); if (!btn) return;
    var act = btn.getAttribute('data-hub-act'), bot = btn.getAttribute('data-bot'), link = btn.getAttribute('data-link'), chat = btn.getAttribute('data-chat');
    var s = state[bot] = state[bot] || {};
    try {
      if (act === 'refresh') return load(bot);
      if (act === 'code') { var r = await call('POST', '/links/code', { bot_id: bot, app: 'picklefund' }); s.code = r.code; s.codeAt = Date.now(); render(); return; }
      if (act === 'confirm') { await call('POST', '/bots/' + encodeURIComponent(bot) + '/links/' + encodeURIComponent(link) + '/groups', { chat_id: chat }); toast('Đã xác nhận nhóm cho PickleFund'); return load(bot); }
      if (act === 'unconfirm') { await call('DELETE', '/bots/' + encodeURIComponent(bot) + '/links/' + encodeURIComponent(link) + '/groups/' + encodeURIComponent(chat)); toast('Đã bỏ xác nhận nhóm'); return load(bot); }
      if (act === 'revoke') {
        if (!window.confirm('Gỡ liên kết PickleFund? PickleFund sẽ không gửi/nhận qua bot này nữa (bot vẫn hoạt động bình thường ở AI-BOT).')) return;
        await call('DELETE', '/bots/' + encodeURIComponent(bot) + '/links/' + encodeURIComponent(link)); toast('Đã gỡ liên kết'); s.code = null; return load(bot);
      }
    } catch (err) { s.err = err.message; toast(err.message, false); render(); }
  }

  // Theo dõi danh sách bot (trang tự vẽ lại lưới): chỉ dựng lại bảng khi danh sách bot thuộc mẫu CLB thay đổi hoặc bảng bị mất.
  function tick() {
    try {
      var list = bots();
      var sig = list.map(function (b) { return b.bot_id + ':' + b.bot_name; }).join('|');
      var missing = list.length && !document.getElementById('hub-pf-panel');
      if (sig !== lastSig || missing) {
        lastSig = sig;
        var opener = window._hubOpenBot;
        if (opener && list.some(function (b) { return b.bot_id === opener; })) { var s = state[opener] = state[opener] || {}; s.open = true; window._hubOpenBot = null; render(); load(opener); return; }
        render();
      }
    } catch (e) { /* không để lỗi bảng này ảnh hưởng trang chính */ }
  }
  setInterval(tick, 1000); tick();
})();
