// EVA Clear Mongolia — жижиг дэлгүүрийн сервер
// Ажиллуулах:  node server.js   →  http://localhost:4321
// Захиалгууд orders.json, бараа products.json, үлдэгдлийн баримтууд stock.json, холбоо барих/сошиал settings.json файлд хадгалагдана.
// Удирдлагын самбар: http://localhost:4321/admin  (нууц түлхүүр: ADMIN_KEY орчны хувьсагч, анхдагч нь "change-me")
// SITE_URL (жишээ нь https://evaclear.mn) өгвөл Facebook-т хуваалцах линкүүд түүгээр үүснэ.
const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const pay = require("./payments");

const PORT = process.env.PORT || 4321;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me";
const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
const PUBLIC = path.join(__dirname, "public");
const ORDERS = path.join(__dirname, "orders.json");
const PRODUCTS = path.join(__dirname, "products.json");
const STOCK = path.join(__dirname, "stock.json");
const SETTINGS = path.join(__dirname, "settings.json");
const UPLOADS = path.join(PUBLIC, "images", "products");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

// ---------- өгөгдөл ----------
// Файл байхгүй бол анхдагч утга; эвдэрсэн бол алдаа шиднэ (хоосон жагсаалтаар дарж бичихээс сэргийлнэ)
function readData(file, def) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { if (e.code === "ENOENT") return def; throw e; }
}
const writeData = (file, v) => fs.writeFileSync(file, JSON.stringify(v, null, 2));
const readProducts = () => readData(PRODUCTS, []);
const readStock = () => readData(STOCK, []);

// SHOP тохиргоо public/products.js-д үлдэнэ
function loadShopFile() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(PUBLIC, "products.js"), "utf8"), ctx);
  return ctx.window;
}
// Үнийг хэрэглэгчийн браузераас биш, products.json-оос уншина (үнэ хуурамчаар илгээхээс сэргийлнэ)
function loadCatalog() {
  return { shop: loadShopFile().SHOP, products: readProducts() };
}

const imgPath = (v) => {
  v = typeof v === "string" ? v.trim().replace(/^\/+/, "") : "";
  return v.length <= 300 && !v.includes("..") && (/^images\/[^\s"'<>\\?#]+$/.test(v) || /^https?:\/\/[^\s"'<>\\]+$/.test(v)) ? v : "";
};
const amount = (v) => Math.max(0, Math.min(1e9, Math.round(Number(v) || 0)));
// Админаас ирсэн барааны талбаруудыг шүүнэ (зөвхөн ирсэн талбарууд)
function productFields(b) {
  const f = {};
  if ("name" in b) f.name = clean(b.name, 120);
  if ("desc" in b) f.desc = clean(b.desc, 300);
  if ("price" in b) f.price = amount(b.price);
  if ("oldPrice" in b) f.oldPrice = amount(b.oldPrice);
  if ("image" in b) f.image = imgPath(b.image);
  if ("images" in b) f.images = (Array.isArray(b.images) ? b.images : []).map(imgPath).filter(Boolean).slice(0, 12);
  if ("details" in b) f.details = clean(b.details, 5000);
  if ("badge" in b) f.badge = clean(b.badge, 30);
  if ("category" in b) f.category = clean(b.category, 60);
  if (typeof b.active === "boolean") f.active = b.active;
  return f;
}

const BLANK = { name: "", desc: "", price: 0, oldPrice: 0, image: "", images: [], details: "", badge: "", category: "" };

// Анх асаахад products.json байхгүй бол public/products.js доторх жагсаалтаас үүсгэнэ
function seedProducts() {
  if (fs.existsSync(PRODUCTS)) return;
  const now = new Date().toISOString();
  const list = JSON.parse(JSON.stringify(loadShopFile().PRODUCTS || [])).map((p) => ({
    id: String(p.id), ...BLANK, ...productFields(p), active: true, createdAt: now,
  }));
  writeData(PRODUCTS, list);
  console.log(`products.json үүслээ: ${list.length} бараа public/products.js-ээс шилжлээ`);
}

// ---------- үлдэгдэл (баримтын бүртгэл) ----------
const SIGN = { in: 1, return: 1, out: -1, act: -1, sale: -1 };
const PREFIX = { in: "ОР", out: "ЗР", act: "АКТ", sale: "БР", return: "БЦ" };
const REASONS = ["гэмтсэн", "хугацаа дууссан", "дутагдал", "бусад"];
const pad = (n) => (n < 10 ? "0" : "") + n;
const today = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };

function stockLevels(docs) {
  const m = {};
  for (const d of docs || readStock()) if (!d.voided) for (const it of d.items) m[it.id] = (m[it.id] || 0) + SIGN[d.type] * it.qty;
  return m;
}
function addDoc(docs, d) {
  const n = docs.filter((x) => x.type === d.type).length + 1;
  const doc = { id: crypto.randomBytes(6).toString("hex"), no: PREFIX[d.type] + "-" + String(n).padStart(4, "0"), type: d.type, date: d.date || today(), note: d.note || "" };
  if (d.reason) doc.reason = d.reason;
  if (d.orderNo) doc.orderNo = d.orderNo;
  doc.items = d.items; doc.createdAt = new Date().toISOString();
  docs.push(doc);
  return doc;
}

// Захиалга үлдэгдэл "барих" ёстой эсэхийг бүртгэлтэй тулгана. Төлөв өөрчлөгдөх бүрт дуудна.
// stockDeducted талбаргүй (энэ функц гарахаас өмнөх) захиалгуудад хүрэхгүй.
function syncStock(o) {
  if (!("stockDeducted" in o)) return;
  const hold = o.status === "paid" && o.fulfil !== "cancelled";
  if (hold === !!o.stockDeducted) return;
  const docs = readStock();
  addDoc(docs, { type: hold ? "sale" : "return", orderNo: o.orderNo, note: "Захиалга #" + o.orderNo, items: o.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty })) });
  writeData(STOCK, docs);
  o.stockDeducted = hold;
  console.log(`Үлдэгдэл: захиалга #${o.orderNo} ${hold ? "хасагдлаа" : "буцаагдлаа"}`);
}

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS, "utf8")); } catch { return []; }
}
const writeOrders = (orders) => fs.writeFileSync(ORDERS, JSON.stringify(orders, null, 2));

