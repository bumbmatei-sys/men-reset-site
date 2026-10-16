(function () {
  var D = __DICT__, P = __PATTERNS__;
  var R = P.map(function (p) { return [new RegExp('^' + p[0] + '$'), p[1]]; });
  var ATTR = ['placeholder', 'aria-label', 'title', 'alt'];
  function tr(s) {
    if (!s) return null;
    var k = s.replace(/\s+/g, ' ').trim();
    if (!k) return null;
    if (Object.prototype.hasOwnProperty.call(D, k)) return D[k];
    for (var i = 0; i < R.length; i++) {
      var m = k.match(R[i][0]);
      if (m) return R[i][1].replace(/\{(\d+)\}/g, function (_, j) { return m[+j + 1]; });
    }
    return null;
  }
  function text(n) {
    var v = n.nodeValue, r = tr(v);
    if (r == null) return;
    var lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
    var nv = lead + r + trail;
    if (nv !== v) n.nodeValue = nv;
  }
  function el(e) {
    if (e.closest && e.closest('[data-no-translate],script,style')) return;
    for (var i = 0; i < ATTR.length; i++) {
      var a = e.getAttribute && e.getAttribute(ATTR[i]);
      if (a) { var r = tr(a); if (r != null && r !== a) e.setAttribute(ATTR[i], r); }
    }
    if (e.tagName === 'INPUT' && /^(button|submit)$/i.test(e.type) && e.value) { var r2 = tr(e.value); if (r2 != null) e.value = r2; }
  }
  function walk(root) {
    if (root.nodeType === 3) { var p = root.parentNode; if (p && !(p.closest && p.closest('[data-no-translate],script,style'))) text(root); return; }
    if (root.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(root.tagName) || root.hasAttribute('data-no-translate')) return;
    el(root);
    var w = document.createTreeWalker(root, 5, {
      acceptNode: function (n) {
        if (n.nodeType === 1) return /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.tagName) || n.hasAttribute('data-no-translate') ? 2 : 1;
        return 1;
      }
    });
    var n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) text(n); else el(n); }
  }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes') el(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  document.addEventListener('DOMContentLoaded', function () { walk(document.body); });
  var al = window.alert, cf = window.confirm;
  window.alert = function (m) { return al.call(window, tr(String(m)) || m); };
  window.confirm = function (m) { return cf.call(window, tr(String(m)) || m); };
  window.__i18nTr = function (s) { return tr(s) || s; };
})();
