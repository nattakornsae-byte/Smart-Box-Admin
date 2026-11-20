/*
 * หลังบ้าน Smart Pillbox – หน้าจอทั้งหมด
 * ต้องโหลด admin-core.js ก่อนไฟล์นี้ (ดู admin.html)
 */
'use strict';

/* ---------- โครงหน้า ---------- */

var NAV = [
  ['overview', 'ภาพรวม', 'grid'],
  ['devices', 'ตู้จ่ายยา', 'box'],
  ['people', 'ผู้สูงอายุและผู้ดูแล', 'users'],
  ['meds', 'ตารางยา', 'pill'],
  ['records', 'ข้อมูลการกินยา', 'list'],
  ['alarms', 'การแจ้งเตือน', 'bell'],
  ['account', 'บัญชีและการเชื่อมต่อ', 'gear']
];

function shell(route, title, sub, body, action) {
  return '<div class="layout"><aside class="side"><div class="brand">' + logo(34) +
    '<div><strong>Smart Pillbox</strong><span>หลังบ้าน</span></div></div>' +
    '<nav class="nav" aria-label="เมนูหลังบ้าน">' + NAV.map(function (n) {
      return '<a href="#/' + n[0] + '"' + (route === n[0] ? ' aria-current="page"' : '') + '>' + icon(n[2]) + '<span>' + n[1] + '</span></a>';
    }).join('') + '</nav>' +
    '<button class="side-out" type="button" data-act="logout">' + icon('out', 18) + '<span>ออกจากระบบ</span></button></aside>' +
    '<main class="main"><header class="head"><div><h1>' + title + '</h1>' + (sub ? '<p class="muted">' + sub + '</p>' : '') + '</div>' +
    (action || '') + '</header><div id="body" class="stack">' + body + '</div></main></div>';
}
function refreshBtn() { return '<button class="btn" type="button" data-act="refresh">' + icon('refresh', 18) + 'รีเฟรช</button>'; }
function setBody(html) { var b = byId('body'); if (b) b.innerHTML = html; }

/* ---------- หน้าเข้าสู่ระบบหลังบ้าน ---------- */

function hostName() { return TB.host().replace(/^https?:\/\//i, ''); }

// ลืมรหัสผ่าน: ThingsBoard ส่งลิงก์ตั้งรหัสใหม่ทางอีเมล ส่วนรหัส smartbox ตั้งไว้ในไฟล์ admin-core.js ส่งทางอีเมลไม่ได้
function forgotBlock(adminNote) {
  return '<button class="btn ghost" type="button" data-act="forgot" aria-expanded="false" aria-controls="forgotBox">ลืมรหัสผ่าน?</button>' +
    '<form class="forgot" id="forgotBox" data-form="forgot" novalidate hidden>' +
    '<p class="small">ใส่อีเมลบัญชี ThingsBoard ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลนั้น</p>' +
    '<div class="inline"><input class="input" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" ' +
    'autocorrect="off" spellcheck="false" maxlength="80" placeholder="อีเมล" aria-label="อีเมลบัญชี ThingsBoard">' +
    '<button class="btn small primary" type="submit">ส่งลิงก์</button></div>' +
    '<p class="alert" data-err hidden></p><p class="note ok" data-ok role="status" hidden></p>' +
    (adminNote ? '<p class="small muted">รหัสของชื่อผู้ใช้ smartbox ส่งทางอีเมลไม่ได้ ถ้าลืม ให้เข้าด้วยอีเมลบัญชี ThingsBoard แทน ' +
      'แล้วตั้งรหัสใหม่ที่หน้า "บัญชีและการเชื่อมต่อ"</p>' : '') + '</form>';
}

function viewLogin(msg) {
  $app.innerHTML = '<div class="center-wrap"><div class="card auth"><div class="auth-head">' + logo(56) +
    '<h1>หลังบ้าน Smart Pillbox</h1><p class="muted">สำหรับผู้ดูแลระบบ</p></div>' +
    '<form class="auth-form" id="loginForm" novalidate>' +
    (msg ? '<p class="note info">' + esc(msg) + '</p>' : '') +
    '<label for="u">ชื่อผู้ใช้หรืออีเมล</label><input class="input" id="u" autocomplete="username" inputmode="email" autocapitalize="none" ' +
    'autocorrect="off" spellcheck="false" required>' +
    '<label for="p">รหัสผ่าน</label><input class="input" id="p" type="password" autocomplete="current-password" required>' +
    '<p class="alert" id="err" role="alert" hidden></p>' +
    '<button class="btn primary" type="submit">เข้าสู่ระบบ</button>' +
    '<p class="small muted">ใช้ชื่อผู้ใช้หลังบ้าน หรืออีเมลบัญชี Tenant ที่ล็อกอิน ' + esc(hostName()) + '</p></form>' +
    forgotBlock(true) + '</div></div>';
  var form = byId('loginForm');
  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var u = byId('u').value.trim(), p = byId('p').value, err = byId('err');
    var btn = form.querySelector('button[type=submit]');
    err.hidden = true;
    if (!u || !p) { err.textContent = 'กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน'; err.hidden = false; return; }
    if (u.indexOf('@') < 0) {
      if (Gate.check(u, p)) { Gate.open(); render(); return; }
      err.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      err.hidden = false;
      byId('p').value = '';
      return;
    }
    // เข้าด้วยอีเมล: ThingsBoard ตรวจรหัสเอง แล้วเชื่อมต่อให้ในขั้นเดียว (ต้องเป็นบัญชี Tenant)
    btn.disabled = true;
    btn.textContent = 'กำลังเข้าสู่ระบบ…';
    try {
      await TB.login(u, p);
      connectMsg = '';
      Gate.open();
      toast('เข้าสู่ระบบแล้ว', 'ok');
      render();
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
      byId('p').value = '';
      btn.disabled = false;
      btn.textContent = 'เข้าสู่ระบบ';
    }
  });
}

/* ---------- หน้าเชื่อมต่อ ThingsBoard (ครั้งแรกในแต่ละเครื่อง) ---------- */

var connectMsg = '';
function viewConnect() {
  $app.innerHTML = '<div class="center-wrap"><div class="card auth"><div class="auth-head">' + logo(56) +
    '<h1>เชื่อมต่อ ThingsBoard</h1><p class="muted">ใช้อีเมลและรหัสผ่านที่ล็อกอินเว็บ <strong>' + esc(hostName()) +
    '</strong><br>ทำครั้งแรกในเครื่องนี้ครั้งเดียว</p></div>' +
    '<form class="auth-form" id="connectForm" novalidate>' +
    (connectMsg ? '<p class="note warn">' + esc(connectMsg) + '</p>' : '') +
    '<label for="ce">อีเมลบัญชี Tenant</label><input class="input" id="ce" type="email" autocomplete="username" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" required>' +
    '<label for="cp">รหัสผ่าน ThingsBoard</label><input class="input" id="cp" type="password" autocomplete="current-password" required>' +
    '<p class="alert" id="cerr" role="alert" hidden></p>' +
    '<button class="btn primary" type="submit">เชื่อมต่อ</button>' +
    '<p class="small muted">ข้อมูลจริงทั้งหมดอยู่ที่ ThingsBoard เบราว์เซอร์นี้เก็บแค่ token ไม่เก็บรหัสผ่าน</p></form>' +
    forgotBlock(false) +
    '<button class="btn ghost" type="button" data-act="logout">ออกจากระบบหลังบ้าน</button></div></div>';
  var form = byId('connectForm');
  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var email = byId('ce').value.trim(), pw = byId('cp').value, err = byId('cerr');
    if (!email || !pw) { err.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน'; err.hidden = false; return; }
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'กำลังเชื่อมต่อ…';
    err.hidden = true;
    try {
      await TB.login(email, pw);
      connectMsg = '';
      toast('เชื่อมต่อ ThingsBoard แล้ว', 'ok');
      go('overview');
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'เชื่อมต่อ';
    }
  });
}