function markPaid(match) {
  const orders = readOrders();
  const o = orders.find(match);
  if (!o) return null;
  if (o.status !== "paid") {
    o.status = "paid";
    o.paidAt = new Date().toISOString();
    syncStock(o);
    writeOrders(orders);
    console.log(`Төлбөр төлөгдлөө #${o.orderNo}: ${o.total}₮`);
  }
  return o;
}

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, max) {
  max = max || 20000;
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > max) { reject(new Error("too large")); req.destroy(); } });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}
async function readJson(req, max) {
  try { return JSON.parse(await readBody(req, max)); } catch { return null; }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const findByToken = (no, token) => (o) => o.orderNo === Number(no) && typeof token === "string" && token.length > 10 && o.token === token;

async function handleOrder(req, res) {
  const b = await readJson(req);
  if (!b) return send(res, 400, { error: "Буруу хүсэлт" });
  const name = clean(b.name, 80), address = clean(b.address, 300), note = clean(b.note, 300);
  const phone = clean(b.phone, 12).replace(/\D/g, "");
  if (!name || !/^\d{8}$/.test(phone) || address.length < 5) return send(res, 400, { error: "Мэдээлэл дутуу байна" });

  const { shop, products } = loadCatalog();
  const items = [], want = {};
  let sub = 0;
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 50) : []) {
    const p = products.find((x) => x.id === it.id && x.active);
    const qty = Math.floor(Number(it.qty));
    if (!p || !(qty >= 1 && qty <= 99)) continue;
    items.push({ id: p.id, name: p.name, price: p.price, qty });
    sub += p.price * qty;
    want[p.id] = (want[p.id] || 0) + qty;
  }
  if (!items.length) return send(res, 400, { error: "Сагс хоосон байна" });
  const have = stockLevels();
  for (const id in want) {
    const left = Math.max(0, have[id] || 0), p = products.find((x) => x.id === id);
    if (want[id] > left) return send(res, 409, { error: left ? `«${p.name}» барааны үлдэгдэл хүрэлцэхгүй байна (үлдсэн: ${left} ш). Сагсаа засна уу.` : `«${p.name}» бараа дууссан байна. Сагснаасаа хасна уу.` });
  }
  const free = shop.freeDeliveryFrom > 0 && sub >= shop.freeDeliveryFrom;
  const delivery = free ? 0 : shop.deliveryFee;

  const orders = readOrders();
  const order = {
    orderNo: (orders.length ? orders[orders.length - 1].orderNo : 1000) + 1,
    token: crypto.randomBytes(16).toString("hex"),
    time: new Date().toISOString(), status: "pending", fulfil: "new", stockDeducted: false,
    name, phone, address, note, items, sub, delivery, total: sub + delivery,
  };

  let invoice;
  try { invoice = await pay.createInvoice(order); }
  catch (e) { console.error("Нэхэмжлэх үүсгэхэд алдаа:", e.message); return send(res, 502, { error: "Төлбөрийн нэхэмжлэх үүсгэж чадсангүй" }); }
  order.payment = { provider: pay.name, invoiceId: invoice.invoiceId };
  orders.push(order);
  writeOrders(orders);
  console.log(`Шинэ захиалга #${order.orderNo}: ${name} ${phone} — ${order.total}₮ (төлбөр хүлээж байна)`);
  send(res, 200, {
    ok: true, orderNo: order.orderNo, token: order.token, total: order.total,
    payment: { qrImage: invoice.qrImage, links: invoice.links || [], demo: pay.demo },
  });
}

