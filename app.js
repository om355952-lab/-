// app.js — نظام مطور: منتجات لكل روم + ألوان لاعبين + فواتير
const STORAGE_KEY = 'cave_state_v4';
let state = {
  products: [ {id:1,name:'مشروب غازي',price:15}, {id:2,name:'ساندوتش',price:25} ],
  rooms: [
    {id:'ps-1',type:'ps',mode:'time',name:'PS 1',status:'free',seconds:0,items:[],players:[]},
    {id:'ps-2',type:'ps',mode:'match',name:'PS 2',status:'free',seconds:0,items:[],players:[]},
    {id:'bil-1',type:'bil',mode:'pool',name:'ترابيزة 1',status:'free',seconds:0,items:[],players:[]},
    {id:'tennis-1',type:'tennis',mode:'single',name:'طاولة 1',status:'free',seconds:0,items:[],players:[]}
  ],
  prices: {
    ps: { match:30, hour:60 },
    bil: { pool:50, snooker:60, double:40 },
    tennis: { single:40, double:60 }
  },
  activity: []
};

function loadState(){ const raw = localStorage.getItem(STORAGE_KEY); if(raw) state = JSON.parse(raw); renderAll(); }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function uid(p='x'){ return p + Math.random().toString(36).slice(2,9); }
function addActivity(text){ state.activity.unshift({t:Date.now(),text}); if(state.activity.length>200) state.activity.pop(); saveState(); renderActivity(); }

// Navigation
function openPage(id){ document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); document.getElementById(id).classList.add('active'); }

// render everything
function renderAll(){ renderRooms(); renderProducts(); renderStats(); renderActivity(); populateRoomSelectors(); initAdminPrices(); updateNavbarTimer(); }
function renderStats(){ document.getElementById('stat-rooms').textContent = 'الغرف: ' + state.rooms.length; document.getElementById('stat-products').textContent = 'المنتجات: ' + state.products.length; }
function renderActivity(){ const el = document.getElementById('activity-log'); if(!el) return; el.innerHTML = state.activity.map(a=>`<div style="font-size:13px;color:#9fb7b4">${new Date(a.t).toLocaleString('ar-EG')} — ${a.text}</div>`).join(''); }

// rooms data
let counters = { ps: state.rooms.filter(r=>r.type==='ps').length, bil: state.rooms.filter(r=>r.type==='bil').length, tennis: state.rooms.filter(r=>r.type==='tennis').length };
let intervals = {};