/* ---------- ภาพรวม ---------- */

function tile(label, value, sub, tone) {
  return '<div class="tile' + (tone ? ' ' + tone : '') + '"><span class="tile-label">' + label + '</span><strong>' + value +
    '</strong><span class="tile-sub">' + sub + '</span></div>';
}

function alarmLine(a) {
  return '<li>' + badge(a.type === 'SOS' ? 'red' : 'orange', esc(alarmType(a.type))) + '<strong>' + esc(a.originatorName || '') +
    '</strong><span class="muted">' + dt(a.createdTime) + '</span></li>';
}

function onlineBadge(s) {
  if (s.error) return badge('gray', 'อ่านสถานะไม่ได้');
  return s.online ? badge('green', 'ออนไลน์') : badge('gray', 'ออฟไลน์');
}

async function viewOverview(seq, quiet) {
  if (!quiet) $app.innerHTML = shell('overview', 'ภาพรวม', 'สถานะตู้และการกินยาของทุกคนวันนี้', LOADING, refreshBtn());
  var base = await Promise.all([API.devices(), API.customers(),
    API.alarms('UNACK', 5).catch(function (e) { if (e.expired) throw e; return null; })]);
  var devs = base[0], custs = base[1], unack = base[2] || {};
  var more = await Promise.all([
    Promise.all(devs.map(statusOf)),
    Promise.all(custs.map(function (c) {
      return API.users(c.id.id).catch(function (e) { if (e.expired) throw e; return []; });
    }))
  ]);
  if (seq !== renderSeq) return;
  var st = more[0];
  var userCount = more[1].reduce(function (n, u) { return n + u.length; }, 0);
  var online = st.filter(function (s) { return s.online; }).length;
  var missed = st.reduce(function (n, s) { return n + (s.today ? s.today.missed : 0); }, 0);
  var unackList = unack.data || [];
  var unackN = unack.totalElements != null ? unack.totalElements : unackList.length;

  var tiles = '<div class="tiles">' +
    tile('ตู้จ่ายยา', devs.length, 'ออนไลน์ ' + online + ' ตู้') +
    tile('ผู้สูงอายุ', custs.length, 'ในระบบ') +
    tile('บัญชีผู้ดูแล', userCount, 'ทุกคน') +
    tile('แจ้งเตือนที่ยังไม่รับทราบ', unackN, unackN ? 'ต้องติดตาม' : 'ไม่มีค้าง', unackN ? 'red' : '') +
    tile('ลืมกินยาวันนี้', missed, 'มื้อ', missed ? 'orange' : '') + '</div>';

  var alarms = unackList.length ? '<section class="card"><div class="row-between"><h2>แจ้งเตือนที่ยังไม่รับทราบ</h2>' +
    '<a href="#/alarms">ดูทั้งหมด</a></div><ul class="list">' + unackList.map(alarmLine).join('') + '</ul></section>' : '';

  var rows = st.map(function (s) {
    var d = s.dev;
    var today = s.today ? s.today.taken + ' กินแล้ว' + (s.today.missed ? ' · <span class="text-orange">' + s.today.missed + ' ลืม</span>' : '') : '–';
    return '<tr><td data-label="ตู้"><strong>' + esc(d.name) + '</strong></td>' +
      '<td data-label="ผู้สูงอายุ">' + (elderOf(d) ? esc(elderOf(d)) : '<span class="muted">ยังไม่ผูก</span>') + '</td>' +
      '<td data-label="สถานะ">' + onlineBadge(s) + '</td>' +
      '<td data-label="ข้อมูลล่าสุด">' + dt(s.last) + '</td>' +
      '<td data-label="วันนี้">' + today + '</td>' +
      '<td data-label="เฟิร์มแวร์">' + (s.fw ? esc(s.fw) : '–') + '</td></tr>';
  }).join('');
  var table = devs.length ? '<section class="card"><h2>สถานะตู้</h2><div class="table-wrap"><table class="table"><thead><tr>' +
    '<th>ตู้</th><th>ผู้สูงอายุ</th><th>สถานะ</th><th>ข้อมูลล่าสุด</th><th>วันนี้</th><th>เฟิร์มแวร์</th></tr></thead><tbody>' +
    rows + '</tbody></table></div></section>' : emptyCard('ยังไม่มีตู้ในระบบ', '<a class="btn primary" href="#/devices">ลงทะเบียนตู้</a>');

  setBody(tiles + alarms + table);
}

/* ---------- ตู้จ่ายยา (Use Case 2.1) ---------- */

var pendingToken = null;
function tokenBox(name, token) {
  return '<section class="card token-box"><h2>Access Token ของ ' + esc(name) + '</h2>' +
    '<div class="copy-row"><code>' + esc(token) + '</code><button class="btn small" type="button" data-act="copy" data-text="' + esc(token) + '">คัดลอก</button></div>' +
    '<ol class="steps"><li>ใส่ token นี้พร้อมชื่อและรหัส WiFi ในเฟิร์มแวร์ของตู้ แล้วอัปโหลดลงบอร์ด</li>' +
    '<li>เสียบไฟตู้ แล้วกดรีเฟรชจนสถานะเป็น "ออนไลน์"</li>' +
    '<li>ห้ามใส่ token ลงไฟล์ที่อัปขึ้น GitHub</li></ol></section>';
}

async function viewDevices(seq) {
  $app.innerHTML = shell('devices', 'ตู้จ่ายยา', 'ลงทะเบียนตู้ใหม่ ดู Access Token และสถานะการเชื่อมต่อ', LOADING, refreshBtn());
  var devs = await API.devices();
  var st = await Promise.all(devs.map(function (d) {
    return API.attrs(d.id.id, 'SERVER_SCOPE', ['active', 'lastActivityTime']).catch(function (e) { if (e.expired) throw e; return null; });
  }));
  if (seq !== renderSeq) return;
  var form = '<form class="card" data-form="add-device" novalidate><h2>ลงทะเบียนตู้ใหม่</h2><div class="fields">' +
    '<label class="field"><span>ชื่อตู้ (ห้ามซ้ำ)</span><input class="input" name="name" maxlength="60" placeholder="เช่น pillbox-01" required autocapitalize="none" autocorrect="off" spellcheck="false"></label>' +
    '<button class="btn primary" type="submit">เพิ่มตู้</button></div><p class="alert" data-err hidden></p></form>';
  var rows = devs.map(function (d, i) {
    var s = st[i];
    var status = !s ? badge('gray', 'อ่านสถานะไม่ได้') : (s.active && isTrue(s.active.value)) ? badge('green', 'ออนไลน์') : badge('gray', 'ออฟไลน์');
    var last = s && s.lastActivityTime ? Number(s.lastActivityTime.value) : null;
    return '<tr><td data-label="ชื่อตู้"><strong>' + esc(d.name) + '</strong></td>' +
      '<td data-label="ผู้สูงอายุ">' + (elderOf(d) ? esc(elderOf(d)) : '<span class="muted">ยังไม่ผูก</span>') + '</td>' +
      '<td data-label="สถานะ">' + status + '</td><td data-label="ข้อมูลล่าสุด">' + dt(last) + '</td>' +
      '<td data-label="เพิ่มเมื่อ">' + (d.createdTime ? dShort(d.createdTime) : '–') + '</td>' +
      '<td class="actions"><button class="btn small" type="button" data-act="token" data-id="' + esc(d.id.id) + '" data-name="' + esc(d.name) + '">Access Token</button>' +
      '<button class="btn small danger" type="button" data-act="del-device" data-id="' + esc(d.id.id) + '" data-confirm="ยืนยันลบตู้">ลบ</button></td></tr>';
  }).join('');
  var table = devs.length ? '<section class="card"><h2>ตู้ทั้งหมด ' + devs.length + ' ตู้</h2><div class="table-wrap"><table class="table"><thead><tr>' +
    '<th>ชื่อตู้</th><th>ผู้สูงอายุ</th><th>สถานะ</th><th>ข้อมูลล่าสุด</th><th>เพิ่มเมื่อ</th><th></th></tr></thead><tbody>' + rows +
    '</tbody></table></div></section>' : emptyCard('ยังไม่มีตู้ในระบบ เพิ่มตู้แรกจากฟอร์มด้านบน');
  setBody(form + '<div id="tokenBox">' + (pendingToken ? tokenBox(pendingToken.name, pendingToken.token) : '') + '</div>' + table);
  pendingToken = null;
}