// Браузер 3 секунд тутам асууна: төлөгдсөн үү?
async function handleStatus(url, res) {
  const match = findByToken(url.searchParams.get("no"), url.searchParams.get("token"));
  let o = readOrders().find(match);
  if (!o) return send(res, 404, { error: "Захиалга олдсонгүй" });
  if (o.status !== "paid") {
    let paid = false;
    try { paid = await pay.checkInvoice(o); } catch (e) { console.error("Төлбөр шалгахад алдаа:", e.message); }
    if (paid === "expired") return send(res, 200, { status: "expired" });
    if (paid) o = markPaid(match);
  }
  send(res, 200, { status: o.status });
}

// Төлбөрийн үйлчилгээнээс ирэх мэдэгдэл (webhook)
async function handleCallback(req, res) {
  const body = await readBody(req).catch(() => "");
  let invoiceId = null;
  try { invoiceId = await pay.verifyCallback(req.headers, body); } catch (e) { console.error("Callback алдаа:", e.message); }
  if (!invoiceId) return send(res, 400, { ok: false });
  if (invoiceId === true) return send(res, 200, { ok: true }); // гарын үсэг зөв, төлбөрийн мэдэгдэл биш (жишээ нь баталгаажуулах ping)
  const o = markPaid((x) => x.payment && x.payment.invoiceId === invoiceId);
  send(res, o ? 200 : 404, { ok: !!o });
}

// ЗӨВХӨН demo горимд: "туршилтаар төлсөн болгох" товч
async function handleDemoPay(req, res) {
  if (!pay.demo) return send(res, 404, { error: "Олдсонгүй" });
  const b = await readJson(req);
  const o = b && markPaid(findByToken(b.orderNo, b.token));
  send(res, o ? 200 : 404, o ? { status: o.status } : { error: "Захиалга олдсонгүй" });
}

