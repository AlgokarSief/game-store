const S = window.STORE;
const sb = supabase.createClient(S.supabaseUrl, S.supabaseKey);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let products = [], cart = JSON.parse(localStorage.getItem("cart") || "[]"), user = null;
document.querySelectorAll(".sn").forEach(e => e.textContent = S.name);
$("burger").onclick = () => $("menu").classList.toggle("open");
document.querySelectorAll("#menu a").forEach(a => a.addEventListener("click", () => $("menu").classList.remove("open")));
if (S.whatsapp) $("waLink").href = "https://wa.me/" + S.whatsapp, $("waLink").textContent = "راسلنا";
function toast(t) { const e = $("toast"); e.textContent = t; e.hidden = false; setTimeout(() => e.hidden = true, 2200); }
function openModal(html) { $("modalBody").innerHTML = html; $("modal").hidden = false; }
function closeModal() { $("modal").hidden = true; }
$("closeModal").onclick = closeModal; $("modal").onclick = e => { if (e.target.id === "modal") closeModal(); };
const money = n => Number(n).toLocaleString("en-US") + " جنيه";
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); $("cartCount").textContent = cart.reduce((a, i) => a + i.qty, 0); }
function render() {
  const q = $("q").value.trim().toLowerCase(), c = $("cat").value;
  const list = products.filter(p => (!c || p.category === c) && (!q || p.name.toLowerCase().includes(q)));
  $("grid").innerHTML = list.length ? list.map(p => `<div class="card prod ${p.in_stock ? "" : "oos"}"><div class="ph">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : esc(p.name.slice(0, 2).toUpperCase())}</div><h3>${esc(p.name)}</h3><p class="price">${money(p.price)}</p>${p.in_stock ? `<button class="btn sm" data-add="${p.id}">أضف للسلة</button>` : `<p class="muted">غير متاح</p>`}</div>`).join("") : '<p class="muted">مفيش منتجات.</p>';
  $("grid").querySelectorAll("[data-add]").forEach(b => b.onclick = () => { const id = b.dataset.add, it = cart.find(i => i.id === id); it ? it.qty++ : cart.push({ id, qty: 1 }); saveCart(); toast("اتضاف للسلة"); });
}
async function load() {
  const { data, error } = await sb.from("products").select("*").order("created_at");
  if (error) { $("grid").innerHTML = '<p class="muted">تعذر تحميل المنتجات.</p>'; return; }
  products = data; const cats = [...new Set(data.map(p => p.category).filter(Boolean))];
  $("cat").innerHTML = '<option value="">كل الأقسام</option>' + cats.map(c => `<option>${esc(c)}</option>`).join("");
  render();
}
$("q").oninput = render; $("cat").onchange = render;
function cartLines() { return cart.map(i => { const p = products.find(x => x.id === i.id); return p ? { p, qty: i.qty } : null; }).filter(Boolean); }
function showCart() {
  const L = cartLines(), total = L.reduce((a, l) => a + l.p.price * l.qty, 0);
  if (!L.length) return openModal("<h3>السلة</h3><p class='muted'>السلة فاضية.</p>");
  openModal(`<h3>السلة</h3>${L.map(l => `<div class="row"><span>${esc(l.p.name)} × ${l.qty}</span><span>${money(l.p.price * l.qty)} <button data-rm="${l.p.id}">−</button></span></div>`).join("")}<p class="price" style="margin-top:10px">الإجمالي: ${money(total)}</p>
  <label>الاسم</label><input id="cn" value="${esc(user?.user_metadata?.name || "")}"><label>رقم الموبايل / واتساب</label><input id="cp" inputmode="tel"><button class="btn block" id="send">تأكيد الطلب</button><p class="err" id="cerr"></p><p class="muted" style="font-size:13px;margin-top:8px">هيتسجل الطلب وهيفتح واتساب لتأكيد الدفع (فودافون كاش / انستاباي).</p>`);
  $("modalBody").querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { const it = cart.find(i => i.id === b.dataset.rm); it.qty--; if (it.qty <= 0) cart = cart.filter(i => i !== it); saveCart(); showCart(); });
  $("send").onclick = async () => {
    const name = $("cn").value.trim(), phone = $("cp").value.trim();
    if (!name || phone.length < 8) { $("cerr").textContent = "اكتب الاسم ورقم صحيح."; return; }
    $("send").disabled = true;
    const items = L.map(l => ({ id: l.p.id, name: l.p.name, price: l.p.price, qty: l.qty }));
    const { error } = await sb.from("orders").insert({ customer_name: name, phone, items, total, user_id: user?.id ?? null });
    if (error) { $("cerr").textContent = "حصلت مشكلة، حاول تاني."; $("send").disabled = false; return; }
    const msg = `طلب جديد\nالاسم: ${name}\nالموبايل: ${phone}\n` + items.map(i => `- ${i.name} × ${i.qty}`).join("\n") + `\nالإجمالي: ${total} جنيه`;
    cart = []; saveCart();
    if (S.whatsapp) { location.href = "https://wa.me/" + S.whatsapp + "?text=" + encodeURIComponent(msg); }
    else openModal("<h3>تم تسجيل طلبك ✅</h3><p>هنتواصل معاك قريبا.</p>");
  };
}
$("cartBtn").onclick = showCart;
function showAuth(mode = "in") {
  openModal(`<h3>${mode === "in" ? "تسجيل الدخول" : "حساب جديد"}</h3>${mode === "up" ? '<label>الاسم</label><input id="an">' : ""}<label>الإيميل</label><input id="ae" type="email"><label>كلمة السر</label><input id="ap" type="password"><button class="btn block" id="go">${mode === "in" ? "دخول" : "إنشاء حساب"}</button><p class="err" id="aerr"></p><button class="link" id="sw">${mode === "in" ? "معندكش حساب؟ سجل" : "عندك حساب؟ ادخل"}</button>`);
  $("sw").onclick = () => showAuth(mode === "in" ? "up" : "in");
  $("go").onclick = async () => {
    const email = $("ae").value.trim(), password = $("ap").value;
    const r = mode === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password, options: { data: { name: $("an")?.value || "" } } });
    if (r.error) { $("aerr").textContent = r.error.message; return; }
    if (mode === "up" && !r.data.session) { openModal("<h3>تم ✅</h3><p>بعتنالك إيميل تأكيد، افتحه وأكد الحساب وبعدين ادخل.</p>"); return; }
    closeModal();
  };
}
async function refreshUser() {
  const { data } = await sb.auth.getSession(); user = data.session?.user ?? null;
  $("userBtn").textContent = user ? "خروج" : "دخول";
  if (user) { const { data: a } = await sb.rpc("is_admin"); $("adminLink").hidden = !a; } else $("adminLink").hidden = true;
}
$("userBtn").onclick = async () => { if (user) { await sb.auth.signOut(); } else showAuth(); };
sb.auth.onAuthStateChange(() => refreshUser());
saveCart(); load(); refreshUser();