/* ---------- ผู้สูงอายุและผู้ดูแล (Use Case 2.2, 2.3) ---------- */

var pendingResult = null;
var LINE_RE = /^U[0-9a-f]{32}$/i;
var LINE_ERR = 'LINE User ID ต้องขึ้นต้นด้วย U ตามด้วยตัวเลขหรือตัวอักษร a–f อีก 32 ตัว (ไม่ใช่ LINE ID ที่ใช้ค้นหาเพื่อน)';
var LINE_HINT = 'ดู LINE User ID ได้ที่ LINE Developers Console → channel ของระบบ → Basic settings → Your user ID · ผู้ดูแลต้องแอดเพื่อน LINE OA ของระบบก่อน จึงจะได้รับข้อความ';
function lineInput(label) {
  return '<label class="field"><span>' + label + '</span><input class="input" name="line" type="text" placeholder="U แล้วตามด้วยตัวอักษร 32 ตัว"' +
    ' maxlength="40" autocapitalize="none" autocorrect="off" spellcheck="false"></label>';
}
function lineOf(f) { return f.elements.line.value.replace(/\s+/g, ''); }
function linkBox(name, link, note) {
  return '<div class="token-box"><p><strong>ลิงก์ตั้งรหัสผ่านของ ' + esc(name) + '</strong></p>' +
    '<div class="copy-row"><code>' + esc(link) + '</code><button class="btn small" type="button" data-act="copy" data-text="' + esc(link) + '">คัดลอก</button></div>' +
    '<p class="small">' + note + '</p></div>';
}