// ---------- барааны хуудас /p/<id> (Facebook-т хуваалцах Open Graph шошготой) ----------
function siteBase(req) {
  if (SITE_URL) return SITE_URL;
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https" ? "https" : "http";
  const host = String(req.headers.host || "");
  return proto + "://" + (/^[a-z0-9.-]+(:\d+)?$/i.test(host) ? host : "localhost:" + PORT);
}
const absUrl = (base, p) => (/^https?:\/\//.test(p) ? p : base + "/" + encodeURI(p.replace(/^\/+/, "")));

function productPage(req, res, id) {
  const shop = loadShopFile().SHOP;
  const p = readProducts().find((x) => x.id === id && x.active);
  if (!p) {
    return send(res, 404, `<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Бараа олдсонгүй — ${esc(shop.name)}</title><link rel="icon" href="/images/logo-mark.jpg"><link rel="stylesheet" href="/styles.css"></head>
<body><main class="wrap notfound"><h1>Бараа олдсонгүй</h1><p>Энэ бараа худалдаанаас хасагдсан эсвэл линк буруу байна.</p>
<a class="btn primary" href="/">Дэлгүүр рүү буцах</a></main></body></html>`, TYPES[".html"]);
  }
  const base = siteBase(req), pageUrl = base + "/p/" + encodeURIComponent(p.id);
  const desc = (p.desc || p.details || shop.tagline || "").replace(/\s+/g, " ").trim().slice(0, 200);
  const pic = p.image || (p.images || [])[0] || shop.logoFull || shop.logo || "";
  const tags = [["og:type", "product"], ["og:site_name", shop.name], ["og:title", p.name], ["og:description", desc], ["og:url", pageUrl]]
    .concat(pic ? [["og:image", absUrl(base, pic)], ["og:image:alt", p.name]] : [])
    .concat([["product:price:amount", String(p.price)], ["product:price:currency", "MNT"], ["og:locale", "mn_MN"]])
    .map((t) => `<meta property="${t[0]}" content="${esc(t[1])}">`);
  const head = [`<meta name="description" content="${esc(desc)}">`, `<link rel="canonical" href="${esc(pageUrl)}">`].concat(tags, ['<meta name="twitter:card" content="summary_large_image">']).join("\n  ");
  const html = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8")
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(p.name + " — " + shop.name)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => head)
    .replace("<body>", () => `<body data-product="${esc(p.id)}">`);
  send(res, 200, html, TYPES[".html"]);
}

// Дэлгүүрт харагдах бараа (идэвхтэй) + одоогийн үлдэгдэл
function publicProducts() {
  const s = stockLevels();
  return readProducts().filter((p) => p.active).map(({ active, createdAt, updatedAt, ...p }) => ({ ...p, stock: s[p.id] || 0 }));
}

// ---------- админ ----------
function isAdmin(req) {
  const k = Buffer.from(String(req.headers["x-admin-key"] || "")), want = Buffer.from(ADMIN_KEY);
  return k.length === want.length && crypto.timingSafeEqual(k, want);
}
const FULFIL = ["new", "confirmed", "shipped", "delivered", "cancelled"];

function adminOrders(req, res) {
  const orders = readOrders().map(({ token, ...o }) => ({ fulfil: "new", ...o }));
  send(res, 200, { demo: pay.demo, defaultKey: ADMIN_KEY === "change-me", orders });
}

async function adminUpdate(req, res) {
  const b = await readJson(req);
  if (!b) return send(res, 400, { error: "Буруу хүсэлт" });
  const orders = readOrders();
  const o = orders.find((x) => x.orderNo === Number(b.orderNo));
  if (!o) return send(res, 404, { error: "Захиалга олдсонгүй" });
  if (b.fulfil !== undefined) {
    if (!FULFIL.includes(b.fulfil)) return send(res, 400, { error: "Буруу төлөв" });
    const now = new Date().toISOString();
    if (b.fulfil !== (o.fulfil || "new")) {
      if (b.fulfil === "shipped") { o.shippedAt = o.shippedAt || now; delete o.deliveredAt; }
      else if (b.fulfil === "delivered") { o.shippedAt = o.shippedAt || now; o.deliveredAt = now; }
      else if (b.fulfil !== "cancelled") { delete o.shippedAt; delete o.deliveredAt; }
    }
    o.fulfil = b.fulfil;
  }
  if (b.status !== undefined) {
    if (b.status !== "paid" && b.status !== "pending") return send(res, 400, { error: "Буруу төлөв" });
    if (o.status !== b.status) {
      o.status = b.status;
      if (b.status === "paid") { o.paidAt = new Date().toISOString(); o.paidManually = true; }
      else { delete o.paidAt; delete o.paidManually; }
    }
  }
  if (b.deliveryNote !== undefined) o.deliveryNote = clean(b.deliveryNote, 300);
  syncStock(o);
  writeOrders(orders);
  send(res, 200, { ok: true });
}

function adminProducts(req, res) {
  const s = stockLevels();
  send(res, 200, { products: readProducts().map((p) => ({ ...p, stock: s[p.id] || 0 })) });
}

