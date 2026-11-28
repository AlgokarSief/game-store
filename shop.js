const S = window.STORE;
const sb = supabase.createClient(S.supabaseUrl, S.supabaseKey);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let products = [], cart = JSON.parse(localStorage.getItem("cart") || "[]"), wish = JSON.parse(localStorage.getItem("wish") || "[]"), user = null, curCat = "", slide = 0, timer;
document.querySelectorAll(".sn").forEach(e => e.textContent = S.name);
if (S.whatsapp) $("waLink").href = "https://wa.me/" + S.whatsapp, $("waLink").textContent = "راسلنا";
function toast(t) { const e = $("toast"); e.textContent = t; e.hidden = false; setTimeout(() => e.hidden = true, 2200); }
function openModal(html) { $("modalBody").innerHTML = html; $("modal").hidden = false; }
function closeModal() { $("modal").hidden = true; }
$("closeModal").onclick = closeModal; $("modal").onclick = e => { if (e.target.id === "modal") closeModal(); };
const money = n => Number(n).toLocaleString("en-US") + " جنيه";
function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); $("cartCount").textContent = cart.reduce((a, i) => a + i.qty, 0); }
function saveWish() { localStorage.setItem("wish", JSON.stringify(wish)); $("wishCount").textContent = wish.length; $("wishCount").hidden = !wish.length; }
function addToCart(id) { const it = cart.find(i => i.id === id); it ? it.qty++ : cart.push({ id, qty: 1 }); saveCart(); toast("اتضاف للسلة"); }
// Steam art: app id is read from the product image URL
const appOf = p => (String(p.image_url || "").match(/\/apps\/(\d+)\//) || [])[1];
const steamBase = p => String(p.image_url).split("/apps/")[0] + "/apps/" + appOf(p);
const heroImg = p => appOf(p) ? steamBase(p) + "/library_hero.jpg" : p.image_url;
const coverImg = p => appOf(p) ? steamBase(p) + "/library_600x900.jpg" : p.image_url;
const fb = "this.onerror=null;this.src=this.dataset.fb";
function feats() { return products.filter(p => p.image_url && p.in_stock).slice(0, 10); }
function buildHero() {
  const F = feats(); if (!F.length) return;
  $("slides").innerHTML = F.map((p, i) => `<div class="sl" data-i="${i}" style="background-image:url('${esc(heroImg(p))}'),url('${esc(p.image_url)}')"></div>`).join("");
  $("strip").innerHTML = F.map((p, i) => `<button class="th" data-i="${i}" aria-label="${esc(p.name)}"><img src="${esc(coverImg(p))}" data-fb="${esc(p.image_url)}" onerror="${fb}" onload="if(this.naturalWidth&&this.naturalWidth<500){${fb}}" alt=""></button>`).join("") + '<button class="th more" id="moreBtn" aria-label="كل المنتجات">▦</button>';
  $("dots").innerHTML = F.map((_, i) => `<i data-i="${i}"></i>`).join("");
  $("strip").querySelectorAll("[data-i]").forEach(b => b.onclick = () => go(+b.dataset.i));
  $("dots").querySelectorAll("[data-i]").forEach(b => b.onclick = () => go(+b.dataset.i));
  $("moreBtn").onclick = () => $("products").scrollIntoView({ behavior: "smooth" });
  go(0);
}
function go(i) {
  const F = feats(); if (!F.length) return; slide = (i + F.length) % F.length; const p = F[slide];
  document.querySelectorAll(".sl").forEach(e => e.classList.toggle("on", +e.dataset.i === slide));
  document.querySelectorAll(".th[data-i]").forEach(e => e.classList.toggle("on", +e.dataset.i === slide));
  document.querySelectorAll("#dots i").forEach(e => e.classList.toggle("on", +e.dataset.i === slide));
  $("cap").innerHTML = `<h2>${esc(p.name)}</h2><div class="pr">${money(p.price)}</div><button class="btn" data-hadd="${p.id}">أضف للسلة</button><button class="btn ghost" id="hmore">شوف كل المنتجات</button>`;
  $("cap").querySelector("[data-hadd]").onclick = () => addToCart(p.id);
  $("hmore").onclick = () => $("products").scrollIntoView({ behavior: "smooth" });
  clearInterval(timer); timer = setInterval(() => go(slide + 1), 6000);
}
$("next").onclick = () => go(slide - 1); $("prev").onclick = () => go(slide + 1);
function render() {
  const q = $("q").value.trim().toLowerCase();
  const list = products.filter(p => (!curCat || p.category === curCat) && (!q || p.name.toLowerCase().includes(q)));
  $("grid").innerHTML = list.length ? list.map(p => `<div class="pc ${p.in_stock ? "" : "oos"}"><button class="heart ${wish.includes(p.id) ? "on" : ""}" data-w="${p.id}" aria-label="المفضلة">${wish.includes(p.id) ? "♥" : "♡"}</button><div class="im">${p.image_url ? `<img loading="lazy" src="${esc(p.image_url)}" alt="${esc(p.name)}">` : esc(p.name.slice(0, 2).toUpperCase())}</div><div class="bd"><h3>${esc(p.name)}</h3><div class="ft"><span class="price">${money(p.price)}</span>${p.in_stock ? `<button class="add" data-add="${p.id}">أضف للسلة</button>` : `<span class="muted">غير متاح</span>`}</div></div></div>`).join("") : '<p class="muted">مفيش منتجات مطابقة.</p>';
  $("grid").querySelectorAll("[data-add]").forEach(b => b.onclick = () => addToCart(b.dataset.add));
  $("grid").querySelectorAll("[data-w]").forEach(b => b.onclick = () => { const id = b.dataset.w; wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id]; saveWish(); render(); });
}
function chips() {
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
  $("chips").innerHTML = ["", ...cats].map(c => `<button class="chip ${c === curCat ? "on" : ""}" data-c="${esc(c)}">${c ? esc(c) : "الكل"}</button>`).join("");
  $("chips").querySelectorAll("[data-c]").forEach(b => b.onclick = () => { curCat = b.dataset.c; chips(); render(); });
}
async function load() {
  const { data, error } = await sb.from("products").select("*").order("created_at");
  if (error) { $("grid").innerHTML = '<p class="muted">تعذر تحميل المنتجات.</p>'; return; }
  products = data; chips(); render(); buildHero();
}
$("sform").onsubmit = e => { e.preventDefault(); render(); $("products").scrollIntoView({ behavior: "smooth" }); };
$("q").oninput = render;
document.querySelectorAll("[data-q]").forEach(a => a.addEventListener("click", () => { $("q").value = a.dataset.q; render(); }));
document.querySelectorAll("[data-cat]").forEach(a => a.addEventListener("click", () => { curCat = a.dataset.cat; $("q").value = ""; chips(); render(); }));
$("wishBtn").onclick = () => {
  const L = wish.map(id => products.find(p => p.id === id)).filter(Boolean);
  if (!L.length) return openModal("<h3>المفضلة</h3><p class='muted'>لسه مفيش حاجة في المفضلة. دوس على القلب في أي لعبة.</p>");
  openModal(`<h3>المفضلة</h3>${L.map(p => `<div class="row"><span>${esc(p.name)} - ${money(p.price)}</span><span><button data-wa="${p.id}">🛒</button> <button data-wr="${p.id}">✕</button></span></div>`).join("")}`);
  $("modalBody").querySelectorAll("[data-wa]").forEach(b => b.onclick = () => addToCart(b.dataset.wa));
  $("modalBody").querySelectorAll("[data-wr]").forEach(b => b.onclick = () => { wish = wish.filter(x => x !== b.dataset.wr); saveWish(); render(); $("wishBtn").onclick(); });
};
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
  $("userBtn").textContent = user ? "خروج" : "تسجيل الدخول";
  if (user) { const { data: a } = await sb.rpc("is_admin"); $("adminLink").hidden = !a; } else $("adminLink").hidden = true;
}
$("userBtn").onclick = async () => { if (user) { await sb.auth.signOut(); } else showAuth(); };
sb.auth.onAuthStateChange(() => refreshUser());
saveCart(); saveWish(); load(); refreshUser();
