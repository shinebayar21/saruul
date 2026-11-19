// ============================================================
//  ТӨЛБӨРИЙН ХОЛБОЛТ
//  Одоогоор "demo" горим: ХУДЛАА QR гаргана, бодит мөнгө шилжихгүй.
//  Бодит төлбөр: wire.mn. WIRE_SECRET_KEY орчны хувьсагч тавихад автоматаар
//  Wire горимд шилжинэ (доорх `wire` объектыг үз).
// ============================================================
const crypto = require("crypto");
const QRCode = require("qrcode");

const qrImage = (text) => QRCode.toDataURL(text, { margin: 1, width: 320, color: { dark: "#16294a", light: "#ffffff" } });

const demo = {
  name: "demo",
  demo: true,

  // Захиалга үүсэхэд дуудагдана → нэхэмжлэх + QR буцаана
  async createInvoice(order) {
    const invoiceId = "DEMO-" + crypto.randomBytes(6).toString("hex");
    const qrText = `TURSHILT - bodit tulbur bish | EVA Clear #${order.orderNo} | ${order.total} MNT | ${invoiceId}`;
    return { invoiceId, qrImage: await qrImage(qrText), links: [] };
  },

  // Төлөгдсөн эсэхийг асууна. Demo-д зөвхөн "туршилтаар төлөх" товчоор төлөгдөнө.
  async checkInvoice(order) { return false; },

  // Төлбөрийн үйлчилгээнээс ирэх мэдэгдэл (webhook). Төлөгдсөн нэхэмжлэхийн дугаарыг буцаана.
  async verifyCallback(headers, body) { return null; },
};

// ---------- Wire (wire.mn) ----------
// Орчны хувьсагч:
//   WIRE_SECRET_KEY      — app.wire.mn → project → API key (sk_live_...)
//   WIRE_WEBHOOK_SECRET  — webhook endpoint үүсгэхэд НЭГ УДАА харагддаг нууц (whsec_...)
// Webhook хаяг: https://<домэйн>/api/payment/callback   (event: payment_intent.succeeded)
// Wire-д туршилтын горим байхгүй — түлхүүр тавьсан бол БОДИТ төлбөр болно.
const WIRE_API = "https://api.wire.mn";
const WIRE_KEY = process.env.WIRE_SECRET_KEY || "";
const WIRE_WHSEC = process.env.WIRE_WEBHOOK_SECRET || "";

async function wireCall(method, pathname, body) {
  const headers = { Authorization: "Bearer " + WIRE_KEY };
  if (method !== "GET") { headers["Content-Type"] = "application/json"; headers["Idempotency-Key"] = crypto.randomUUID(); }
  const r = await fetch(WIRE_API + pathname, { method, headers, body: method === "GET" ? undefined : JSON.stringify(body || {}), signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  let j = null;
  try { j = JSON.parse(text); } catch {}
  if (!r.ok || !j) {
    const err = j && (j.error || j);
    throw new Error(`Wire ${method} ${pathname} → ${r.status} ${(err && (err.code || err.message)) || text.slice(0, 200)}`);
  }
  return j;
}

const wire = {
  name: "wire",
  demo: false,

  async createInvoice(order) {
    if (!WIRE_KEY) throw new Error("WIRE_SECRET_KEY тохируулаагүй байна");
    const pi = await wireCall("POST", "/v1/payment_intents", {
      amount: order.total, currency: "MNT",
      description: `Захиалга #${order.orderNo}`,
      metadata: { order_no: String(order.orderNo) },
      payer_phone: order.phone,
    });
    const c = await wireCall("POST", `/v1/payment_intents/${encodeURIComponent(pi.id)}/confirm`, {});
    const next = c.next_action || {};
    if (next.type === "qr" && next.qr && next.qr.text) {
      const links = (next.qr.deeplinks || []).filter((d) => d && d.link).map((d) => ({ name: d.name || "Банкны апп", url: d.link }));
      return { invoiceId: pi.id, qrImage: await qrImage(next.qr.text), links };
    }
    throw new Error("Wire QR буцаасангүй (next_action: " + (next.type || "байхгүй") + ", status: " + c.status + ")");
  },

  // true = төлөгдсөн, "expired" = нэхэмжлэхийн хугацаа дууссан/цуцлагдсан, false = хүлээж байна
  async checkInvoice(order) {
    const id = order.payment && order.payment.invoiceId;
    if (!id) return false;
    const pi = await wireCall("GET", `/v1/payment_intents/${encodeURIComponent(id)}`);
    if (pi.status === "succeeded") return pi.amount === order.total;
    return pi.status === "canceled" ? "expired" : false;
  },

  // Гарын үсэг: WirePayment-Signature: t=<unix>,v1=hex(HMAC_SHA256(whsec, t + "." + raw_body))
  // Буцаах: төлөгдсөн нэхэмжлэхийн id | true (зөв мэдэгдэл, хийх зүйлгүй) | null (хуурамч)
  async verifyCallback(headers, body) {
    if (!WIRE_WHSEC) return null;
    const parts = {};
    String(headers["wirepayment-signature"] || "").split(",").forEach((p) => { const i = p.indexOf("="); if (i > 0) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
    const t = Number(parts.t);
    if (!t || !parts.v1 || Math.abs(Date.now() / 1000 - t) > 300) return null;
    const want = crypto.createHmac("sha256", WIRE_WHSEC).update(parts.t + "." + body).digest();
    const got = Buffer.from(parts.v1, "hex");
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
    let ev;
    try { ev = JSON.parse(body); } catch { return null; }
    if (ev.type !== "payment_intent.succeeded" || !ev.data || !ev.data.id) return true;
    // Мэдэгдэлд дангаар нь итгэхгүй — Wire-аас дахин асууж баталгаажуулна
    const pi = await wireCall("GET", `/v1/payment_intents/${encodeURIComponent(ev.data.id)}`);
    return pi.status === "succeeded" ? pi.id : true;
  },
};

const want = process.env.PAYMENT_PROVIDER || (WIRE_KEY ? "wire" : "demo");
module.exports = want === "wire" ? wire : demo;