async function adminSaveProduct(req, res) {
  const b = await readJson(req, 60000);
  if (!b) return send(res, 400, { error: "Буруу хүсэлт" });
  const f = productFields(b);
  if ("name" in f && !f.name) return send(res, 400, { error: "Барааны нэр оруулна уу" });
  if ("price" in f && !(f.price > 0)) return send(res, 400, { error: "Үнэ оруулна уу" });
  const products = readProducts();
  let p;
  if (b.id) {
    p = products.find((x) => x.id === b.id);
    if (!p) return send(res, 404, { error: "Бараа олдсонгүй" });
    Object.assign(p, f, { updatedAt: new Date().toISOString() });
    writeData(PRODUCTS, products);
  } else {
    if (!f.name || !f.price) return send(res, 400, { error: "Барааны нэр, үнэ заавал" });
    const init = Math.floor(Number(b.initialStock) || 0);
    if (init < 0 || init > 100000) return send(res, 400, { error: "Эхний үлдэгдэл буруу" });
    let id;
    do id = "p" + crypto.randomBytes(3).toString("hex"); while (products.some((x) => x.id === id));
    p = { id, ...BLANK, active: true, ...f, createdAt: new Date().toISOString() };
    products.push(p);
    writeData(PRODUCTS, products);
    if (init > 0) {
      const docs = readStock();
      addDoc(docs, { type: "in", note: "Эхний үлдэгдэл", items: [{ id: p.id, name: p.name, qty: init }] });
      writeData(STOCK, docs);
    }
  }
  send(res, 200, { ok: true, product: p });
}

// Захиалга/баримтад орсон барааг устгахгүй, нууна
async function adminDeleteProduct(req, res) {
  const b = await readJson(req);
  const products = readProducts(), i = b ? products.findIndex((x) => x.id === b.id) : -1;
  if (i < 0) return send(res, 404, { error: "Бараа олдсонгүй" });
  const id = products[i].id;
  const used = readOrders().some((o) => (o.items || []).some((x) => x.id === id)) || readStock().some((d) => d.items.some((x) => x.id === id));
  if (used) products[i].active = false; else products.splice(i, 1);
  writeData(PRODUCTS, products);
  send(res, 200, { ok: true, hidden: used, deleted: !used });
}

// Зураг хуулах: биеэр нь шууд файл ирнэ. Нэрийг сервер үүсгэнэ (илгээсэн нэрийг ашиглахгүй).
const UPLOAD_MAX = 5 * 1024 * 1024;
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ".jpg";
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return ".webp";
  return "";
}
function adminUpload(req, res) {
  const tooBig = () => { res.on("finish", () => req.destroy()); res.setHeader("Connection", "close"); send(res, 413, { error: "Зураг 5 MB-аас ихгүй байх ёстой" }); };
  if (Number(req.headers["content-length"]) > UPLOAD_MAX) return tooBig();
  if (!/^image\/(jpeg|png|webp)$/.test(String(req.headers["content-type"] || "").split(";")[0].trim())) return send(res, 415, { error: "Зөвхөн JPG, PNG, WEBP зураг оруулна" });
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, over = false;
    req.on("data", (c) => { if (over) return; size += c.length; if (size > UPLOAD_MAX) { over = true; tooBig(); resolve(); } else chunks.push(c); });
    req.on("error", (e) => (over ? resolve() : reject(e)));
    req.on("end", () => {
      if (over) return;
      const buf = Buffer.concat(chunks), ext = sniffImage(buf);
      if (!ext) { send(res, 415, { error: "Зөвхөн JPG, PNG, WEBP зураг оруулна" }); return resolve(); }
      fs.mkdirSync(UPLOADS, { recursive: true });
      const name = Date.now().toString(36) + "-" + crypto.randomBytes(5).toString("hex") + ext;
      fs.writeFileSync(path.join(UPLOADS, name), buf);
      send(res, 200, { ok: true, path: "images/products/" + name });
      resolve();
    });
  });
}

function adminStock(req, res) {
  send(res, 200, { docs: readStock(), levels: stockLevels() });
}

