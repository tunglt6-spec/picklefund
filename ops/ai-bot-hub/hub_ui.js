/* AI-BOT — tùy chọn "Liên kết PickleFund" của bot mẫu "CLB & Thể Thao" (Zalo Hub). Chèn vào static/index.html bởi rw-ai-bot-hub-ui2.sh.
 * Không phải chức năng riêng: (1) là bước tùy chọn trong khung "Khởi Tạo Trợ Lý AI Mới" khi chọn mẫu CLB & Thể Thao (Zalo);
 * (2) là nút trên thẻ của bot thuộc mẫu đó để xem trạng thái / tạo mã / xác nhận nhóm / gỡ liên kết.
 * Gọi API /api/hub/v1 bằng token phiên cấp lúc đăng nhập. Không thư viện; mọi chuỗi từ máy chủ đều được escape. */
(function () {
  'use strict';
  var API = '/api/hub/v1';
  var state = {};          // botId -> { loading, err, ov, code, codeAt }
  var current = null;      // bot đang mở trong cửa sổ

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bots() { try { return Array.isArray(currentBots) ? currentBots : []; } catch (e) { return []; } }
  function findBot(id) { return bots().filter(function (b) { return b.bot_id === id; })[0] || null; }
  function isClub(b) { return !!b && b.platform === 'zalo' && b.template_key === 'thethao'; }
  function token() { try { return (typeof currentUser !== 'undefined' && currentUser && currentUser.hub_token) || null; } catch (e) { return null; } }
  function toast(m, ok) { try { if (typeof showToast === 'function') showToast(m, ok !== false); } catch (e) { /* bỏ qua */ } }
  function fmt(ts) { if (!ts) return '—'; var d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts); return isNaN(d) ? String(ts).slice(0, 16) : d.toLocaleString('vi-VN'); }

  async function call(method, path, body) {
    var t = token();
    if (!t) throw new Error('Phiên đăng nhập này chưa có quyền liên kết. Hãy đăng xuất rồi đăng nhập lại.');
    var r = await fetch(API + path, { method: method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }, body: body ? JSON.stringify(body) : undefined });
    var j = {}; try { j = await r.json(); } catch (e) { j = {}; }
    if (r.status === 401) throw new Error('Phiên đã hết hạn. Hãy đăng xuất rồi đăng nhập lại.');
    if (!r.ok) throw new Error(typeof j.detail === 'string' ? j.detail : ('Lỗi ' + r.status));
    return j;
  }

  async function load(botId, autoCode) {
    var s = state[botId] = state[botId] || {};
    s.loading = true; s.err = null; render();
    try {
      s.ov = await call('GET', '/bots/' + encodeURIComponent(botId) + '/overview');
      var hasLink = s.ov && s.ov.links && s.ov.links[0];
      if (autoCode && s.ov && s.ov.enabled && !hasLink) await makeCode(botId);
    } catch (e) { s.err = e.message; }
    s.loading = false; render();
  }

  async function makeCode(botId) {
    var s = state[botId] = state[botId] || {};
    var r = await call('POST', '/links/code', { bot_id: botId, app: 'picklefund' });
    s.code = r.code; s.codeAt = Date.now();
  }

  function body(b) {
    var s = state[b.bot_id] || {}; var ov = s.ov; var h = '';
    if (s.err) h += '<p class="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700" role="alert">' + esc(s.err) + '</p>';
    if (s.loading && !ov) h += '<p>Đang tải…</p>';
    if (ov) {
      var link = ov.links && ov.links[0];
      if (!ov.enabled) h += '<p class="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800">Tính năng liên kết đang chờ quản trị viên hệ thống bật.</p>';
      if (link) {
        h += '<div class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-1"><p><b>Đã liên kết PickleFund</b>' + (link.club_ref ? ' · CLB <code>' + esc(link.club_ref) + '</code>' : '') + '</p>';
        h += '<p class="text-slate-500">Lệnh chuyển thành công ' + esc(link.forward_ok) + ' · lỗi ' + esc(link.forward_fail) + ' · sự kiện gần nhất ' + esc(fmt(link.last_event_at)) + '</p>';
        if (link.last_error) h += '<p class="text-red-700">Lỗi gần nhất: ' + esc(link.last_error) + '</p>';
        h += '</div>';
        h += '<div class="rounded-xl border border-slate-200 p-3 space-y-2"><p class="font-semibold">Nhóm Zalo cho phép PickleFund gửi thông báo</p>';
        h += '<p class="text-slate-500">Chọn nhóm CLB của bạn. Chưa thấy nhóm? Nhắn một tin trong nhóm rồi bấm Làm mới.</p>';
        if (!ov.groups.length) h += '<p>Chưa có nhóm nào bot nhận được tin.</p>';
        ov.groups.forEach(function (g) {
          var ok = (g.confirmed_for || []).indexOf(link.link_id) >= 0;
          h += '<div class="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><div class="min-w-0"><code class="break-all">' + esc(g.chat_id) + '</code><div class="text-slate-500">' + esc(g.messages) + ' tin · gần nhất ' + esc(fmt(g.last_message_at)) + '</div></div>';
          h += ok ? '<button data-hub-act="unconfirm" data-link="' + esc(link.link_id) + '" data-chat="' + esc(g.chat_id) + '" class="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold">Đã xác nhận · Bỏ</button>'
                  : '<button data-hub-act="confirm" data-link="' + esc(link.link_id) + '" data-chat="' + esc(g.chat_id) + '" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Xác nhận cho PickleFund</button>';
          h += '</div>';
        });
        h += '</div>';
        h += '<button data-hub-act="revoke" data-link="' + esc(link.link_id) + '" class="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 font-semibold">Gỡ liên kết PickleFund</button>';
      } else if (ov.enabled) {
        h += '<div class="rounded-xl border border-slate-200 p-3 space-y-2"><p>Chưa liên kết. Làm 2 bước, không cần dán token bot vào PickleFund:</p>';
        h += '<ol class="list-decimal pl-5 space-y-1 text-slate-600"><li>Bấm “Tạo mã” rồi sao chép mã bên dưới.</li><li>Trong PickleFund, vào tab <b>Zalo</b> → mục <b>“Liên kết từ AI-BOT”</b>, dán mã.</li><li>Quay lại đây bấm “Làm mới” và xác nhận nhóm CLB.</li></ol>';
        if (s.code && Date.now() - s.codeAt < 600000) {
          h += '<div class="flex flex-wrap items-center gap-2"><span class="text-xl font-extrabold tracking-widest select-all text-emerald-700">' + esc(s.code) + '</span><button data-hub-act="copy" class="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold">Sao chép</button></div><p class="text-slate-500">Mã có hiệu lực 10 phút, chỉ dùng một lần.</p>';
        }
        h += '<button data-hub-act="code" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">' + (s.code ? 'Tạo mã mới' : 'Tạo mã') + '</button></div>';
      }
    }
    h += '<button data-hub-act="refresh" class="px-3 py-1.5 rounded-lg border border-slate-300 font-semibold">' + (s.loading ? 'Đang tải…' : 'Làm mới') + '</button>';
    return h;
  }

  function modal() {
    var m = document.getElementById('hub-pf-modal');
    if (m) return m;
    m = document.createElement('div'); m.id = 'hub-pf-modal';
    m.className = 'fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4';
    m.addEventListener('click', function (e) { if (e.target === m) close(); else onClick(e); });
    document.body.appendChild(m);
    return m;
  }
  function close() { var m = document.getElementById('hub-pf-modal'); if (m) m.remove(); current = null; }

  function render() {
    if (!current) return;
    var b = findBot(current); if (!b) { close(); return; }
    var m = modal();
    m.innerHTML = '<div class="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/80">' +
      '<div class="p-4 border-b border-slate-100 flex items-center justify-between gap-2"><h3 class="text-sm sm:text-base font-bold text-slate-900"><i class="fa-solid fa-link text-emerald-600"></i> Liên kết PickleFund — ' + esc(b.bot_name) + '</h3>' +
      '<button type="button" data-hub-act="close" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="p-4 space-y-3 text-xs sm:text-sm text-slate-700">' + body(b) + '</div></div>';
  }

  async function onClick(e) {
    var btn = e.target.closest && e.target.closest('[data-hub-act]'); if (!btn || !current) return;
    var act = btn.getAttribute('data-hub-act'), bot = current, link = btn.getAttribute('data-link'), chat = btn.getAttribute('data-chat');
    var s = state[bot] = state[bot] || {};
    try {
      if (act === 'close') return close();
      if (act === 'refresh') return load(bot);
      if (act === 'code') { await makeCode(bot); render(); return; }
      if (act === 'copy') { try { await navigator.clipboard.writeText(s.code || ''); toast('Đã sao chép mã'); } catch (er) { toast('Không sao chép được, hãy bôi đen mã rồi Ctrl+C', false); } return; }
      if (act === 'confirm') { await call('POST', '/bots/' + encodeURIComponent(bot) + '/links/' + encodeURIComponent(link) + '/groups', { chat_id: chat }); toast('Đã xác nhận nhóm cho PickleFund'); return load(bot); }
      if (act === 'unconfirm') { await call('DELETE', '/bots/' + encodeURIComponent(bot) + '/links/' + encodeURIComponent(link) + '/groups/' + encodeURIComponent(chat)); toast('Đã bỏ xác nhận nhóm'); return load(bot); }
      if (act === 'revoke') {
        if (!window.confirm('Gỡ liên kết PickleFund? PickleFund sẽ không gửi/nhận qua bot này nữa (bot vẫn hoạt động bình thường ở AI-BOT).')) return;
        await call('DELETE', '/bots/' + encodeURIComponent(bot) + '/links/' + encodeURIComponent(link)); toast('Đã gỡ liên kết'); s.code = null; return load(bot);
      }
    } catch (err) { s.err = err.message; toast(err.message, false); render(); }
  }

  // API cho phần còn lại của trang
  window.hubOpen = function (botId, autoCode) {
    if (!findBot(botId)) return;
    current = botId; render(); load(botId, !!autoCode);
  };
  window.hubChip = function (b) {
    if (!isClub(b)) return '';
    return '<div class="pb-2" data-hub-chip><button type="button" onclick="hubOpen(\'' + esc(b.bot_id) + '\')" class="w-full py-1.5 px-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1.5"><i class="fa-solid fa-link text-xs"></i><span>Liên kết PickleFund</span></button></div>';
  };

  // Hiện/ẩn tùy chọn trong khung tạo bot; mở cửa sổ mã sau khi tạo bot xong.
  function tick() {
    try {
      var opt = document.getElementById('cust-hub-option');
      if (opt) {
        var show = window._pendingTemplateKey === 'thethao' && (typeof selectedPlatform === 'undefined' || selectedPlatform === 'zalo');
        opt.classList.toggle('hidden', !show);
        if (!show) { var cb = document.getElementById('cust-hub-link'); if (cb && cb.checked) cb.checked = false; }
      }
      // Thẻ bot có thể đã được vẽ trước khi script này nạp xong → vẽ lại một lần để hiện nút
      if (!window._hubRerendered && typeof renderBotsList === 'function' && bots().some(isClub) && document.getElementById('customer-bots-grid') && !document.querySelector('[data-hub-chip]')) { window._hubRerendered = true; renderBotsList(); }
      var cm = document.getElementById('create-bot-modal');
      if (cm && cm.classList.contains('hidden')) window._pendingTemplateKey = null;   // đóng khung tạo bot → bỏ mẫu đã chọn dở
      var want = window._hubOpenBot, hit = null;
      if (want) hit = String(want).indexOf('name:') === 0 ? bots().filter(function (x) { return isClub(x) && x.bot_name === String(want).slice(5); }).pop() : findBot(want);
      if (want && hit) { window._hubOpenBot = null; window.hubOpen(hit.bot_id, true); }
    } catch (e) { /* không để lỗi ảnh hưởng trang chính */ }
  }
  setInterval(tick, 500); tick();
})();
