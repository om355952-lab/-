let rooms = [];

let prices = {
  ps4: 20, // السعر للساعة
  ps5: 30
};

function openAddRoom() {
  document.getElementById("addRoomPopup").style.display = "flex";
}

function closeAddRoom() {
  document.getElementById("addRoomPopup").style.display = "none";
}

function createRoom() {
  let type = document.getElementById("roomType").value;
  let offset = parseInt(document.getElementById("startOffset").value);

  let startTime = Date.now() - offset * 60000;

  let room = {
    id: Date.now(),
    type: type,
    start: startTime,
    interval: null
  };

  rooms.push(room);
  renderRooms();
  closeAddRoom();
}

function renderRooms() {
  let div = document.getElementById("rooms");
  div.innerHTML = "";

  rooms.forEach(r => {
    let mins = getMinutes(r);

    div.innerHTML += `
      <div class="room" id="room-${r.id}">
        <h3>غرفة ${r.type.toUpperCase()}</h3>
        <p>السعر: ${prices[r.type]} جنيه للساعة</p>

        <div class="timer-circle">
          <svg width="130" height="130">
            <circle cx="65" cy="65" r="55" stroke="#333" stroke-width="10" fill="none"></circle>

            <circle id="svg-${r.id}" cx="65" cy="65" r="55"
              stroke="#00e0ff" stroke-width="10" fill="none"
              stroke-dasharray="345"
              stroke-dashoffset="${345 - (mins % 60) * 5.75}">
            </circle>
          </svg>

          <div id="time-${r.id}" class="timer-text">${format(mins)}</div>
        </div>

        <p id="price-${r.id}">المبلغ حتى الآن: ${calcPrice(r)} جنيه</p>

        <button onclick="startRoom(${r.id})">▶ تشغيل</button>
        <button class="cancel-btn" onclick="stopRoom(${r.id})">⏹ إيقاف</button>
      </div>
    `;
  });
}

function getMinutes(room) {
  return Math.floor((Date.now() - room.start) / 60000);
}

function format(mins) {
  let h = Math.floor(mins / 60);
  let m = mins % 60;
  return `${h}:${m < 10 ? "0"+m : m}`;
}

function calcPrice(room) {
  let hours = getMinutes(room) / 60;
  return (hours * prices[room.type]).toFixed(2);
}

function startRoom(id) {
  let room = rooms.find(r => r.id === id);
  if (room.interval) return;

  room.interval = setInterval(() => updateRoom(id), 1000);
}

function stopRoom(id) {
  let room = rooms.find(r => r.id === id);
  clearInterval(room.interval);
  room.interval = null;
}

function updateRoom(id) {
  let room = rooms.find(r => r.id === id);
  let mins = getMinutes(room);

  document.getElementById(`time-${id}`).innerHTML = format(mins);
  document.getElementById(`svg-${id}`).style.strokeDashoffset =
      345 - (mins % 60) * 5.75;

  document.getElementById(`price-${id}`).innerHTML =
      "المبلغ حتى الآن: " + calcPrice(room) + " جنيه";
    }