// Орлого / Зарлага / АКТ баримт. Зарлага, АКТ үлдэгдлийг хасах руу оруулахгүй.
async function adminStockDoc(req, res) {
  const b = await readJson(req, 60000);
  if (!b || !["in", "out", "act"].includes(b.type)) return send(res, 400, { error: "Буруу хүсэлт" });
  const products = readProducts(), docs = readStock(), have = stockLevels(docs), want = {}, items = [];
  for (const it of Array.isArray(b.items) ? b.items.slice(0, 100) : []) {
    const p = products.find((x) => x.id === it.id), qty = Math.floor(Number(it.qty));
    if (!p) return send(res, 400, { error: "Бараа сонгоно уу" });
    if (!(qty >= 1 && qty <= 100000)) return send(res, 400, { error: `«${p.name}» тоо ширхэг буруу байна` });
    const line = { id: p.id, name: p.name, qty };
    if (b.type === "in" && Number(it.cost) > 0) line.cost = amount(it.cost);
    items.push(line);
    want[p.id] = (want[p.id] || 0) + qty;
  }
  if (!items.length) return send(res, 400, { error: "Дор хаяж нэг бараа нэмнэ үү" });
  if (b.type !== "in") for (const id in want) {
    const left = Math.max(0, have[id] || 0);
    if (want[id] > left) return send(res, 400, { error: `«${products.find((x) => x.id === id).name}» үлдэгдэл хүрэлцэхгүй (үлдсэн: ${left} ш)` });
  }
  const note = clean(b.note, 300);
  if (b.type === "act" && !REASONS.includes(b.reason)) return send(res, 400, { error: "АКТ-ын шалтгаан сонгоно уу" });
  if (b.type === "act" && b.reason === "бусад" && !note) return send(res, 400, { error: "Шалтгааныг тайлбарт бичнэ үү" });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date) && !isNaN(Date.parse(b.date)) ? b.date : today();
  const doc = addDoc(docs, { type: b.type, date, note, reason: b.type === "act" ? b.reason : "", items });
  writeData(STOCK, docs);
  send(res, 200, { ok: true, doc });
}

// Баримтыг хүчингүй болгох: бүртгэлд үлдэнэ, үлдэгдэлд тооцогдохгүй
async function adminVoidDoc(req, res) {
  const b = await readJson(req);
  const docs = readStock(), d = b && docs.find((x) => x.id === b.id);
  if (!d) return send(res, 404, { error: "Баримт олдсонгүй" });
  if (!["in", "out", "act"].includes(d.type)) return send(res, 400, { error: "Захиалгын автомат бичилтийг захиалгын төлөвөөр нь өөрчилнө" });
  if (d.voided) return send(res, 400, { error: "Аль хэдийн хүчингүй болсон" });
  if (d.type === "in") {
    const have = stockLevels(docs), want = {};
    d.items.forEach((it) => { want[it.id] = (want[it.id] || 0) + it.qty; });
    for (const id in want) if (want[id] > (have[id] || 0)) return send(res, 400, { error: `Хүчингүй болговол «${d.items.find((x) => x.id === id).name}» үлдэгдэл хасах болно (одоо: ${have[id] || 0} ш)` });
  }
  d.voided = true; d.voidedAt = new Date().toISOString();
  writeData(STOCK, docs);
  send(res, 200, { ok: true });
}

// ---------- тохиргоо: холбоо барих, сошиал хаяг (settings.json, админаас удирдана) ----------
// Хоосон талбар дэлгүүрт харагдахгүй. Файл байхгүй бол public/products.js-ийн SHOP-оос анхдагч авна.
const CONTACT = { phone: "Утас", phone2: "Нэмэлт утас", email: "И-мэйл", address: "Хаяг", hours: "Ажлын цаг", messenger: "Messenger" };
const SOCIAL = { facebook: "Facebook", instagram: "Instagram", telegram: "Telegram", discord: "Discord", whatsapp: "WhatsApp", wechat: "WeChat" };
// "@нэр" эсвэл зөвхөн нэр бичвэл урд нь нэмэх хаяг
const HANDLE = { facebook: "https://facebook.com/", instagram: "https://instagram.com/", telegram: "https://t.me/", discord: "https://discord.gg/", messenger: "https://m.me/" };
const EXAMPLE = { facebook: "facebook.com/таны-хуудас", instagram: "@нэр", telegram: "@нэр эсвэл t.me/нэр", discord: "discord.gg/код", whatsapp: "8811 2233", wechat: "WeChat ID эсвэл https://… холбоос", messenger: "m.me/таны-хуудас" };
const fieldErr = (field, label, msg) => Object.assign(new Error(`«${label}»: ${msg}`), { field, user: true });