function elderCard(c, users, devs, lines) {
  var cid = c.id.id;
  lines = lines || {};
  var mine = devs.filter(function (d) { return ownerCid(d) === cid; });
  var others = devs.filter(function (d) { return ownerCid(d) !== cid; });
  var devList = mine.length ? '<ul class="list">' + mine.map(function (d) {
    return '<li><strong>' + esc(d.name) + '</strong><button class="btn small" type="button" data-act="unassign" data-id="' +
      esc(d.id.id) + '" data-confirm="ยืนยันยกเลิก">ยกเลิกการผูก</button></li>';
  }).join('') + '</ul>' : '<p class="muted">ยังไม่ได้ผูกตู้</p>';
  var opts = others.map(function (d) {
    var busy = assigned(d);
    return '<option value="' + esc(d.id.id) + '"' + (busy ? ' disabled' : '') + '>' + esc(d.name) +
      (busy ? ' (ผูกกับ ' + esc(elderOf(d) || 'คนอื่น') + ' อยู่ ต้องยกเลิกก่อน)' : '') + '</option>';
  }).join('');
  var bind = others.length ? '<form class="inline" data-form="assign" data-cid="' + esc(cid) + '" data-title="' + esc(c.title) + '">' +
    '<select class="input" name="device" aria-label="เลือกตู้ที่จะผูก"><option value="">เลือกตู้ที่จะผูก</option>' + opts + '</select>' +
    '<button class="btn small primary" type="submit">ผูกตู้</button></form>' : '';
  var ulist = users.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>เบอร์โทร</th><th>LINE</th><th></th></tr></thead><tbody>' +
    users.map(function (u) {
      var name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '–';
      var lid = lines[u.id.id];
      return '<tr><td data-label="ชื่อ">' + esc(name) + '</td><td data-label="อีเมล">' + esc(u.email) + '</td>' +
        '<td data-label="เบอร์โทร">' + esc(u.phone || '–') + '</td>' +
        '<td data-label="LINE">' + (lid ? badge('green', 'ตั้งแล้ว') + ' <code>' + esc(lid.slice(0, 5) + '…' + lid.slice(-4)) + '</code>'
          : '<span class="muted">ยังไม่ตั้ง</span>') + '</td><td class="actions">' +
        '<button class="btn small" type="button" data-act="link" data-id="' + esc(u.id.id) + '" data-cid="' + esc(cid) + '" data-name="' + esc(name) + '">ลิงก์ตั้งรหัสผ่าน</button>' +
        '<button class="btn small" type="button" data-act="mail" data-email="' + esc(u.email) + '">ส่งอีเมลเชิญ</button>' +
        '<button class="btn small danger" type="button" data-act="del-user" data-id="' + esc(u.id.id) + '" data-cid="' + esc(cid) + '" data-confirm="ยืนยันลบ">ลบ</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="muted">ยังไม่มีบัญชีผู้ดูแล</p>';
  var addUser = '<details class="sub"><summary>+ เพิ่มผู้ดูแล</summary><form class="form-grid" data-form="add-user" data-cid="' + esc(cid) + '" novalidate>' +
    field('firstName', 'ชื่อ', 'text', '', true) + field('lastName', 'นามสกุล', 'text', '', false) +
    field('email', 'อีเมล (ใช้เข้าสู่ระบบหน้าบ้าน)', 'email', '', true) + field('phone', 'เบอร์โทรศัพท์', 'tel', '', false) +
    lineInput('LINE User ID (ไม่บังคับ)') + '<p class="hint">' + LINE_HINT + '</p>' +
    '<label class="check"><input type="checkbox" name="sendMail" checked> ส่งลิงก์ตั้งรหัสผ่านไปที่อีเมลทันที</label>' +
    '<p class="alert" data-err hidden></p><button class="btn primary" type="submit">สร้างบัญชีผู้ดูแล</button></form></details>';
  // ตั้งหรือแก้ LINE ของผู้ดูแลที่มีบัญชีอยู่แล้ว
  var setLine = users.length ? '<details class="sub"><summary>ตั้ง LINE แจ้งเตือนของผู้ดูแล</summary>' +
    '<form class="form-grid" data-form="set-line" data-cid="' + esc(cid) + '" novalidate>' +
    '<label class="field"><span>ผู้ดูแล</span><select class="input" name="uid">' + users.map(function (u) {
      return '<option value="' + esc(u.id.id) + '">' + esc([u.firstName, u.lastName].filter(Boolean).join(' ') || u.email) + '</option>';
    }).join('') + '</select></label>' + lineInput('LINE User ID') +
    '<p class="hint">' + LINE_HINT + ' · เว้นช่องว่างแล้วกดบันทึก = ยกเลิกการแจ้งเตือนของผู้ดูแลคนนั้น</p>' +
    '<p class="alert" data-err hidden></p><button class="btn primary" type="submit">บันทึก LINE</button></form></details>' : '';
  return '<section class="card" id="c-' + esc(cid) + '"><div class="row-between"><div><h2>' + esc(c.title) + '</h2>' +
    (c.phone ? '<p class="muted">โทร ' + esc(c.phone) + '</p>' : '') + '</div>' +
    '<button class="btn small danger" type="button" data-act="del-elder" data-id="' + esc(cid) + '" data-confirm="ยืนยันลบ (บัญชีผู้ดูแลจะถูกลบด้วย)">ลบผู้สูงอายุ</button></div>' +
    '<div class="cols"><div><h3>ตู้จ่ายยา</h3>' + devList + bind + '</div>' +
    '<div><h3>ผู้ดูแล ' + users.length + ' คน</h3>' + ulist + addUser + setLine + '</div></div>' +
    '<div data-result="' + esc(cid) + '"></div></section>';
}

async function viewPeople(seq) {
  $app.innerHTML = shell('people', 'ผู้สูงอายุและผู้ดูแล',
    'เพิ่มผู้สูงอายุ สร้างบัญชีผู้ดูแล และผูกตู้ ผู้ดูแลจะเห็นเฉพาะตู้ของผู้สูงอายุที่ตนดูแล', LOADING, refreshBtn());
  var base = await Promise.all([API.customers(), API.devices()]);
  var custs = base[0], devs = base[1];
  var more = await Promise.all([
    Promise.all(custs.map(function (c) { return API.users(c.id.id); })),
    Promise.all(custs.map(function (c) { return API.lineIds(c.id.id).catch(function (e) { if (e.expired) throw e; return {}; }); }))
  ]);
  var users = more[0], lines = more[1];
  if (seq !== renderSeq) return;
  var add = '<form class="card" data-form="add-elder" novalidate><h2>เพิ่มผู้สูงอายุ</h2><div class="fields">' +
    field('title', 'ชื่อ-นามสกุล', 'text', 'เช่น คุณยายสมศรี ใจดี', true) + field('phone', 'เบอร์โทรศัพท์ (ไม่บังคับ)', 'tel', '', false) +
    '<button class="btn primary" type="submit">เพิ่ม</button></div><p class="alert" data-err hidden></p></form>';
  var cards = custs.map(function (c, i) { return elderCard(c, users[i], devs, lines[i]); }).join('');
  setBody(add + (cards || emptyCard('ยังไม่มีผู้สูงอายุในระบบ')));
  if (pendingResult) {
    var box = document.querySelector('[data-result="' + pendingResult.cid + '"]');
    if (box) { box.innerHTML = pendingResult.html; box.scrollIntoView({ block: 'center' }); }
    pendingResult = null;
  }
}

/* ---------- ตารางยา: เวลา ชื่อยา และจำนวนเม็ดของแต่ละมื้อ ---------- */

var medsDev = local('adm_meds_dev') || '';
var MEDS_MAX = 5;

function medRow(m) {
  m = m || {};
  return '<div class="med-row"><input class="input med-name" name="name" maxlength="40" placeholder="ชื่อยา เช่น พาราเซตามอล 500 mg" ' +
    'aria-label="ชื่อยา" value="' + esc(m.name || '') + '"><label class="qty"><input class="input" name="qty" type="number" min="1" max="20" ' +
    'step="1" inputmode="numeric" aria-label="จำนวนเม็ด" value="' + esc(m.qty || '') + '"><span>เม็ด</span></label>' +
    '<button class="btn small ghost" type="button" data-act="del-med">ลบ</button></div>';
}

function mealCard(k, v) {
  var meds = medsOf(v);
  if (!meds.length) meds = [{}];
  return '<section class="card meal" data-meal="' + k + '"><div class="row-between"><h2>' + MEAL_TH[k] + '</h2>' +
    '<label class="time-field"><span>เวลา</span><input class="input" name="time" type="time" value="' + esc(v.time || '') + '" required></label></div>' +
    '<div class="med-list">' + meds.map(medRow).join('') + '</div>' +
    '<div><button class="btn small" type="button" data-act="add-med">+ เพิ่มยา</button></div>' +
    '<p class="field-err" role="alert" hidden></p></section>';
}

function schedStatus(d) {
  if (!d.schedule) return '<p class="note info">ตู้นี้ยังไม่มีตารางยา กรอกแล้วกดบันทึก</p>';
  if (d.received && d.savedTs && d.received >= d.savedTs) return '<p class="note ok">ตู้ได้รับตารางยาล่าสุดแล้ว (' + dt(d.received) + ')</p>';
  if (d.online) return '<p class="note info">บันทึกล่าสุด ' + dt(d.savedTs) + ' รอตู้ยืนยันการรับ</p>';
  return '<p class="note warn">ตู้ออฟไลน์อยู่ ตู้จะได้รับตารางยาเมื่อกลับมาออนไลน์ (บันทึกล่าสุด ' + dt(d.savedTs) + ')</p>';
}

async function viewMeds(seq) {
  $app.innerHTML = shell('meds', 'ตารางยา', 'ตั้งเวลา ชื่อยา และจำนวนเม็ดของแต่ละมื้อ แล้วส่งไปที่ตู้', LOADING);
  var devs = await API.devices();
  if (seq !== renderSeq) return;
  if (!devs.length) {
    setBody(emptyCard('ยังไม่มีตู้ในระบบ', '<a class="btn primary" href="#/devices">ลงทะเบียนตู้</a>'));
    return;
  }
  var dev = devs.filter(function (d) { return d.id.id === medsDev; })[0] || devs.filter(assigned)[0] || devs[0];
  medsDev = dev.id.id;
  var data = await API.schedule(medsDev);
  if (seq !== renderSeq) return;
  var opts = devs.map(function (d) {
    return '<option value="' + esc(d.id.id) + '"' + (d.id.id === medsDev ? ' selected' : '') + '>' + esc(d.name) +
      (elderOf(d) ? ' – ' + esc(elderOf(d)) : ' (ยังไม่ผูกผู้สูงอายุ)') + '</option>';
  }).join('');
  var s = data.schedule || {};
  setBody('<section class="card"><label class="field"><span>ตู้ของผู้สูงอายุ</span><select class="input" data-change="meds-dev">' + opts +
    '</select></label>' + schedStatus(data) + '</section>' +
    '<form class="stack" data-form="meds" data-dev="' + esc(medsDev) + '" novalidate>' +
    '<p class="small muted">ใส่เวลาให้ครบทุกมื้อและห้ามซ้ำกัน มื้อที่ไม่มียาเว้นชื่อยาว่างไว้ได้ ใส่ยาได้มื้อละ ' + MEDS_MAX + ' รายการ</p>' +
    MEALS.map(function (k) { return mealCard(k, s[k] || {}); }).join('') +
    '<p class="alert" data-err hidden></p><div><button class="btn primary" type="submit">บันทึกและส่งไปที่ตู้</button></div></form>');
}

/* ---------- ข้อมูลการกินยา ---------- */

var rec = { dev: 'all', range: '7d', from: '', to: '' };
var lastRows = [];

function recRange() {
  var now = Date.now();
  if (rec.range === '7d') return { from: dayStart(now) - 6 * DAY, to: now };
  if (rec.range === '30d') return { from: dayStart(now) - 29 * DAY, to: now };
  if (!rec.from || !rec.to) return null;
  var f = new Date(rec.from + 'T00:00:00').getTime();
  var t = new Date(rec.to + 'T23:59:59').getTime();
  if (isNaN(f) || isNaN(t) || f > t) return null;
  return { from: f, to: Math.min(t, now) };
}

async function viewRecords(seq) {
  $app.innerHTML = shell('records', 'ข้อมูลการกินยา', 'ผลการกินยาและการขอความช่วยเหลือจากทุกตู้ ดาวน์โหลดเป็นไฟล์ CSV ได้', LOADING);
  var devs = await API.devices();
  if (seq !== renderSeq) return;
  if (rec.dev !== 'all' && !devs.some(function (d) { return d.id.id === rec.dev; })) rec.dev = 'all';
  var opts = '<option value="all">ทุกตู้</option>' + devs.map(function (d) {
    return '<option value="' + esc(d.id.id) + '"' + (rec.dev === d.id.id ? ' selected' : '') + '>' + esc(d.name) +
      (elderOf(d) ? ' – ' + esc(elderOf(d)) : '') + '</option>';
  }).join('');
  var chips = [['7d', '7 วันล่าสุด'], ['30d', '30 วัน'], ['custom', 'เลือกช่วงวันที่']].map(function (o) {
    return '<button type="button" class="chip" data-act="range" data-range="' + o[0] + '" aria-pressed="' + (rec.range === o[0]) + '">' + o[1] + '</button>';
  }).join('');
  var dates = rec.range === 'custom' ? '<label class="field"><span>ตั้งแต่</span><input class="input" type="date" name="from" value="' + esc(rec.from) + '"></label>' +
    '<label class="field"><span>ถึง</span><input class="input" type="date" name="to" value="' + esc(rec.to) + '"></label>' : '';
  setBody('<form class="card" data-form="records" novalidate><div class="chips" role="group" aria-label="ช่วงวันที่">' + chips + '</div>' +
    '<div class="fields"><label class="field"><span>ตู้</span><select class="input" name="dev">' + opts + '</select></label>' + dates +
    '<button class="btn primary" type="submit">แสดง</button></div></form><div id="recBody">' + LOADING + '</div>');

  var rng = recRange();
  if (!rng) {
    byId('recBody').innerHTML = emptyCard('เลือกวันที่เริ่มต้นและวันที่สิ้นสุดให้ถูกต้อง แล้วกด "แสดง"');
    return;
  }
  var list = rec.dev === 'all' ? devs : devs.filter(function (d) { return d.id.id === rec.dev; });
  var all = await Promise.all(list.map(function (d) { return recordsOf(d, rng.from, rng.to); }));
  if (seq !== renderSeq) return;
  var rows = [].concat.apply([], all).sort(function (a, b) { return b.ts - a.ts; });
  lastRows = rows;
  var taken = rows.filter(function (r) { return r.dose === 'taken'; }).length;
  var missed = rows.filter(function (r) { return r.dose === 'missed'; }).length;
  var sos = rows.filter(function (r) { return r.kind === 'sos'; }).length;
  var head = '<div class="row-between"><p class="muted">' + dShort(rng.from) + ' – ' + dShort(rng.to) + ' · ' + rows.length + ' รายการ · กินแล้ว ' + taken +
    ' · ลืมกินยา ' + missed + ' · ขอความช่วยเหลือ ' + sos + '</p><button class="btn" type="button" data-act="csv"' + (rows.length ? '' : ' disabled') + '>' +
    icon('download', 18) + 'ดาวน์โหลด CSV</button></div>';
  if (!rows.length) {
    byId('recBody').innerHTML = '<section class="card">' + head + '<p class="muted">ไม่พบข้อมูลในช่วงที่เลือก</p></section>';
    return;
  }
  var body = rows.slice(0, 500).map(function (r) {
    var what = r.kind === 'sos' ? 'ขอความช่วยเหลือ' : MEAL_TH[r.meal];
    var res = r.kind === 'sos' ? badge('red', 'ฉุกเฉิน') : r.dose === 'taken' ? badge('green', 'กินแล้ว') : badge('orange', 'ลืมกินยา');
    return '<tr><td data-label="วันเวลา">' + dt(r.ts) + '</td><td data-label="ผู้สูงอายุ">' + esc(elderOf(r.dev) || '–') +
      ' <span class="muted small">(' + esc(r.dev.name) + ')</span></td><td data-label="รายการ">' + what + '</td>' +
      '<td data-label="ผล">' + res + '</td><td data-label="ตู้เตือน">' + (r.kind === 'sos' ? '–' : r.reminders + ' ครั้ง') + '</td></tr>';
  }).join('');
  byId('recBody').innerHTML = '<section class="card">' + head + (rows.length > 500 ? '<p class="small muted">แสดง 500 รายการล่าสุด ไฟล์ CSV มีครบทุกรายการ</p>' : '') +
    '<div class="table-wrap"><table class="table"><thead><tr><th>วันเวลา</th><th>ผู้สูงอายุ (ตู้)</th><th>รายการ</th><th>ผล</th><th>ตู้เตือน</th></tr></thead><tbody>' +
    body + '</tbody></table></div></section>';
}

function csvCell(v) {
  var s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // กันสูตรที่ Excel จะรันเอง
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCsv(rows) {
  var lines = [['วันที่', 'เวลา', 'ตู้', 'ผู้สูงอายุ', 'รายการ', 'ผล', 'จำนวนครั้งที่ตู้เตือน']].concat(rows.map(function (r) {
    return [isoDay(r.ts), clock(r.ts), r.dev.name, elderOf(r.dev),
      r.kind === 'sos' ? 'ขอความช่วยเหลือ' : MEAL_TH[r.meal],
      r.kind === 'sos' ? 'ฉุกเฉิน' : (r.dose === 'taken' ? 'กินแล้ว' : 'ลืมกินยา'),
      r.kind === 'sos' ? '' : r.reminders];
  }));
  var csv = '\ufeff' + lines.map(function (l) { return l.map(csvCell).join(','); }).join('\r\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'smart-pillbox-' + isoDay(Date.now()) + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- การแจ้งเตือน ---------- */

var alarmFilter = 'UNACK';

async function viewAlarms(seq, quiet) {
  if (!quiet) $app.innerHTML = shell('alarms', 'การแจ้งเตือน', 'ขอความช่วยเหลือและลืมกินยาจากทุกตู้', LOADING, refreshBtn());
  var page = await API.alarms(alarmFilter, 100);
  if (seq !== renderSeq) return;
  var list = (page && page.data) || [];
  var chips = [['UNACK', 'ยังไม่รับทราบ'], ['ACTIVE', 'ยังไม่ปิดเรื่อง'], ['ANY', 'ทั้งหมด']].map(function (o) {
    return '<button type="button" class="chip" data-act="alarm-filter" data-status="' + o[0] + '" aria-pressed="' + (alarmFilter === o[0]) + '">' + o[1] + '</button>';
  }).join('');
  var rows = list.map(function (a) {
    var acked = alarmAcked(a), cleared = alarmCleared(a);
    var status = cleared ? badge('gray', 'ปิดเรื่องแล้ว') : acked ? badge('navy', 'รับทราบแล้ว') : badge('red', 'ยังไม่รับทราบ');
    var dev = a.originator && a.originator.id ? a.originator.id : '';
    var act = (acked ? '' : '<button class="btn small primary" type="button" data-act="ack" data-id="' + esc(a.id.id) + '" data-type="' + esc(a.type) +
      '" data-dev="' + esc(dev) + '">รับทราบ</button>') +
      (cleared ? '' : '<button class="btn small" type="button" data-act="clear" data-id="' + esc(a.id.id) + '" data-confirm="ยืนยันปิดเรื่อง">ปิดเรื่อง</button>');
    return '<tr><td data-label="เวลา">' + dt(a.createdTime) + '</td><td data-label="ประเภท">' + badge(a.type === 'SOS' ? 'red' : 'orange', esc(alarmType(a.type))) + '</td>' +
      '<td data-label="ตู้">' + esc(a.originatorName || '–') + '</td><td data-label="สถานะ">' + status +
      (a.ackTs ? ' <span class="small muted">' + dt(a.ackTs) + '</span>' : '') + '</td><td class="actions">' + act + '</td></tr>';
  }).join('');
  setBody('<div class="chips" role="group" aria-label="กรองการแจ้งเตือน">' + chips + '</div>' + (list.length ?
    '<section class="card"><div class="table-wrap"><table class="table"><thead><tr><th>เวลา</th><th>ประเภท</th><th>ตู้</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
    rows + '</tbody></table></div></section>' : emptyCard('ไม่มีการแจ้งเตือนในหมวดนี้')));
}

/* ---------- บัญชีและการเชื่อมต่อ ---------- */

async function viewAccount(seq) {
  $app.innerHTML = shell('account', 'บัญชีและการเชื่อมต่อ', '', LOADING);
  var me = null;
  try { me = await API.me(); } catch (e) { if (e.expired) throw e; }
  if (seq !== renderSeq) return;
  setBody('<section class="card"><h2>หลังบ้าน</h2><dl class="kv"><dt>ชื่อผู้ใช้</dt><dd>' + esc(CFG.ADMIN_USER) + '</dd>' +
    '<dt>ออกจากระบบอัตโนมัติ</dt><dd>เมื่อไม่ได้ใช้งาน ' + idleMin() + ' นาที</dd></dl>' +
    '<div><button class="btn" type="button" data-act="logout">ออกจากระบบ</button></div></section>' +
    '<section class="card"><h2>ThingsBoard</h2><dl class="kv"><dt>เซิร์ฟเวอร์</dt><dd>' + esc(TB.host()) + '</dd>' +
    '<dt>รุ่น</dt><dd>' + (isPE() ? 'Professional (ThingsBoard Cloud)' : 'Community Edition') + '</dd>' +
    '<dt>บัญชี</dt><dd>' + (me ? esc(me.email) + ' (Tenant)' : '–') + '</dd></dl>' +
    '<p class="small muted">เครื่องนี้จำการเชื่อมต่อไว้ประมาณ 1 สัปดาห์ ถ้าใช้คอมเครื่องส่วนกลาง ให้กดตัดการเชื่อมต่อทุกครั้งที่ใช้เสร็จ</p>' +
    '<div><button class="btn danger" type="button" data-act="disconnect" data-confirm="ยืนยันตัดการเชื่อมต่อ">ตัดการเชื่อมต่อ ThingsBoard</button></div></section>' +
    '<section class="card"><h2>เปลี่ยนรหัสผ่านหลังบ้าน</h2><p class="small">กรอกชื่อผู้ใช้และรหัสใหม่ แล้วนำค่าที่ได้ไปแทน <code>ADMIN_HASH</code> ' +
    '(และ <code>ADMIN_USER</code> ถ้าเปลี่ยนชื่อผู้ใช้) ในไฟล์ admin-core.js แล้วอัปโหลดขึ้น GitHub ใหม่</p>' +
    '<form class="form-grid" data-form="hash" novalidate>' + field('u', 'ชื่อผู้ใช้', 'text', '', true, CFG.ADMIN_USER) +
    field('p1', 'รหัสผ่านใหม่', 'password', '', true) + field('p2', 'พิมพ์รหัสผ่านใหม่อีกครั้ง', 'password', '', true) +
    '<p class="alert" data-err hidden></p><button class="btn primary" type="submit">สร้างค่า hash</button></form><div id="hashOut"></div></section>');
}

/* ---------- ปุ่มต่าง ๆ (ใช้ตัวฟังเดียวทั้งหน้า) ---------- */

var busy = false;

// ปุ่มที่มี data-confirm ต้องกด 2 ครั้งภายใน 4 วินาที
function confirmed(btn) {
  if (!btn.dataset.confirm || btn.dataset.armed === '1') return true;
  var old = btn.innerHTML;
  btn.dataset.armed = '1';
  btn.textContent = btn.dataset.confirm;
  btn.classList.add('armed');
  setTimeout(function () {
    if (btn.isConnected && btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.innerHTML = old; btn.classList.remove('armed'); }
  }, 4000);
  return false;
}

async function run(btn, fn) {
  if (busy) return;
  busy = true;
  if (btn) btn.disabled = true;
  try { await fn(); }
  catch (e) {
    if (e.expired) { connectMsg = e.message; render(); }
    else toast(e.message, 'err');
  } finally {
    busy = false;
    if (btn && btn.isConnected) btn.disabled = false;
  }
}

var ACTIONS = {
  logout: function () {
    Gate.close('ออกจากระบบแล้ว');
    render();
  },
  refresh: function () { render(); },
  copy: function (b) { copyText(b.dataset.text || ''); },
  disconnect: function () {
    TB.clear();
    connectMsg = 'ตัดการเชื่อมต่อแล้ว ถ้าจะใช้ต่อ ให้เชื่อมต่อด้วยบัญชี Tenant อีกครั้ง';
    render();
  },
  token: function (b) {
    return run(b, async function () {
      var t = await API.token(b.dataset.id);
      var box = byId('tokenBox');
      if (box) { box.innerHTML = tokenBox(b.dataset.name, t); box.scrollIntoView({ block: 'center' }); }
    });
  },
  'del-device': function (b) {
    return run(b, async function () {
      await API.deleteDevice(b.dataset.id);
      toast('ลบตู้แล้ว', 'ok');
      render();
    });
  },
  unassign: function (b) {
    return run(b, async function () {
      await API.unassign(b.dataset.id);
      try { await API.setLabel(b.dataset.id, ''); } catch (e) { if (e.expired) throw e; }
      toast('ยกเลิกการผูกตู้แล้ว', 'ok');
      render();
    });
  },
  link: function (b) {
    return run(b, async function () {
      try {
        var link = await API.activationLink(b.dataset.id);
        var box = document.querySelector('[data-result="' + b.dataset.cid + '"]');
        if (box) {
          box.innerHTML = linkBox(b.dataset.name, link.trim(), 'ส่งลิงก์นี้ให้ผู้ดูแลเปิดเพื่อตั้งรหัสผ่าน แล้วเข้าสู่ระบบที่หน้าบ้านด้วยอีเมลของตัวเอง');
          box.scrollIntoView({ block: 'center' });
        }
      } catch (e) {
        if (e.status === 400 && /activated/i.test(e.tb || '')) toast('ผู้ดูแลคนนี้ตั้งรหัสผ่านแล้ว เข้าสู่ระบบได้เลย', 'ok');
        else throw e;
      }
    });
  },
  mail: function (b) {
    return run(b, async function () {
      try {
        await API.sendActivation(b.dataset.email);
        toast('ส่งอีเมลเชิญไปที่ ' + b.dataset.email + ' แล้ว', 'ok');
      } catch (e) {
        if (e.status === 400 && /activated/i.test(e.tb || '')) toast('ผู้ดูแลคนนี้ตั้งรหัสผ่านแล้ว ไม่ต้องส่งอีเมลเชิญ', 'ok');
        else throw e;
      }
    });
  },
  'del-user': function (b) {
    return run(b, async function () {
      await API.deleteUser(b.dataset.id);
      // เอา LINE ของผู้ดูแลคนนี้ออกจากรายชื่อที่ ThingsBoard ใช้ส่งข้อความ
      if (b.dataset.cid) { try { await API.setLineId(b.dataset.cid, b.dataset.id, ''); } catch (e) { if (e.expired) throw e; } }
      toast('ลบบัญชีผู้ดูแลแล้ว', 'ok');
      render();
    });
  },
  'del-elder': function (b) {
    return run(b, async function () {
      var devs = await API.devices();
      var mine = devs.filter(function (d) { return ownerCid(d) === b.dataset.id; });
      for (var i = 0; i < mine.length; i++) {
        await API.unassign(mine[i].id.id);
        try { await API.setLabel(mine[i].id.id, ''); } catch (e) { if (e.expired) throw e; }
      }
      await API.deleteCustomer(b.dataset.id);
      toast('ลบข้อมูลผู้สูงอายุแล้ว', 'ok');
      render();
    });
  },
  ack: function (b) {
    return run(b, async function () {
      await API.ack(b.dataset.id);
      var warn = '';
      if (b.dataset.type === 'SOS' && b.dataset.dev) {
        try { await API.shared(b.dataset.dev, { sos_ack: Date.now() }); } catch (e) {
          if (e.expired) throw e;
          warn = ' แต่ส่งสถานะไปที่ตู้ไม่สำเร็จ';
        }
      }
      toast('รับทราบแล้ว' + warn, warn ? 'err' : 'ok');
      render();
    });
  },
  clear: function (b) {
    return run(b, async function () {
      await API.clearAlarm(b.dataset.id);
      toast('ปิดเรื่องแล้ว', 'ok');
      render();
    });
  },
  forgot: function (b) {
    var box = byId('forgotBox');
    if (!box) return;
    box.hidden = !box.hidden;
    b.setAttribute('aria-expanded', String(!box.hidden));
    if (box.hidden) return;
    var input = box.querySelector('input[name=email]');
    var src = byId('u') || byId('ce');
    var v = src ? src.value.trim() : '';
    if (!input.value && v.indexOf('@') > 0) input.value = v;
    input.focus();
  },
  'add-med': function (b) {
    var list = b.closest('[data-meal]').querySelector('.med-list');
    if (list.children.length >= MEDS_MAX) { toast('ใส่ยาได้มื้อละ ' + MEDS_MAX + ' รายการ', 'err'); return; }
    list.insertAdjacentHTML('beforeend', medRow({}));
    list.lastElementChild.querySelector('input').focus();
  },
  'del-med': function (b) {
    var row = b.closest('.med-row');
    if (row.parentNode.children.length > 1) row.remove();
    else row.querySelectorAll('input').forEach(function (i) { i.value = ''; });
  },
  'alarm-filter': function (b) { alarmFilter = b.dataset.status; render(); },
  range: function (b) {
    var sel = document.querySelector('[data-form="records"] select[name="dev"]');
    if (sel) rec.dev = sel.value;
    rec.range = b.dataset.range;
    if (rec.range === 'custom' && !rec.from) {
      rec.from = isoDay(Date.now() - 6 * DAY);
      rec.to = isoDay(Date.now());
    }
    render();
  },
  csv: function () { if (lastRows.length) downloadCsv(lastRows); }
};

$app.addEventListener('click', function (ev) {
  var btn = ev.target.closest('[data-act]');
  if (!btn || !$app.contains(btn) || btn.disabled) return;
  var fn = ACTIONS[btn.dataset.act];
  if (!fn || !confirmed(btn)) return;
  fn(btn);
});

// เปลี่ยนตู้ในหน้าตารางยา
$app.addEventListener('change', function (ev) {
  var el = ev.target.closest('[data-change]');
  if (!el || el.dataset.change !== 'meds-dev') return;
  medsDev = el.value;
  local('adm_meds_dev', medsDev);
  render();
});

/* ---------- ฟอร์มต่าง ๆ ---------- */

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

var FORMS = {
  'add-device': async function (f) {
    var name = f.elements.name.value.trim();
    if (!name) return showErr(f, 'กรุณากรอกชื่อตู้');
    try {
      var d = await API.createDevice(name);
      pendingToken = { name: d.name, token: await API.token(d.id.id) };
      toast('เพิ่มตู้แล้ว', 'ok');
      render();
    } catch (e) {
      if (e.expired) throw e;
      showErr(f, tbMsg(e, [[/already exists/i, 'มีตู้ชื่อนี้แล้ว ใช้ชื่ออื่น']]));
    }
  },
  'add-elder': async function (f) {
    var title = f.elements.title.value.trim();
    if (!title) return showErr(f, 'กรุณากรอกชื่อ-นามสกุล');
    try {
      await API.createCustomer(title, f.elements.phone.value.trim());
      toast('เพิ่ม ' + title + ' แล้ว', 'ok');
      render();
    } catch (e) {
      if (e.expired) throw e;
      showErr(f, tbMsg(e, [[/already exists/i, 'มีผู้สูงอายุชื่อนี้ในระบบแล้ว']]));
    }
  },
  assign: async function (f) {
    var did = f.elements.device.value;
    if (!did) { toast('เลือกตู้ก่อน', 'err'); return; }
    await API.assign(f.dataset.cid, did);
    var warn = '';
    // ใส่ชื่อผู้สูงอายุในช่อง Label ของตู้ หน้าบ้านจะแสดงชื่อนี้
    try { await API.setLabel(did, f.dataset.title); } catch (e) {
      if (e.expired) throw e;
      warn = ' แต่ตั้งชื่อบนตู้ไม่สำเร็จ';
    }
    toast('ผูกตู้แล้ว' + warn, warn ? 'err' : 'ok');
    render();
  },
  'add-user': async function (f) {
    var u = {
      firstName: f.elements.firstName.value.trim(), lastName: f.elements.lastName.value.trim(),
      email: f.elements.email.value.trim(), phone: f.elements.phone.value.trim()
    };
    var line = lineOf(f);
    if (!u.firstName || !u.email) return showErr(f, 'กรุณากรอกชื่อและอีเมล');
    if (!EMAIL_RE.test(u.email)) return showErr(f, 'รูปแบบอีเมลไม่ถูกต้อง');
    if (line && !LINE_RE.test(line)) return showErr(f, LINE_ERR);
    var created;
    try { created = await API.createUser(f.dataset.cid, u); } catch (e) {
      if (e.expired) throw e;
      return showErr(f, tbMsg(e, [[/already present|already exists/i, 'อีเมลนี้มีบัญชีอยู่แล้ว']]));
    }
    var lineFail = false;
    if (line) {
      try { await API.setLineId(f.dataset.cid, created.id.id, line); } catch (e) { if (e.expired) throw e; lineFail = true; }
    }
    var note = 'ส่งลิงก์นี้ให้ผู้ดูแลเปิดเพื่อตั้งรหัสผ่าน แล้วเข้าสู่ระบบที่หน้าบ้านด้วยอีเมลนี้';
    if (f.elements.sendMail.checked) {
      try { await API.sendActivation(u.email); note = 'ส่งลิงก์ไปที่ ' + esc(u.email) + ' แล้ว ถ้าผู้ดูแลไม่ได้รับ ให้คัดลอกลิงก์ด้านบนไปส่งเอง'; }
      catch (e) { if (e.expired) throw e; note = 'ส่งอีเมลไม่สำเร็จ ให้คัดลอกลิงก์ด้านบนไปส่งให้ผู้ดูแลเอง'; }
    }
    var link = '';
    try { link = (await API.activationLink(created.id.id)).trim(); } catch (e) { if (e.expired) throw e; }
    var name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    pendingResult = { cid: f.dataset.cid, html: link ? linkBox(name, link, note) : '<p class="note info">' + note + '</p>' };
    if (lineFail) toast('สร้างบัญชีผู้ดูแลแล้ว แต่บันทึก LINE ไม่สำเร็จ ให้ตั้งใหม่ที่หัวข้อ "ตั้ง LINE แจ้งเตือนของผู้ดูแล"', 'err');
    else toast('สร้างบัญชีผู้ดูแลแล้ว', 'ok');
    render();
  },
  'set-line': async function (f) {
    var uid = f.elements.uid.value, line = lineOf(f);
    if (!uid) return showErr(f, 'เลือกผู้ดูแลก่อน');
    if (line && !LINE_RE.test(line)) return showErr(f, LINE_ERR);
    await API.setLineId(f.dataset.cid, uid, line);
    toast(line ? 'บันทึก LINE ของผู้ดูแลแล้ว' : 'ยกเลิกการแจ้งเตือน LINE ของผู้ดูแลคนนี้แล้ว', 'ok');
    render();
  },
  meds: async function (f) {
    var out = {}, seen = {}, bad = false;
    f.querySelectorAll('[data-meal]').forEach(function (sec) {
      var k = sec.dataset.meal, errs = [], meds = [];
      var t = sec.querySelector('input[name=time]').value.trim();
      if (!t) errs.push('กรุณากรอกเวลา');
      else if (seen[t]) errs.push('เวลาซ้ำกับ' + MEAL_TH[seen[t]] + ' เลือกเวลาใหม่');
      else seen[t] = k;
      sec.querySelectorAll('.med-row').forEach(function (row) {
        var n = row.querySelector('input[name=name]').value.trim();
        var qs = row.querySelector('input[name=qty]').value.trim();
        if (!n && !qs) return;
        var q = Number(qs);
        if (!n) errs.push('กรอกชื่อยาให้ครบทุกแถว หรือกดลบแถวที่ไม่ใช้');
        else if (!qs || !Number.isInteger(q) || q < 1 || q > 20) errs.push('จำนวนเม็ดของ "' + n + '" ต้องเป็นเลข 1–20');
        else meds.push({ name: n, qty: q });
      });
      var box = sec.querySelector('.field-err');
      box.textContent = errs.join(' · ');
      box.hidden = !errs.length;
      sec.classList.toggle('has-err', errs.length > 0);
      if (errs.length) bad = true;
      out[k] = { time: t, med: medText(meds), meds: meds };
    });
    if (bad) return showErr(f, 'ยังมีช่องที่ต้องแก้ ดูข้อความสีส้มในแต่ละมื้อ');
    showErr(f, '');
    await API.saveSchedule(f.dataset.dev, out);
    toast('บันทึกแล้ว กำลังส่งตารางยาไปที่ตู้', 'ok');
    render();
  },
  forgot: async function (f) {
    var email = f.elements.email.value.trim();
    var ok = f.querySelector('[data-ok]');
    ok.hidden = true;
    if (!EMAIL_RE.test(email)) return showErr(f, 'กรอกอีเมลให้ถูกต้อง');
    showErr(f, '');
    await TB.resetPassword(email);
    ok.textContent = 'ถ้า ' + email + ' มีบัญชีใน ThingsBoard ระบบส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว ตรวจกล่องจดหมาย (รวมถึง Junk) ภายในไม่กี่นาที';
    ok.hidden = false;
  },
  records: function (f) {
    rec.dev = f.elements.dev.value;
    if (f.elements.from) { rec.from = f.elements.from.value; rec.to = f.elements.to.value; }
    render();
  },
  hash: function (f) {
    var u = f.elements.u.value.trim(), p1 = f.elements.p1.value, p2 = f.elements.p2.value;
    if (!u || !p1) return showErr(f, 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านใหม่');
    if (p1 !== p2) return showErr(f, 'รหัสผ่านใหม่ที่กรอก 2 ครั้งไม่ตรงกัน');
    showErr(f, '');
    var h = window.adminHash(u, p1);
    byId('hashOut').innerHTML = '<div class="token-box"><p><strong>ค่าใหม่สำหรับ admin-core.js</strong></p>' +
      '<div class="copy-row"><code>ADMIN_USER: \'' + esc(u.toLowerCase()) + '\'</code></div>' +
      '<div class="copy-row"><code>' + h + '</code><button class="btn small" type="button" data-act="copy" data-text="' + h + '">คัดลอก hash</button></div></div>';
    f.reset();
    f.elements.u.value = u;
  }
};

$app.addEventListener('submit', function (ev) {
  var f = ev.target.closest('form[data-form]');
  if (!f) return;
  ev.preventDefault();
  var fn = FORMS[f.dataset.form];
  if (!fn) return;
  var btn = f.querySelector('button[type=submit]');
  run(btn, async function () { await fn(f); });
});

/* ---------- ตัวสลับหน้า ---------- */

var ROUTES = { overview: viewOverview, devices: viewDevices, people: viewPeople, meds: viewMeds, records: viewRecords, alarms: viewAlarms, account: viewAccount };
var renderSeq = 0;

function current() { return location.hash.replace(/^#\/?/, '').split('?')[0]; }
function go(r) { if (current() === r) render(); else location.hash = '#/' + r; }

function showError(e) {
  var box = '<section class="card"><h2>โหลดข้อมูลไม่สำเร็จ</h2><p>' + esc(e && e.message || 'เกิดข้อผิดพลาด') + '</p>' +
    '<div><button class="btn primary" type="button" data-act="refresh">ลองใหม่</button></div></section>';
  if (byId('body')) setBody(box); else $app.innerHTML = box;
}

async function render() {
  var seq = ++renderSeq;
  if (Gate.idle()) Gate.close('ออกจากระบบอัตโนมัติ เพราะไม่ได้ใช้งานเกิน ' + idleMin() + ' นาที');
  if (!Gate.ok()) return viewLogin(Gate.msg);
  if (!TB.ready()) return viewConnect();
  var r = current();
  if (!ROUTES[r]) { history.replaceState(null, '', '#/overview'); r = 'overview'; }
  try {
    await ROUTES[r](seq, false);
  } catch (e) {
    if (seq !== renderSeq) return;
    if (e.expired || !TB.ready()) { connectMsg = e.message; render(); return; }
    showError(e);
  }
}

// หน้าภาพรวมและการแจ้งเตือนดึงข้อมูลใหม่เป็นระยะ
setInterval(function () {
  var r = current();
  if ((r !== 'overview' && r !== 'alarms') || busy || document.hidden || !Gate.ok() || !TB.ready()) return;
  var seq = ++renderSeq;
  ROUTES[r](seq, true).catch(function (e) { if (e.expired) { connectMsg = e.message; render(); } });
}, Number(CFG.REFRESH_MS) || 30000);

// ออกจากระบบอัตโนมัติเมื่อไม่ได้ใช้งาน
['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach(function (name) {
  window.addEventListener(name, function () { if (Gate.ok()) Gate.touch(); }, { passive: true });
});
function idleCheck() {
  if (Gate.idle()) { Gate.close('ออกจากระบบอัตโนมัติ เพราะไม่ได้ใช้งานเกิน ' + idleMin() + ' นาที'); render(); }
}
setInterval(idleCheck, 20000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) idleCheck(); });

window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
render();
