(function () {
  "use strict";
  var SHOP = window.SHOP, PRODUCTS = window.PRODUCTS || [];
  var PAGE_ID = document.body.getAttribute("data-product"); // /p/<id> хуудсан дээр сервер тавьдаг
  var LOW = 5; // ийм буюу түүнээс цөөн үлдвэл "Цөөн үлдсэн"
  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return Number(n).toLocaleString("en-US") + "₮"; };
  var el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  var stockOf = function (p) { return typeof p.stock === "number" ? p.stock : Infinity; };
  var maxQty = function (p) { return Math.max(0, Math.min(99, stockOf(p))); };
  var pageOf = function (p) { return "p/" + encodeURIComponent(p.id); }; // <base href="/"> → /p/<id>

  // ---------- дэлгүүрийн мэдээлэл ----------
  document.title = SHOP.name;
  $("shopName").textContent = SHOP.name;
  $("footName").textContent = SHOP.name;
  $("heroCity").textContent = SHOP.city;
  $("heroTitle").textContent = SHOP.tagline;
  $("heroText").textContent = SHOP.heroText;
  $("footCity").textContent = SHOP.city + " хот";
  ["heroMsg", "doneMsg"].forEach(function (id) { if (SHOP.messenger) $(id).href = SHOP.messenger; else $(id).hidden = true; });

  // ---------- холбоо барих, сошиал (админ → Тохиргоо). Хоосныг харуулахгүй. ----------
  // Брэндийн тэмдэг: 24×24, нэг өнгө (currentColor). admin.html-д ижил замууд бий.
  var ICONS = {
    facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.5-3.7a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z",
    messenger: "M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.38-.16-3.47-.46a.96.96 0 0 0-.64.05l-2.39 1.05a.96.96 0 0 1-1.35-.85l-.07-2.14a.97.97 0 0 0-.32-.68A11.39 11.389 0 0 1 .002 11.64zm8.32-2.19-3.52 5.6c-.35.53.32 1.139.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 0 0-2.61.48z",
    telegram: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
    whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z",
    discord: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.028C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
    wechat: "M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z",
  };
  var LINE = { // холбоо барих мөрийн жижиг тэмдэг (зураасан)
    phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
    mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 2-10 7L2 6",
    pin: "M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0zm-9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-16v6l4 2",
  };
  var NETS = [["facebook", "Facebook"], ["instagram", "Instagram"], ["messenger", "Messenger"], ["telegram", "Telegram"], ["whatsapp", "WhatsApp"], ["discord", "Discord"], ["wechat", "WeChat"]];
  function icon(d) {
    var NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
    p.setAttribute("d", d); p.setAttribute("fill-rule", "evenodd"); s.appendChild(p);
    return s;
  }
  function socialRow() {
    var box = el("div", "soc"), soc = SHOP.social || {};
    NETS.forEach(function (n) {
      var v = n[0] === "messenger" ? SHOP.messenger : soc[n[0]], a, label = n[1];
      if (!v) return;
      if (/^https?:\/\//i.test(v)) { a = el("a"); a.href = v; a.target = "_blank"; a.rel = "noopener"; }
      else if (n[0] === "wechat") { // WeChat ID: дарахад хуулна
        a = el("button"); a.type = "button"; label = "WeChat ID: " + v;
        a.onclick = function () { copy(v, "WeChat ID хуулагдлаа: " + v); };
      } else return;
      a.setAttribute("aria-label", label); a.title = label;
      a.appendChild(icon(ICONS[n[0]]));
      box.appendChild(a);
    });
    return box.children.length ? box : null;
  }
  [[SHOP.phone, "phone"], [SHOP.phone2, "phone"], [SHOP.email, "mail"], [SHOP.address, "pin"], [SHOP.hours, "clock"]].forEach(function (c) {
    if (!c[0]) return;
    var li = el("li"), t = c[1] === "phone" || c[1] === "mail" ? el("a", null, c[0]) : el("span", null, c[0]);
    if (c[1] === "phone") t.href = "tel:" + c[0].replace(/[^\d+]/g, "");
    if (c[1] === "mail") t.href = "mailto:" + c[0];
    var ic = icon(LINE[c[1]]); ic.setAttribute("class", "line");
    li.appendChild(ic); li.appendChild(t);
    $("footContact").appendChild(li);
  });
  $("footContact").hidden = !$("footContact").children.length;
  var footSoc = socialRow();
  if (footSoc) $("footBrand").appendChild(footSoc);

  if (SHOP.logo) {
    var probe = new Image();
    probe.onload = function () {
      document.querySelectorAll(".logo-mark").forEach(function (m) {
        var i = el("img"); i.src = SHOP.logo; i.alt = SHOP.name;
        m.textContent = ""; m.classList.add("has-img"); m.appendChild(i);
      });
      var ico = el("link"); ico.rel = "icon"; ico.href = SHOP.logo; document.head.appendChild(ico);
    };
    probe.src = SHOP.logo;
  }
  if (SHOP.logoFull && !PAGE_ID) {
    var full = new Image();
    full.onload = function () {
      var art = document.querySelector(".hero-art");
      full.alt = SHOP.name;
      art.textContent = ""; art.classList.add("has-logo"); art.removeAttribute("aria-hidden"); art.appendChild(full);
    };
    full.src = SHOP.logoFull;
  }

  SHOP.benefits.forEach(function (b) {
    var box = el("div", "benefit");
    box.appendChild(el("span", "ico", b.icon));
    var t = el("div");
    t.appendChild(el("b", null, b.title));
    t.appendChild(el("small", null, b.text));
    box.appendChild(t);
    $("benefits").appendChild(box);
  });

  // ---------- сагс ----------
  var KEY = "evaclear_cart";
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });
  Object.keys(cart).forEach(function (id) {
    if (!byId[id]) delete cart[id];
    else { cart[id] = Math.min(Math.floor(cart[id]) || 0, maxQty(byId[id])); if (cart[id] <= 0) delete cart[id]; }
  });
  save();

  function save() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  // Үлдэгдлээс илүүг нэмэхгүй. Бүгд нэмэгдсэн бол true.
  function add(id, d) {
    var p = byId[id], n = (cart[id] || 0) + d, max = maxQty(p), ok = true;
    if (n > max) { n = max; ok = false; toast(max ? "«" + p.name + "» — үлдэгдэл " + max + " ширхэг байна" : "«" + p.name + "» дууссан байна"); }
    if (n <= 0) delete cart[id]; else cart[id] = n;
    save(); render();
    return ok;
  }
  function stockTag(p) {
    var s = stockOf(p);
    return s <= 0 ? el("span", "stock out", "Дууссан") : s <= LOW ? el("span", "stock low", "Цөөн үлдсэн") : null;
  }

  // ---------- бараа ----------
  function card(p) {
    var c = el("article", "card");
    var pic = el("a", "pic", p.image ? "" : p.name);
    pic.href = pageOf(p);
    if (p.image) {
      var img = el("img");
      img.src = p.image; img.alt = p.name; img.loading = "lazy";
      img.onerror = function () { img.remove(); pic.textContent = p.name; };
      pic.appendChild(img);
    }
    if (p.badge) pic.appendChild(el("span", "badge", p.badge));
    c.appendChild(pic);

    var body = el("div", "card-body");
    var title = el("h3"), a = el("a", null, p.name);
    a.href = pageOf(p); title.appendChild(a);
    body.appendChild(title);
    body.appendChild(el("p", null, p.desc));
    var more = el("a", "more", "Дэлгэрэнгүй");
    more.href = pageOf(p);
    body.appendChild(more);
    var price = el("div", "price");
    price.appendChild(el("b", null, money(p.price)));
    if (p.oldPrice > p.price) price.appendChild(el("s", null, money(p.oldPrice)));
    var tag = stockTag(p);
    if (tag) price.appendChild(tag);
    body.appendChild(price);
    var out = stockOf(p) <= 0;
    var btn = el("button", "btn primary", out ? "Дууссан" : "Сагсанд нэмэх");
    btn.type = "button"; btn.disabled = out;
    btn.onclick = function () { if (add(p.id, 1)) toast("«" + p.name + "» сагсанд нэмэгдлээ"); };
    body.appendChild(btn);
    c.appendChild(body);
    return c;
  }
  var list = PAGE_ID ? PRODUCTS.filter(function (p) { return p.id !== PAGE_ID; }).slice(0, 4) : PRODUCTS;
  list.forEach(function (p) { $("grid").appendChild(card(p)); });

  // ---------- барааны хуудас /p/<id> ----------
  var dProduct = null, dQty = 1;
  function setDetailImage(src, name) {
    var pic = $("dPic");
    pic.textContent = "";
    if (!src) { pic.textContent = name; return; }
    var img = el("img"); img.src = src; img.alt = name;
    img.onerror = function () { img.remove(); pic.textContent = name; };
    pic.appendChild(img);
  }
  function showProduct(p) {
    dProduct = p;
    document.querySelector(".hero").hidden = $("benefits").hidden = $("how").hidden = true;
    $("pd").hidden = false;
    $("gridTitle").textContent = "Бусад бүтээгдэхүүн";
    $("products").hidden = !list.length;
    document.title = p.name + " — " + SHOP.name;
    $("dName").textContent = p.name;
    $("dBadge").textContent = p.badge || ""; $("dBadge").hidden = !p.badge;
    $("dDetails").textContent = p.details || p.desc || "";
    var price = $("dPrice");
    price.appendChild(el("b", null, money(p.price)));
    if (p.oldPrice > p.price) price.appendChild(el("s", null, money(p.oldPrice)));
    var s = stockOf(p), st = $("dStock");
    if (s === Infinity) st.hidden = true;
    else if (s <= 0) { st.textContent = "Дууссан — удахгүй орж ирнэ"; st.className = "stock-state out"; }
    else if (s <= LOW) { st.textContent = "Цөөн үлдсэн: " + s + " ширхэг"; st.className = "stock-state low"; }
    else { st.textContent = "✓ Бэлэн байгаа"; st.className = "stock-state ok"; }
    $("dAdd").disabled = $("dBuy").disabled = $("dPlus").disabled = $("dMinus").disabled = s <= 0;
    if (s <= 0) $("dQty").textContent = "0";

    var imgs = (p.image ? [p.image] : []).concat(p.images || []);
    setDetailImage(imgs[0], p.name);
    var thumbs = $("dThumbs");
    if (imgs.length > 1) imgs.forEach(function (src, i) {
      var t = el("img"); t.src = src; t.alt = ""; if (!i) t.className = "on";
      t.onclick = function () {
        setDetailImage(src, p.name);
        [].forEach.call(thumbs.children, function (c) { c.classList.toggle("on", c === t); });
      };
      thumbs.appendChild(t);
    });

    var url = (document.querySelector('meta[property="og:url"]') || {}).content || location.href.split("#")[0], enc = encodeURIComponent(url);
    $("shareFb").href = "https://www.facebook.com/sharer/sharer.php?u=" + enc;
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) $("shareMsg").href = "fb-messenger://share/?link=" + enc;
    else if (SHOP.fbAppId) $("shareMsg").href = "https://www.facebook.com/dialog/send?app_id=" + encodeURIComponent(SHOP.fbAppId) + "&link=" + enc + "&redirect_uri=" + enc;
    else {
      $("shareMsg").href = "https://www.messenger.com/";
      $("shareMsg").onclick = function () { copy(url, "Линк хуулагдлаа — Messenger-т буулгаж илгээнэ үү"); };
    }
    $("shareCopy").onclick = function () { copy(url, "Линк хуулагдлаа"); };
    var soc = socialRow();
    if (soc) { $("dSoc").appendChild(soc); $("dSoc").hidden = false; }
  }
  function copy(text, msg) {
    var done = function () { toast(msg); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    fallback();
    function fallback() {
      var t = el("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); done(); } catch (e) { window.prompt("Линкийг хуулна уу:", text); }
      t.remove();
    }
  }
  $("dMinus").onclick = function () { dQty = Math.max(1, dQty - 1); $("dQty").textContent = dQty; };
  $("dPlus").onclick = function () { dQty = Math.min(Math.max(1, maxQty(dProduct)), dQty + 1); $("dQty").textContent = dQty; };
  function addDetail() {
    var p = dProduct;
    if (!p) return false;
    var ok = add(p.id, dQty);
    if (ok) toast("«" + p.name + "» × " + dQty + " сагсанд нэмэгдлээ");
    return ok || !!cart[p.id];
  }
  $("dAdd").onclick = addDetail;
  $("dBuy").onclick = function () { if (addDetail()) openCart(); };
  if (PAGE_ID && byId[PAGE_ID]) showProduct(byId[PAGE_ID]);

  function calc() {
    var sub = 0, count = 0;
    Object.keys(cart).forEach(function (id) { sub += byId[id].price * cart[id]; count += cart[id]; });
    var free = SHOP.freeDeliveryFrom > 0 && sub >= SHOP.freeDeliveryFrom;
    var delivery = count === 0 || free ? 0 : SHOP.deliveryFee;
    return { sub: sub, count: count, delivery: delivery, total: sub + delivery };
  }
  function render() {
    var c = calc();
    $("cartCount").textContent = c.count;
    var box = $("cartItems");
    box.textContent = "";
    if (!c.count) box.appendChild(el("p", "empty", "Сагс хоосон байна"));
    Object.keys(cart).forEach(function (id) {
      var p = byId[id], row = el("div", "item");
      var info = el("div", "item-info");
      info.appendChild(el("b", null, p.name));
      info.appendChild(el("small", null, money(p.price) + " × " + cart[id] + " = " + money(p.price * cart[id])));
      row.appendChild(info);
      var q = el("div", "qty");
      var minus = el("button", null, "−"), plus = el("button", null, "+");
      minus.type = plus.type = "button";
      minus.setAttribute("aria-label", "Хасах"); plus.setAttribute("aria-label", "Нэмэх");
      minus.onclick = function () { add(id, -1); };
      plus.onclick = function () { add(id, 1); };
      plus.disabled = cart[id] >= maxQty(p);
      q.appendChild(minus); q.appendChild(el("span", null, cart[id])); q.appendChild(plus);
      row.appendChild(q);
      box.appendChild(row);
    });
    var t = $("totals");
    t.textContent = "";
    if (c.count) {
      [["Барааны дүн", money(c.sub), ""], ["Хүргэлт", c.delivery ? money(c.delivery) : "Үнэгүй", ""], ["Нийт", money(c.total), "sum"]]
        .forEach(function (r) {
          var d = el("div", r[2]);
          d.appendChild(el("span", null, r[0]));
          d.appendChild(el("span", null, r[1]));
          t.appendChild(d);
        });
    }
    $("orderForm").hidden = !c.count || !$("done").hidden || !$("pay").hidden;
  }

  // ---------- төлбөр ----------
  var pending = null, pollTimer = null;
  function showStage(stage) { // "cart" | "pay" | "done"
    $("pay").hidden = stage !== "pay";
    $("done").hidden = stage !== "done";
    $("cartItems").hidden = $("totals").hidden = stage !== "cart";
    render();
  }
  function startPayment(j, phone) {
    pending = { orderNo: j.orderNo, token: j.token, total: j.total, phone: phone };
    $("payNo").textContent = "#" + j.orderNo;
    $("payTotal").textContent = money(j.total);
    $("payQr").src = j.payment.qrImage;
    $("payDemoNote").hidden = $("payDemoBtn").hidden = !j.payment.demo;
    $("payWaiting").hidden = false; $("payExpired").hidden = true;
    var links = $("payLinks");
    links.textContent = "";
    (j.payment.links || []).forEach(function (l) {
      if (!/^[a-z][a-z0-9+.-]*:/i.test(l.url) || /^javascript:/i.test(l.url)) return;
      var a = el("a", null, l.name); a.href = l.url; links.appendChild(a);
    });
    showStage("pay");
    clearInterval(pollTimer);
    pollTimer = setInterval(checkPaid, 3000);
  }
  function checkPaid() {
    if (!pending) return;
    fetch("/api/order/status?no=" + pending.orderNo + "&token=" + pending.token)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.status === "paid") paid();
        else if (j.status === "expired") { clearInterval(pollTimer); pending = null; $("payWaiting").hidden = true; $("payExpired").hidden = false; }
      })
      .catch(function () {});
  }
  function paid() {
    if (!pending) return;
    clearInterval(pollTimer);
    $("doneText").textContent = "Захиалгын дугаар: #" + pending.orderNo + ". Төлсөн дүн: " + money(pending.total) + ". Бид удахгүй " + pending.phone + " дугаарт холбогдож хүргэлтээ тохирно.";
    pending = null;
    showStage("done");
  }
  $("payDemoBtn").onclick = function () {
    if (!pending) return;
    fetch("/api/payment/demo-pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNo: pending.orderNo, token: pending.token }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j.status === "paid") paid(); })
      .catch(function () { toast("Алдаа гарлаа"); });
  };

  function openCart() { $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden", "false"); $("overlay").hidden = false; }
  function closeCart() {
    $("drawer").classList.remove("open"); $("drawer").setAttribute("aria-hidden", "true"); $("overlay").hidden = true;
    if (!$("done").hidden) showStage("cart");
  }
  $("cartBtn").onclick = openCart;
  $("closeCart").onclick = closeCart;
  $("overlay").onclick = closeCart;
  $("doneClose").onclick = closeCart;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCart(); });

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 1800);
  }

  // ---------- захиалга ----------
  $("orderForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, err = $("formErr"), btn = $("submitBtn");
    var data = {
      name: f.name.value.trim(),
      phone: f.phone.value.replace(/\D/g, ""),
      address: f.address.value.trim(),
      note: f.note.value.trim(),
      items: Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; }),
    };
    var msg = "";
    if (!data.name) msg = "Нэрээ бичнэ үү.";
    else if (!/^\d{8}$/.test(data.phone)) msg = "Утасны дугаар 8 оронтой байх ёстой.";
    else if (data.address.length < 5) msg = "Хүргэх хаягаа бичнэ үү.";
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    err.hidden = true;
    btn.disabled = true; btn.textContent = "Илгээж байна…";

    fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Алдаа гарлаа"); return j; }); })
      .then(function (j) {
        cart = {}; save(); f.reset();
        startPayment(j, data.phone);
      })
      .catch(function (ex) {
        err.textContent = (ex && ex.message && ex.message !== "Failed to fetch" ? ex.message : "Захиалга илгээж чадсангүй.") + (SHOP.messenger ? " Дахин оролдох эсвэл Messenger-ээр бичнэ үү." : " Дахин оролдох эсвэл бидэнтэй холбогдоно уу.");
        err.hidden = false;
      })
      .then(function () { btn.disabled = false; btn.textContent = "Төлбөр төлөх"; });
  });

  render();
})();
