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
  $("footPhone").textContent = "☎ " + SHOP.phone;
  $("footPhone").href = "tel:" + SHOP.phone.replace(/\D/g, "");
  $("footFb").href = SHOP.facebook;
  ["heroMsg", "footMsg", "doneMsg"].forEach(function (id) { $(id).href = SHOP.messenger; });

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
        err.textContent = (ex && ex.message && ex.message !== "Failed to fetch" ? ex.message : "Захиалга илгээж чадсангүй.") + " Дахин оролдох эсвэл Messenger-ээр бичнэ үү.";
        err.hidden = false;
      })
      .then(function () { btn.disabled = false; btn.textContent = "Төлбөр төлөх"; });
  });

  render();
})();