function phoneVal(v, field) {
  v = clean(v, 40).replace(/\s+/g, " ");
  if (!v) return "";
  if (/[^\d\s+\-()]/.test(v)) throw fieldErr(field, CONTACT[field], "зөвхөн тоо, +, -, зай бичнэ");
  const d = v.replace(/\D/g, "");
  if (/^0*$/.test(d)) return ""; // "0000-0000" гэх мэт жишээ дугаар
  if (d.length < 4 || d.length > 15) throw fieldErr(field, CONTACT[field], "дугаар буруу байна");
  return v;
}
function emailVal(v) {
  v = clean(v, 120);
  if (v && !/^[^\s@<>"'()]+@[^\s@<>"'()]+\.[^\s@<>"'()]+$/.test(v)) throw fieldErr("email", CONTACT.email, "хаяг буруу байна (жишээ нь info@evaclear.mn)");
  return v;
}
// Холбоос: зөвхөн http(s). @нэр, утасны дугаар, https:// -гүй хаягийг зөв холбоос болгоно.
function linkVal(v, net) {
  const label = SOCIAL[net] || CONTACT[net];
  v = clean(v, 300).replace(/\s+/g, "");
  if (!v) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^https?:\/\//i.test(v)) throw fieldErr(net, label, "зөвхөн http:// эсвэл https:// холбоос оруулна");
  if (!/^https?:\/\//i.test(v)) {
    if (net === "whatsapp" && /^\+?[\d()-]{6,}$/.test(v)) { let d = v.replace(/\D/g, ""); if (d.length === 8) d = "976" + d; v = "https://wa.me/" + d; }
    else if (net === "wechat" && /^@?[a-z0-9][\w-]{2,39}$/i.test(v)) return v.replace(/^@/, ""); // WeChat ID (нийтийн профайл холбоос байдаггүй)
    else if (/\//.test(v) || /^www\./i.test(v) || /^[\w-]+(\.[\w-]+)*\.(com|me|gg|mn|net|org|io|app|co|ru|cn)$/i.test(v)) v = "https://" + v;
    else if (HANDLE[net] && /^@?[\w.-]{1,100}$/.test(v)) v = HANDLE[net] + v.replace(/^@/, "");
    else throw fieldErr(net, label, "буруу байна — жишээ нь " + EXAMPLE[net]);
  }
  v = v.replace(/^https?/i, (m) => m.toLowerCase());
  let u = null;
  try { u = new URL(v); } catch {}
  if (!u || !/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || !/^https?:\/\/[^\s"'<>\\`]+$/.test(v) || v.length > 300) throw fieldErr(net, label, "холбоос буруу байна — жишээ нь " + EXAMPLE[net]);
  return v;
}
const quiet = (fn) => { try { return fn(); } catch { return ""; } };

function readSettings() {
  const shop = loadShopFile().SHOP || {}, saved = readData(SETTINGS, null);
  const def = { phone: quiet(() => phoneVal(shop.phone, "phone")), phone2: "", email: "", address: "", hours: "", messenger: quiet(() => linkVal(shop.messenger, "messenger")), social: {} };
  for (const k in SOCIAL) def.social[k] = k === "facebook" ? quiet(() => linkVal(shop.facebook, "facebook")) : "";
  if (!saved) return def;
  const s = {}, ss = saved.social || {};
  for (const k in CONTACT) s[k] = typeof saved[k] === "string" ? saved[k] : def[k];
  s.social = {};
  for (const k in SOCIAL) s.social[k] = typeof ss[k] === "string" ? ss[k] : def.social[k];
  return s;
}
// Ирсэн талбаруудыг шалгаж, хэвшүүлнэ (ирээгүй талбар хэвээр үлдэнэ)
function settingsFields(b, cur) {
  const s = { ...cur, social: { ...cur.social } }, bs = b.social && typeof b.social === "object" ? b.social : {};
  if ("phone" in b) s.phone = phoneVal(b.phone, "phone");
  if ("phone2" in b) s.phone2 = phoneVal(b.phone2, "phone2");
  if ("email" in b) s.email = emailVal(b.email);
  if ("address" in b) s.address = clean(b.address, 300);
  if ("hours" in b) s.hours = clean(b.hours, 200);
  if ("messenger" in b) s.messenger = linkVal(b.messenger, "messenger");
  for (const k in SOCIAL) if (k in bs) s.social[k] = linkVal(bs[k], k);
  return s;
}

function adminSettings(req, res) {
  send(res, 200, { settings: readSettings(), saved: fs.existsSync(SETTINGS) });
}
async function adminSaveSettings(req, res) {
  const b = await readJson(req);
  if (!b || typeof b !== "object") return send(res, 400, { error: "Буруу хүсэлт" });
  let s;
  try { s = settingsFields(b, readSettings()); } catch (e) { if (e.user) return send(res, 400, { error: e.message, field: e.field }); throw e; }
  writeData(SETTINGS, s);
  send(res, 200, { ok: true, settings: s });
}

const ADMIN_GET = { "/api/admin/orders": adminOrders, "/api/admin/products": adminProducts, "/api/admin/stock": adminStock, "/api/admin/settings": adminSettings };
const ADMIN_POST = {
  "/api/admin/order": adminUpdate, "/api/admin/product": adminSaveProduct, "/api/admin/product/delete": adminDeleteProduct,
  "/api/admin/upload": adminUpload, "/api/admin/stock": adminStockDoc, "/api/admin/stock/void": adminVoidDoc,
  "/api/admin/settings": adminSaveSettings,
};

seedProducts();

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const fail = (e) => { console.error(e); if (!res.headersSent) send(res, 500, { error: "Серверийн алдаа" }); };
  const admin = (fn) => (isAdmin(req) ? Promise.resolve().then(() => fn(req, res)).catch(fail) : send(res, 403, { error: "Хандах эрхгүй" }));
  try {
    if (req.method === "POST") {
      if (url.pathname === "/api/order") return handleOrder(req, res).catch(fail);
      if (url.pathname === "/api/payment/callback") return handleCallback(req, res).catch(fail);
      if (url.pathname === "/api/payment/demo-pay") return handleDemoPay(req, res).catch(fail);
      if (ADMIN_POST[url.pathname]) return admin(ADMIN_POST[url.pathname]);
    }
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" });
    if (url.pathname === "/api/order/status") return handleStatus(url, res).catch(fail);
    if (ADMIN_GET[url.pathname]) return admin(ADMIN_GET[url.pathname]);
    if (url.pathname === "/admin" || url.pathname === "/admin/") return send(res, 200, fs.readFileSync(path.join(__dirname, "admin.html")), TYPES[".html"]);
    if (url.pathname === "/products.js") {
      const st = readSettings(), json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
      const js = fs.readFileSync(path.join(PUBLIC, "products.js"), "utf8") + "\n// --- серверээс: products.json (админаас удирдана) ---\nwindow.PRODUCTS = " + json(publicProducts()) + ";\n" +
        "// --- серверээс: settings.json (холбоо барих, сошиал; админ → Тохиргоо) ---\n(function (s) { for (var k in s) window.SHOP[k] = s[k]; })(" + json({ ...st, facebook: st.social.facebook }) + ");\n";
      return send(res, 200, js, TYPES[".js"]);
    }
    const pm = /^\/p\/([^/]+)\/?$/.exec(url.pathname);
    if (pm) { let id; try { id = decodeURIComponent(pm[1]); } catch { id = ""; } return productPage(req, res, id); }
  } catch (e) { return fail(e); }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return send(res, 400, "Bad request", "text/plain"); }
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, "Олдсонгүй", "text/plain; charset=utf-8");
    send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
  });
}).listen(PORT, () => console.log(`EVA Clear дэлгүүр: http://localhost:${PORT}  (төлбөр: ${pay.name})`));
