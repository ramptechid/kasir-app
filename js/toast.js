// ===================================
//  TOAST.JS — Custom Notifications
//  Replaces browser alert() & confirm()
// ===================================

(function () {
  if (document.getElementById('_toast_css')) return;
  var s = document.createElement('style');
  s.id  = '_toast_css';
  s.textContent = [
    /* ---- Toast container ---- */
    '#toast-container{position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:340px;min-width:240px;width:calc(100vw - 32px);box-sizing:border-box;}',
    /* ---- Individual toast ---- */
    '.toast{display:flex;align-items:flex-start;gap:10px;padding:13px 14px;border-radius:12px;font-size:13px;font-weight:500;line-height:1.5;box-shadow:0 6px 24px rgba(0,0,0,.5);pointer-events:all;animation:_tIn .25s ease;border-left:4px solid;word-break:break-word;box-sizing:border-box;min-width:0;}',
    '.toast-success{background:#052e16;color:#86efac;border-color:#22c55e;}',
    '.toast-error  {background:#1a0808;color:#fca5a5;border-color:#ef4444;}',
    '.toast-warning{background:#1c1000;color:#fde68a;border-color:#f59e0b;}',
    '.toast-info   {background:#0c1a2e;color:#93c5fd;border-color:#3b82f6;}',
    '.toast-icon{font-size:15px;flex-shrink:0;margin-top:1px;}',
    '.toast-msg{flex:1;}',
    '.toast-x{background:none;border:none;color:inherit;opacity:.45;cursor:pointer;font-size:13px;padding:0 0 0 6px;flex-shrink:0;line-height:1;width:auto!important;margin:0!important;}',
    '.toast-x:hover{opacity:1;}',
    '.toast-out{animation:_tOut .25s ease forwards;}',
    '@keyframes _tIn{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}',
    '@keyframes _tOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(28px)}}',
    /* ---- Confirm overlay ---- */
    '#_cfm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99998;display:none;align-items:center;justify-content:center;padding:20px;}',
    '#_cfm-box{background:#1E293B;border:1px solid #334155;border-radius:16px;padding:28px 24px 20px;max-width:340px;width:100%;text-align:center;animation:_tIn .2s ease;}',
    '#_cfm-icon{font-size:40px;margin-bottom:10px;}',
    '#_cfm-title{font-size:15px;font-weight:700;color:#F1F5F9;margin-bottom:6px;}',
    '#_cfm-msg{font-size:13px;color:#94A3B8;line-height:1.6;margin-bottom:22px;}',
    '._cfm-yes{display:block;width:100%;padding:12px;border:none;border-radius:9px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;margin-bottom:8px;transition:opacity .15s;}',
    '._cfm-yes:hover{opacity:.85;}',
    '._cfm-no{display:block;width:100%;padding:12px;background:#334155;color:#fff;border:none;border-radius:9px;font-size:14px;cursor:pointer;transition:background .15s;}',
    '._cfm-no:hover{background:#475569;}',
    /* ---- Mobile ---- */
    '@media(max-width:540px){#toast-container{top:10px;right:10px;left:10px;max-width:none;min-width:0;width:auto!important;}}'
  ].join('');
  (document.head || document.documentElement).appendChild(s);
})();


// ===== SHOW TOAST =====
// type: 'success' | 'error' | 'warning' | 'info'
function showToast(message, type) {
  var icons = { success: '&#10003;', error: '&#10007;', warning: '&#9888;', info: '&#8505;' };
  var t     = type || 'info';

  var container = document.getElementById('toast-container');
  if (!container) {
    container    = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  var toast       = document.createElement('div');
  toast.className = 'toast toast-' + t;
  toast.innerHTML =
    '<span class="toast-icon">' + (icons[t] || icons.info) + '</span>' +
    '<span class="toast-msg">'  + message + '</span>' +
    '<button class="toast-x" onclick="this.parentElement.remove()">&#10005;</button>';
  container.appendChild(toast);

  var tid = setTimeout(function () { _dismissToast(toast); }, 3500);
  toast.addEventListener('mouseenter', function () { clearTimeout(tid); });
  toast.addEventListener('mouseleave', function () {
    tid = setTimeout(function () { _dismissToast(toast); }, 1500);
  });
}

function _dismissToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.add('toast-out');
  setTimeout(function () { if (toast.parentElement) toast.remove(); }, 270);
}


// ===== SHOW CONFIRM =====
// options: { title, icon, yesText, noText, danger, onNo }
function showConfirm(message, onYes, options) {
  var opts = options || {};

  var overlay = document.getElementById('_cfm-overlay');
  if (!overlay) {
    overlay    = document.createElement('div');
    overlay.id = '_cfm-overlay';
    overlay.innerHTML =
      '<div id="_cfm-box">' +
        '<div id="_cfm-icon"></div>'  +
        '<div id="_cfm-title"></div>' +
        '<div id="_cfm-msg"></div>'   +
        '<button class="_cfm-yes" id="_cfm-yes-btn"></button>' +
        '<button class="_cfm-no"  id="_cfm-no-btn"></button>'  +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  }

  document.getElementById('_cfm-icon').innerHTML  = opts.icon  || (opts.danger ? '&#128465;' : '&#10067;');
  document.getElementById('_cfm-title').innerText = opts.title || 'Konfirmasi';
  document.getElementById('_cfm-msg').innerText   = message;

  var yesBtn = document.getElementById('_cfm-yes-btn');
  var noBtn  = document.getElementById('_cfm-no-btn');

  yesBtn.innerText          = opts.yesText || 'Ya, Lanjutkan';
  yesBtn.style.background   = opts.danger  ? '#ef4444' : '#22c55e';
  noBtn.innerText           = opts.noText  || 'Batal';

  yesBtn.onclick = function () {
    overlay.style.display = 'none';
    if (onYes) onYes();
  };
  noBtn.onclick = function () {
    overlay.style.display = 'none';
    if (opts.onNo) opts.onNo();
  };

  overlay.style.display = 'flex';
}