// helpers
function formatHMS(sec){ const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function modeName(r){ if(r.type==='ps') return r.mode==='match'?'ماتش':'وقت'; if(r.type==='bil') return r.mode==='pool'?'Pool':(r.mode==='snooker'?'Snooker':'ثنائي'); if(r.type==='tennis') return r.mode==='double'?'ثنائي':'فردي'; return ''; }

// render rooms
function renderRooms(){
  ['ps','bil','tennis'].forEach(type=>{
    const container = document.getElementById(type+'-rooms'); if(!container) return; container.innerHTML='';
    state.rooms.filter(r=>r.type===type).forEach(r=>{
      const div = document.createElement('div'); div.className='room'; div.id='room-'+r.id;
      // players colors UI (for bil)
      let playersHtml = '';
      if(r.type==='bil'){
        const colors = ['#ff4b4b','#4b7bff','#4bff8a','#ffd24b'];
        if(!r.players || r.players.length===0) r.players = [{id:uid('p1'),color:colors[0]},{id:uid('p2'),color:colors[1]}];
        playersHtml = `<div>اللاعبين: 
          ${r.players.map((p,idx)=>`<span title="تغيير لون اللاعب ${idx+1}" class="player-color" style="background:${p.color}" onclick="changePlayerColor('${r.id}',${idx})"></span>`).join('')}
        </div>`;
      }
      // room cart UI
      const cartHtml = `<div class="cart-list" id="cart-${r.id}">${r.items.map(it=>`<div class="cart-item">${it.name} x${it.qty} <strong>${it.price*it.qty} ج</strong> <button onclick="removeItemFromRoom('${r.id}','${it.cid}')" style="background:transparent;border:none;color:#ff9999;cursor:pointer">حذف</button></div>`).join('')||'<div style="color:#9aa8b3">لا توجد منتجات</div>'}</div>`;

      div.innerHTML = `
        <h3>${r.name} — <span style="color:#9fb7b4;font-size:13px">${modeName(r)}</span></h3>
        <p>الحالة: <span class="status-${r.status}">${r.status==='free'?'متاح':(r.status==='busy'?'مشغول':'محجوز')}</span></p>
        ${playersHtml}
        <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap">
          ${r.type==='ps' ? `<button class="gaming-btn" onclick="startRoom('${r.id}')">بدء (وقت)</button>
                            <button class="gaming-btn" onclick="startMatch('${r.id}')">بدء مباراة</button>` : `<button class="gaming-btn" onclick="startRoom('${r.id}')">بدء</button>`}
          <button class="gaming-btn" onclick="presetTimer('${r.id}',30)">30</button>
          <button class="gaming-btn" onclick="openTimerOptions('${r.id}')">وقت مفتوح</button>
          <button class="gaming-btn" onclick="holdRoom('${r.id}')">حجز</button>
          <button class="gaming-btn" onclick="endSession('${r.id}')">إنهاء</button>
          <button class="gaming-btn" onclick="removeRoom('${r.id}')" style="background:transparent;border:1px solid rgba(255,255,255,0.06)">حذف</button>
        </div>
        <p>الوقت: <span id="time-${r.id}">${formatHMS(r.seconds)}</span></p>
        <div style="margin-top:8px">
          <select id="addprod-${r.id}">${state.products.map(p=>`<option value="${p.id}">${p.name} — ${p.price} ج</option>`).join('')}</select>
          <input id="addprodqty-${r.id}" type="number" value="1" min="1" style="width:70px" />
          <button class="gaming-btn" onclick="addProductToRoom('${r.id}')">أضف منتج للروم</button>
          <button class="gaming-btn" onclick="checkoutRoom('${r.id}')">تحصيل (Checkout)</button>
        </div>
        ${cartHtml}
      `;
      container.appendChild(div);
    });
  });
  updateNavbarTimer();
}

// add/remove rooms
function addRoomWithMode(type){
  let mode='';
  if(type==='ps'){ mode = prompt('اختر نمط البلايستيشن:\\n1 = وقت\\n2 = مباراة', '1') === '2' ? 'match' : 'time'; }
  else if(type==='bil'){ const v = prompt('اختر وضع البلياردو:\\n1 = Pool\\n2 = Snooker\\n3 = ثنائي', '1'); mode = v==='2'?'snooker':(v==='3'?'double':'pool'); }
  else if(type==='tennis'){ const v = prompt('اختر وضع التنس:\\n1 = فردي\\n2 = ثنائي', '1'); mode = v==='2'?'double':'single'; }
  counters[type] += 1;
  const id = `${type}-${counters[type]}`;
  const name = (type==='ps') ? `PS ${counters.ps}` : (type==='bil' ? `ترابيزة ${counters.bil}` : `طاولة ${counters.tennis}`);
  state.rooms.push({id, type, mode, name, status:'free', seconds:0, items:[], players:[]});
  saveState(); renderRooms(); addActivity(`أضيف ${name} — ${modeName({type,mode})}`);
  populateRoomSelectors();
}

function removeRoom(id){ if(!confirm('حذف الغرفة؟')) return; state.rooms = state.rooms.filter(r=>r.id!==id); saveState(); renderRooms(); addActivity('حذف '+id); populateRoomSelectors(); }

// player color change (billiard)
function changePlayerColor(roomId, playerIndex){
  const r = state.rooms.find(x=>x.id===roomId); if(!r) return;
  const color = prompt('ادخل لون بالHEX أو اسم لون (مثل #ff4b4b أو red)', r.players[playerIndex].color);
  if(color){ r.players[playerIndex].color = color; saveState(); renderRooms(); addActivity(`تغيير لون لاعب ${playerIndex+1} في ${r.name}`); }
}

// timing & sessions
function startRoom(id){
  const r = state.rooms.find(x=>x.id===id); if(!r) return;
  if(r.type==='ps' && r.mode==='match'){ return alert('هذا الجهاز بنمط مباريات — استخدم "بدء مباراة"'); }
  if(intervals[id]) clearInterval(intervals[id]);
  r.status='busy'; saveState(); renderRooms();
  intervals[id] = setInterval(()=>{ r.seconds += 1; const el = document.getElementById('time-'+id); if(el) el.textContent = formatHMS(r.seconds); updateNavbarTimer(); }, 1000);
  addActivity('بدء جلسة ' + r.name);
  updateNavbarTimer();
}

function presetTimer(id, minutes){
  const r = state.rooms.find(x=>x.id===id); if(!r) return;
  if(intervals[id]) { clearInterval(intervals[id]); intervals[id]=null; }
  r.status='busy'; saveState(); renderRooms();
  let left = minutes * 60;
  const label = document.getElementById('time-'+id);
  if(label) label.textContent = formatHMS(left);
  intervals[id] = setInterval(()=>{ left -= 1; if(label) label.textContent = formatHMS(left); if(left<=0){ clearInterval(intervals[id]); intervals[id]=null; r.status='free'; r.seconds=0; saveState(); renderRooms(); notifyEnd(r.id); addActivity('انتهت جلسة '+r.name); } }, 1000);
  addActivity(`بدء جلسة ${r.name} لمدة ${minutes} دقيقة`);
  updateNavbarTimer();
}

function openTimerOptions(id){
  const choice = prompt('1 = بدء عد تصاعدي\n2 = ادخال دقائق ثم تشغيل'); 
  if(choice==='1') startRoom(id);
  else if(choice==='2'){ const mins = parseInt(prompt('ادخل دقائق')); if(Number.isInteger(mins) && mins>0) presetTimer(id, mins); }
}

function startMatch(id){
  const r = state.rooms.find(x=>x.id===id); if(!r) return;
  if(r.type!=='ps' || r.mode!=='match') return alert('هذه الخاصية مخصصة لأجهزة البلايستيشن بوضع المباراة');
  const matches = parseInt(prompt('ادخل عدد المباريات (مثال: 1,2...)'), 10);
  if(!Number.isInteger(matches) || matches<=0) return;
  const pricePerMatch = state.prices.ps.match || 0;
  const total = Math.ceil(matches * pricePerMatch * 100) / 100;
  saveInvoice({id: uid('inv'),room:r.id,mode:'match',matches, total, t:Date.now()});
  addActivity(`تسجيل ${matches} مباراة على ${r.name} — ${total} ج`);
  alert(`تم تسجيل ${matches} مباراة\nالإجمالي: ${total} ج`);
  updateNavbarTimer();
}

// hold / end / checkout
function holdRoom(id){ const r = state.rooms.find(x=>x.id===id); if(!r) return; if(intervals[id]){ clearInterval(intervals[id]); intervals[id]=null; } r.status='held'; saveState(); renderRooms(); addActivity('حجز '+r.name); updateNavbarTimer(); }

function endSession(id){
  const r = state.rooms.find(x=>x.id===id); if(!r) return;
  if(intervals[id]){ clearInterval(intervals[id]); intervals[id]=null; }
  // حساب التكلفة بناءً على الوضع + منتجات الروم
  const secs = r.seconds || 0;
  let unitPrice = 0;
  if(r.type==='ps'){ unitPrice = state.prices.ps.hour || 0; }
  else if(r.type==='bil'){ unitPrice = r.mode==='pool'?state.prices.bil.pool:(r.mode==='snooker'?state.prices.bil.snooker:state.prices.bil.double); }
  else if(r.type==='tennis'){ unitPrice = r.mode==='double'?state.prices.tennis.double:state.prices.tennis.single; }
  const timeCost = Math.ceil((secs/3600) * unitPrice * 100) / 100;
  const prodCost = r.items.reduce((s,it)=>s + it.price*it.qty,0);
  const total = Math.ceil((timeCost + prodCost) * 100) / 100;
  // حفظ الفاتورة وطباعة
  const invoice = { id: uid('inv'), room: r.id, mode: r.mode, seconds: secs, timeCost, prodCost, total, items: r.items, t: Date.now() };
  saveInvoice(invoice);
  showInvoiceWindow(invoice);
  addActivity(`إنهاء جلسة ${r.name} — ${total} ج (وقت ${timeCost} + منتجات ${prodCost})`);
  // تفريغ روم
  r.seconds = 0; r.status='free'; r.items = []; saveState(); renderRooms(); updateNavbarTimer();
}

// add product to room + remove
function addProductToRoom(roomId){
  const sel = document.getElementById('addprod-'+roomId);
  const qtyEl = document.getElementById('addprodqty-'+roomId);
  const pid = parseInt(sel.value);
  const qty = parseInt(qtyEl.value)||1;
  const prod = state.products.find(p=>p.id===pid);
  if(!prod) return alert('المنتج غير موجود');
  const r = state.rooms.find(x=>x.id===roomId);
  const cid = uid('ci');
  r.items.push({cid, productId:prod.id, name:prod.name, price:prod.price, qty});
  saveState(); renderRooms(); addActivity(`أضف ${prod.name} x${qty} إلى ${r.name}`);
}

function removeItemFromRoom(roomId, cid){
  const r = state.rooms.find(x=>x.id===roomId); if(!r) return;
  r.items = r.items.filter(i=>i.cid!==cid); saveState(); renderRooms(); addActivity(`حذف عنصر من ${r.name}`);
}

// checkout room (تحصيل)
function checkoutRoom(roomId){
  const r = state.rooms.find(x=>x.id===roomId); if(!r) return;
  // حساب بسيط (مثل endSession ولكن بدون إعادة تعيين إذا أردت)
  const secs = r.seconds || 0;
  let unitPrice = 0;
  if(r.type==='ps'){ unitPrice = state.prices.ps.hour || 0; }
  else if(r.type==='bil'){ unitPrice = r.mode==='pool'?state.prices.bil.pool:(r.mode==='snooker'?state.prices.bil.snooker:state.prices.bil.double); }
  else if(r.type==='tennis'){ unitPrice = r.mode==='double'?state.prices.tennis.double:state.prices.tennis.single; }
  const timeCost = Math.ceil((secs/3600) * unitPrice * 100) / 100;
  const prodCost = r.items.reduce((s,it)=>s + it.price*it.qty,0);
  const total = Math.ceil((timeCost + prodCost) * 100) / 100;
  const invoice = { id: uid('inv'), room: r.id, mode: r.mode, seconds: secs, timeCost, prodCost, total, items: r.items, t: Date.now() };
  saveInvoice(invoice);
  showInvoiceWindow(invoice);
  // بعد التحصيل قد تريد إعادة تعيين: سأترك القرار لك؛ هنا نصفر المنتجات ولكن نترك الوقت إن أردت.
  r.items = []; saveState(); renderRooms(); addActivity(`تحصيل غرفة ${r.name} — ${total} ج`);
}

// standalone sale or add to room from products page
function populateRoomSelectors(){
  const sel = document.getElementById('sell-to-room-select');
  const appSel = document.getElementById('appletimer-room-select');
  if(sel) { sel.innerHTML = `<option value="">بيع مستقل</option>` + state.rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join(''); }
  if(appSel) { appSel.innerHTML = state.rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join(''); }
}

function sellSelectedProduct(){
  // يحصل اختيار المنتج من الselect في صفحة المنتجات (نستخدم العنصر الأول في products-list UI)
  const selRoom = document.getElementById('sell-to-room-select').value;
  const qty = parseInt(document.getElementById('prod-qty').value) || 1;
  // لنأخذ أول منتج المحدد في عرض المنتجات الحالي (أبسط طريقة): نطلب من المستخدم إدخال ID
  const pid = parseInt(prompt('ادخل رقم المنتج (ID) الذي تريد بيعه\n'+state.products.map(p=>`${p.id}: ${p.name} - ${p.price} ج`).join('\n')));
  if(!pid) return;
  const prod = state.products.find(p=>p.id===pid); if(!prod) return alert('المنتج غير موجود');
  if(selRoom){
    const r = state.rooms.find(x=>x.id===selRoom);
    const cid = uid('ci');
    r.items.push({cid, productId:prod.id, name:prod.name, price:prod.price, qty});
    saveState(); renderRooms(); addActivity(`بيع ${prod.name} x${qty} مضاف إلى ${r.name}`);
    alert('تمت الإضافة للغرفة');
  } else {
    // بيع مستقل: إصدار فاتورة فورية
    const total = prod.price * qty;
    const inv = { id: uid('inv'), room: null, mode: 'sale', seconds:0, timeCost:0, prodCost: total, total, items:[{name:prod.name,qty,price:prod.price}], t: Date.now() };
    saveInvoice(inv);
    showInvoiceWindow(inv);
    addActivity(`بيع مستقل: ${prod.name} x${qty} — ${total} ج`);
  }
  populateRoomSelectors();
}

// products UI
function renderProducts(){
  const el=document.getElementById('products-list'); if(!el) return; el.innerHTML='';
  state.products.forEach(p=>{ const d=document.createElement('div'); d.className='card'; d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${p.name}</strong><div style="color:#9fb7b4">${p.price} ج — ID:${p.id}</div></div><div><button class="gaming-btn" onclick="deleteProduct(${p.id})">حذف</button></div></div>`; el.appendChild(d); });
  document.getElementById('new-prod-name').value=''; document.getElementById('new-prod-price').value='';
  renderStats(); populateRoomSelectors();
}
function createProduct(){ const name=document.getElementById('new-prod-name').value.trim(); const price=parseFloat(document.getElementById('new-prod-price').value); if(!name||!price) return alert('ادخل اسم وسعر'); const id = state.products.length?Math.max(...state.products.map(p=>p.id))+1:1; state.products.push({id,name,price}); saveState(); renderProducts(); addActivity('اضافة منتج '+name); }
function deleteProduct(id){ if(!confirm('حذف المنتج؟')) return; state.products = state.products.filter(p=>p.id!==id); saveState(); renderProducts(); addActivity('حذف منتج'); }

// prices admin
function initAdminPrices(){
  if(document.getElementById('price-ps-match')) document.getElementById('price-ps-match').value = state.prices.ps.match;
  if(document.getElementById('price-ps-hour')) document.getElementById('price-ps-hour').value = state.prices.ps.hour;
  if(document.getElementById('price-bil-pool')) document.getElementById('price-bil-pool').value = state.prices.bil.pool;
  if(document.getElementById('price-bil-snooker')) document.getElementById('price-bil-snooker').value = state.prices.bil.snooker;
  if(document.getElementById('price-bil-double')) document.getElementById('price-bil-double').value = state.prices.bil.double;
  if(document.getElementById('price-tennis-single')) document.getElementById('price-tennis-single').value = state.prices.tennis.single;
  if(document.getElementById('price-tennis-double')) document.getElementById('price-tennis-double').value = state.prices.tennis.double;
}
function savePrices(){
  state.prices.ps.match = parseFloat(document.getElementById('price-ps-match').value) || state.prices.ps.match;
  state.prices.ps.hour = parseFloat(document.getElementById('price-ps-hour').value) || state.prices.ps.hour;
  state.prices.bil.pool = parseFloat(document.getElementById('price-bil-pool').value) || state.prices.bil.pool;
  state.prices.bil.snooker = parseFloat(document.getElementById('price-bil-snooker').value) || state.prices.bil.snooker;
  state.prices.bil.double = parseFloat(document.getElementById('price-bil-double').value) || state.prices.bil.double;
  state.prices.tennis.single = parseFloat(document.getElementById('price-tennis-single').value) || state.prices.tennis.single;
  state.prices.tennis.double = parseFloat(document.getElementById('price-tennis-double').value) || state.prices.tennis.double;
  saveState(); addActivity('تحديث الأسعار'); alert('تم حفظ الأسعار');
}

// invoices
function saveInvoice(inv){ const key='cave_invoices_v4'; let arr = JSON.parse(localStorage.getItem(key) || '[]'); arr.push(inv); localStorage.setItem(key, JSON.stringify(arr)); }
function showInvoiceWindow(inv){
  const win = window.open('','_blank','width=600,height=800');
  const itemsHtml = (inv.items||[]).map(i=>`<div>${i.name} x${i.qty} — ${i.price*i.qty} ج</div>`).join('');
  win.document.write(`<html><head><meta charset="utf-8"><title>فاتورة ${inv.id}</title></head><body><h2>فاتورة — الكَهْف</h2><div>رقم: ${inv.id}</div><div>الغرفة: ${inv.room||'بيع مستقل'}</div><div>الوقت: ${inv.seconds?formatHMS(inv.seconds):'--'}</div><div>تكلفة الوقت: ${inv.timeCost||0} ج</div><div>تكلفة المنتجات: ${inv.prodCost||0} ج</div><div style="margin-top:8px">المنتجات:<br>${itemsHtml||'<div>لا توجد</div>'}</div><h3>الإجمالي: ${inv.total} ج</h3><div style="margin-top:12px"><button onclick="window.print()">طباعة</button></div></body></html>`);
  win.document.close();
}

// notify
function notifyEnd(id){ try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.value=880; g.gain.value=0.06; o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(()=>{ o.stop(); ctx.close(); },900); }catch(e){} const orig=document.title; let f=0; const it=setInterval(()=>{ document.title = (f%2? '⏰ جلسة انتهت' : orig); f++; if(f>6){ clearInterval(it); document.title=orig; } },300); }

// appletimer from admin
function appletimerApply(minutes){
  const rid = document.getElementById('appletimer-room-select').value;
  if(!rid) return alert('اختر غرفة أولاً'); 
  if(minutes===0) openTimerOptions(rid); else presetTimer(rid, minutes);
  addActivity(`Appletimer applied: ${minutes===0?'Open Time':minutes+'min'} to ${rid}`);
}

// utility: remove intervals on page unload
window.addEventListener('beforeunload', ()=>{
  Object.values(intervals).forEach(i=>{ if(i) clearInterval(i); });
});

// init
function initUI(){ initAdminPrices(); renderAll(); }
loadState(); initUI();

// expose to window for inline handlers
window.openPage = openPage;
window.addRoomWithMode = addRoomWithMode;
window.startRoom = startRoom;
window.startMatch = startMatch;
window.presetTimer = presetTimer;
window.openTimerOptions = openTimerOptions;
window.holdRoom = holdRoom;
window.endSession = endSession;
window.removeRoom = removeRoom;
window.addProductToRoom = addProductToRoom;
window.removeItemFromRoom = removeItemFromRoom;
window.checkoutRoom = checkoutRoom;
window.createProduct = createProduct;
window.deleteProduct = deleteProduct;
window.savePrices = savePrices;
window.appletimerApply = appletimerApply;
window.sellSelectedProduct = sellSelectedProduct;
