// ========== PAGE CONTROL ==========
function openPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

// ========== CLOCK ==========
function updateClock() {
    const now = new Date();
    document.getElementById("clock").textContent =
        now.toLocaleTimeString("ar-EG", { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// ========== ROOMS ==========
const roomsData = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    status: "free",
    start: null,
    cost: 0,
    cart: []
}));

function renderRooms() {
    const container = document.getElementById("roomsContainer");
    container.innerHTML = "";

    roomsData.forEach(room => {
        const div = document.createElement("div");
        div.className = "room";

        div.innerHTML = `
            <h3>غرفة ${room.id}</h3>
            <div>الحالة:
                <span class="status-${room.status}">
                ${room.status === "free" ? "متاحة" :
                   room.status === "busy" ? "مشغولة" : "محجوزة"}
                </span>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px">
                <button class="gaming-btn" onclick="startRoom(${room.id})">تشغيل</button>
                <button class="gaming-btn" onclick="holdRoom(${room.id})">حجز</button>
                <button class="gaming-btn" onclick="stopRoom(${room.id})">إيقاف</button>
            </div>

            <div style="margin-top:8px">التكلفة: <span id="cost${room.id}">${room.cost}</span> جنيه</div>
        `;

        container.appendChild(div);
    });
}

renderRooms();

function startRoom(id) {
    const r = roomsData.find(x => x.id === id);
    r.status = "busy";
    r.start = Date.now();
    renderRooms();
}

function stopRoom(id) {
    const r = roomsData.find(x => x.id === id);
    if (r.start) {
        const minutes = Math.ceil((Date.now() - r.start) / 60000);
        r.cost += minutes;
    }
    r.status = "free";
    r.start = null;
    renderRooms();
}

function holdRoom(id) {
    const r = roomsData.find(x => x.id === id);
    r.status = "held";
    renderRooms();
}

// ========== MARKET ==========
let productsList = [
    { name: "بيبسي", price: 15 },
    { name: "شيبسي", price: 12 },
];

function renderProducts() {
    const box = document.getElementById("products");
    box.innerHTML = "";

    productsList.forEach(p => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <h3>${p.name}</h3>
            <div>السعر: ${p.price} جنيه</div>
            <button class="gaming-btn fullwidth" onclick="addToCart('${p.name}')">إضافة</button>
        `;

        box.appendChild(div);
    });
}
renderProducts();

let cart = [];

function addToCart(name) {
    cart.push(name);
    renderCart();
}

function renderCart() {
    const box = document.getElementById("cart");
    box.innerHTML = "";

    cart.forEach((c, i) => {
        const div = document.createElement("div");
        div.className = "cart-item";

        div.innerHTML = `
            <div>${c}</div>
            <button onclick="removeFromCart(${i})">حذف</button>
        `;

        box.appendChild(div);
    });
}

function removeFromCart(i) {
    cart.splice(i, 1);
    renderCart();
}

function checkout() {
    if (cart.length === 0) return alert("العربة فارغة.");

    alert("تم شراء: " + cart.join(" + "));
    cart = [];
    renderCart();
}

// ========== ADMIN ==========
function addProduct() {
    const name = document.getElementById("pname").value.trim();
    const price = Number(document.getElementById("pprice").value);

    if (!name || !price) return alert("أدخل البيانات كاملة.");

    productsList.push({ name, price });
    renderProducts();
}

function deleteProduct() {
    const name = document.getElementById("delname").value.trim();

    productsList = productsList.filter(x => x.name !== name);
    renderProducts();
      }

