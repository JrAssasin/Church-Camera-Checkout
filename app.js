/* ==================================================
   FREEDOM CAMERA CHECKOUT SYSTEM
   app.js — v2.3.0
================================================== */

/* =========================
   EMAIL CONFIG
   Change REPORT_EMAIL to update where weekly
   reports are sent. No UI change needed.
========================= */

const EMAILJS_SERVICE  = "church_camera_checkout";
const EMAILJS_TEMPLATE = "template_smvy5ke";
const EMAILJS_KEY      = "sZhw_cHce5gUgLWRb";
const REPORT_EMAIL     = "Cheyenne.westlake@gmail.com";

/* =========================
   GLOBAL STATE
========================= */

let isAdminMode        = false;
let activeCameraIndex  = null;
let scannedUser        = null;
let loggedInAdmin      = null;
let activeTab          = "cameras";

let editingCameraIndex  = null;
let deletingCameraIndex = null;
let denyingRequestIndex = null;

let editingStaffId  = null;
let deletingStaffId = null;

let pendingStaffId  = null;
let cameraImageData = "";

// checkout flow state
let checkoutAction = null;   // "in" or "out"
let selectedSdCard = null;   // "SD Card 1" etc.
let selectedEvent  = null;   // "VBS", "Sunday Sing", etc.

/* =========================
   STORAGE KEYS
========================= */

const LS = {
  CAMERAS       : "cc_cameras",
  USERS         : "cc_users",
  LOGS          : "cc_logs",
  REQUESTS      : "cc_requests",
  LAST_REPORT   : "cc_last_report",
  EVENTS        : "cc_events"
};

/* =========================
   DEFAULT DATA
========================= */

const defaultCameras = [
  { name:"Nikon D610",           status:"in", user:"Available", image:"images/cameras/nikon_d610.png",         disabled:false, takeHome:false, requestsAllowed:true },
  { name:"Nikon Z6 II",          status:"in", user:"Available", image:"images/cameras/nikon_z6ii.png",          disabled:false, takeHome:false, requestsAllowed:true },
  { name:"Nikon Z6 II Big Lens", status:"in", user:"Available", image:"images/cameras/nikon_z6ii_big_lens.png", disabled:false, takeHome:false, requestsAllowed:true },
  { name:"Sony A7",              status:"in", user:"Available", image:"images/cameras/sony_a7.png",             disabled:false, takeHome:false, requestsAllowed:true },
  { name:"Canon Backup",         status:"in", user:"Available", image:"images/cameras/no_camera.png",           disabled:false, takeHome:false, requestsAllowed:true },
  { name:"Spare Camera",         status:"in", user:"Available", image:"images/cameras/no_camera.png",           disabled:false, takeHome:false, requestsAllowed:true }
];

const defaultUsers = {
  "173956":"Alexie Flook",
  "829517":"Amy Lopez",
  "582901":"Aspen Wheeler",
  "739615":"Brady Schauer",
  "915873":"Cat Maynard",
  "261958":"Cheyenne Wepking",
  "804619":"Ciara Barreto",
  "597183":"Izzy Wood",
  "681295":"Jacob Aban",
  "903175":"Jasmine Pender",
  "715982":"Katie Jones",
  "864591":"Morgan Murray",
  "592817":"Thomas Pasiecznik",
  "718593":"Zeke Panter",
  "936185":"Abby Dephouse",
  "843809":"Josh Wepking"
};

const admins = [
  "Cheyenne Wepking",
  "Izzy Wood",
  "Abby Dephouse",
  "Josh Wepking"
];

const roles = {
  "Josh Wepking" : "Lead Developer"
};

/* =========================
   LOAD STORAGE
========================= */

const cameras =
  JSON.parse(localStorage.getItem(LS.CAMERAS)) || structuredClone(defaultCameras);

const users =
  JSON.parse(localStorage.getItem(LS.USERS)) || structuredClone(defaultUsers);

let logs =
  JSON.parse(localStorage.getItem(LS.LOGS)) || [];

let requests =
  JSON.parse(localStorage.getItem(LS.REQUESTS)) || [];

// events list — admins manage these, users pick from them
let events =
  JSON.parse(localStorage.getItem(LS.EVENTS)) || [
    "VBS",
    "Sunday Service",
    "Sunday Sing",
    "Youth Group",
    "Special Event"
  ];

/* =========================
   SAVE HELPERS
========================= */

function saveCameras()  { localStorage.setItem(LS.CAMERAS,  JSON.stringify(cameras));  }
function saveUsers()    { localStorage.setItem(LS.USERS,    JSON.stringify(users));    }
function saveLogs()     { localStorage.setItem(LS.LOGS,     JSON.stringify(logs));     }
function saveRequests() { localStorage.setItem(LS.REQUESTS, JSON.stringify(requests)); }
function saveEvents()   { localStorage.setItem(LS.EVENTS,   JSON.stringify(events));   }

/* =========================
   LOGGING
========================= */

function addLog(action, detail){
  const displayName = loggedInAdmin
    ? (roles[loggedInAdmin]
        ? `${loggedInAdmin} (${roles[loggedInAdmin]})`
        : loggedInAdmin)
    : "System";

  logs.unshift({
    time  : new Date().toLocaleString(),
    action,
    detail,
    admin : displayName
  });
  saveLogs();
}

/* =========================
   DOM REFERENCES
========================= */

const grid        = document.getElementById("cameraGrid");
const adminToggle = document.getElementById("adminToggle");
const adminTabs   = document.getElementById("adminTabs");
const tabIcons    = adminTabs.querySelectorAll("img");

const cameraToolbar = document.getElementById("cameraToolbar");
const logFilters    = document.getElementById("logFilters");
const staffToolbar  = document.getElementById("staffToolbar");

// scan modal
const scanModal      = document.getElementById("scanModal");
const scanInput      = document.getElementById("scanInput");
const scanCameraName = document.getElementById("scanCameraName");
const scanTitle      = document.getElementById("scanTitle");
const scanConfirmBtn = document.getElementById("scanConfirmBtn");
const scanCancelBtn  = document.getElementById("scanCancelBtn");

// check in/out choice modal
const choiceModal   = document.getElementById("choiceModal");
const choiceTitle   = document.getElementById("choiceTitle");
const choiceCheckIn = document.getElementById("choiceCheckIn");
const choiceCheckOut= document.getElementById("choiceCheckOut");
const choiceCancel  = document.getElementById("choiceCancel");

// SD card modal
const sdModal       = document.getElementById("sdModal");
const sdCancelBtn   = document.getElementById("sdCancelBtn");

// confirm checkout modal
const confirmModal  = document.getElementById("confirmModal");
const confirmImage  = document.getElementById("confirmImage");
const confirmCamera = document.getElementById("confirmCamera");
const confirmUser   = document.getElementById("confirmUser");
const confirmYes    = document.getElementById("confirmYes");
const confirmNo     = document.getElementById("confirmNo");
const takeHomeBtn   = document.getElementById("takeHomeBtn");

// take-home reason modal
const takeHomeModal       = document.getElementById("takeHomeModal");
const takeHomeReasonInput = document.getElementById("takeHomeReasonInput");
const takeHomeSubmitBtn   = document.getElementById("takeHomeSubmitBtn");
const takeHomeCancelBtn   = document.getElementById("takeHomeCancelBtn");

// event modal
const eventModal       = document.getElementById("eventModal");
const eventSelect      = document.getElementById("eventSelect");
const eventCustomInput = document.getElementById("eventCustomInput");
const eventSubmitBtn   = document.getElementById("eventSubmitBtn");
const eventCancelBtn   = document.getElementById("eventCancelBtn");

// deny reason modal
const denyModal       = document.getElementById("denyModal");
const denyReasonInput = document.getElementById("denyReasonInput");
const denySubmitBtn   = document.getElementById("denySubmitBtn");
const denyCancelBtn   = document.getElementById("denyCancelBtn");

// error modal
const errorModal = document.getElementById("errorModal");
const errorOk    = document.getElementById("errorOk");

// camera modal
const cameraModal         = document.getElementById("cameraModal");
const cameraModalTitle    = document.getElementById("cameraModalTitle");
const cameraNameInput     = document.getElementById("cameraNameInput");
const cameraFileInput     = document.getElementById("cameraFileInput");
const imagePreview        = document.getElementById("imagePreview");
const imageDropZone       = document.getElementById("imageDropZone");
const cameraTakeHome      = document.getElementById("cameraTakeHome");
const cameraAllowRequests = document.getElementById("cameraAllowRequests");
const saveCameraBtn       = document.getElementById("saveCameraBtn");
const cancelCameraBtn     = document.getElementById("cancelCameraBtn");

// delete camera modal
const deleteCameraModal   = document.getElementById("deleteCameraModal");
const confirmDeleteCamera = document.getElementById("confirmDeleteCamera");
const cancelDeleteCamera  = document.getElementById("cancelDeleteCamera");

// staff modals
const staffEditModal   = document.getElementById("staffEditModal");
const staffModalTitle  = document.getElementById("staffModalTitle");
const staffNameInput   = document.getElementById("staffNameInput");
const staffAdminToggle = document.getElementById("staffAdminToggle");
const saveStaffBtn     = document.getElementById("saveStaffBtn");
const cancelStaffBtn   = document.getElementById("cancelStaffBtn");

const deleteStaffModal   = document.getElementById("deleteStaffModal");
const deleteStaffName    = document.getElementById("deleteStaffName");
const confirmDeleteStaff = document.getElementById("confirmDeleteStaff");
const cancelDeleteStaff  = document.getElementById("cancelDeleteStaff");

const staffConfirmModal  = document.getElementById("staffConfirmModal");
const staffConfirmName   = document.getElementById("staffConfirmName");
const staffConfirmId     = document.getElementById("staffConfirmId");
const staffRegenerate    = document.getElementById("staffRegenerate");
const staffConfirmYes    = document.getElementById("staffConfirmYes");
const staffConfirmCancel = document.getElementById("staffConfirmCancel");

/* =========================
   UTILITIES
========================= */

function generateID(){
  let id;
  do {
    id = Math.floor(100000 + Math.random() * 900000).toString();
  } while(users[id]);
  return id;
}

function updateAdminGlow(){
  document.body.classList.toggle("admin-active", isAdminMode);
}

function showModal(el) { el.classList.remove("hidden"); }
function hideModal(el) { el.classList.add("hidden");    }

function getRequestForCamera(cameraIndex){
  return requests.find(r => r.cameraIndex === cameraIndex) || null;
}

/* ==================================================
   LIVE CLOCK
================================================== */

function startClock(){
  const clockEl = document.getElementById("liveClock");
  if(!clockEl) return;

  function tick(){
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], {
      hour   : "2-digit",
      minute : "2-digit",
      second : "2-digit"
    });
  }

  tick();
  setInterval(tick, 1000);
}

/* ==================================================
   WEEKLY EMAIL REPORT
================================================== */

function checkWeeklyReport(){
  const lastSent = localStorage.getItem(LS.LAST_REPORT);
  const now      = Date.now();
  const oneWeek  = 7 * 24 * 60 * 60 * 1000;

  // send if never sent before, or it's been 7+ days
  if(!lastSent || (now - parseInt(lastSent)) >= oneWeek){
    sendWeeklyReport();
  }
}

function sendWeeklyReport(){
  // gather last 7 days of logs
  const oneWeek  = 7 * 24 * 60 * 60 * 1000;
  const cutoff   = Date.now() - oneWeek;

  const weekLogs = logs.filter(l => {
    return new Date(l.time).getTime() >= cutoff;
  });

  if(weekLogs.length === 0){
    // nothing to report — still update timestamp so we don't check every load
    localStorage.setItem(LS.LAST_REPORT, Date.now().toString());
    return;
  }

  const weekStr = new Date().toLocaleDateString([], {
    weekday : "long",
    year    : "numeric",
    month   : "long",
    day     : "numeric"
  });

  const logText = weekLogs.map(l =>
    `[${l.time}] ${l.action} — ${l.detail} (${l.admin})`
  ).join("\n");

  // load EmailJS SDK dynamically
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
  script.onload = () => {
    emailjs.init(EMAILJS_KEY);
    emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
      to_email : REPORT_EMAIL,
      week     : weekStr,
      logs     : logText
    }).then(() => {
      localStorage.setItem(LS.LAST_REPORT, Date.now().toString());
      console.log("Weekly report sent.");
    }).catch(err => {
      console.error("Email failed:", err);
    });
  };
  document.head.appendChild(script);
}

/* ==================================================
   ADMIN TOGGLE
================================================== */

adminToggle.onclick = () => {
  if(isAdminMode){
    isAdminMode   = false;
    loggedInAdmin = null;

    adminTabs.classList.add("hidden");
    adminToggle.src = "images/ui/admin_icon_off.png";

    tabIcons.forEach((icon, i) => {
      const names = ["cameras","logs","staff"];
      icon.src = `images/ui/${names[i]}_icon_off.png`;
    });

    activeTab = "cameras";
    updateAdminGlow();
    render();
    return;
  }

  openScanModal("Admin Login");
};

/* ==================================================
   TAB SWITCHING
================================================== */

function setActiveTab(index, name){
  activeTab = name;

  tabIcons.forEach((icon, i) => {
    const names = ["cameras","logs","staff"];
    icon.src = `images/ui/${names[i]}_icon_off.png`;
  });

  const names = ["cameras","logs","staff"];
  tabIcons[index].src = `images/ui/${names[index]}_icon_on.png`;

  render();
}

tabIcons[0].onclick = () => setActiveTab(0, "cameras");
tabIcons[1].onclick = () => setActiveTab(1, "logs");
tabIcons[2].onclick = () => setActiveTab(2, "staff");

/* ==================================================
   MAIN RENDER
================================================== */

function render(){
  cameraToolbar.classList.toggle("hidden", activeTab !== "cameras");
  logFilters.classList.toggle("hidden",    activeTab !== "logs");
  staffToolbar.classList.toggle("hidden",  activeTab !== "staff");

  if(activeTab === "cameras") renderCameras();
  if(activeTab === "logs")    renderLogs();
  if(activeTab === "staff")   renderStaff();

  renderRequestBadge();
}

/* ==================================================
   REQUEST BADGE
================================================== */

function renderRequestBadge(){
  let badge = document.getElementById("requestBadge");

  if(!isAdminMode || requests.length === 0){
    if(badge) badge.remove();
    return;
  }

  if(!badge){
    badge = document.createElement("div");
    badge.id = "requestBadge";
    badge.style.cssText = `
      position:fixed; top:12px; right:16px; z-index:300;
      background:#e63946; color:#fff; font-weight:700;
      font-size:.85rem; border-radius:999px; padding:6px 14px;
      box-shadow:0 4px 14px rgba(230,57,70,.4);
      cursor:pointer; animation:cardPop .2s ease;
    `;
    badge.onclick = () => setActiveTab(0, "cameras");
    document.body.appendChild(badge);
  }

  const count = requests.length;
  badge.textContent = count === 1 ? "1 Take-Home Request" : `${count} Take-Home Requests`;
}

/* ==================================================
   RENDER — CAMERAS
================================================== */

function renderCameras(){
  grid.innerHTML = "";

  // admin event manager panel at top
  if(isAdminMode){
    const panel = document.createElement("div");
    panel.className = "event-manager-panel";
    panel.style.cssText = `
      grid-column: 1 / -1;
      background: #fff;
      border-radius: 18px;
      padding: 16px 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,.08);
      margin-bottom: 4px;
    `;

    panel.innerHTML = `
      <div style="font-weight:700;font-size:.95rem;margin-bottom:12px">📅 Manage Events</div>
      <div id="eventTagList" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px">
        <input id="newEventInput" type="text" placeholder="Add new event..." style="
          flex:1;height:38px;border:2px solid #e0e0e0;border-radius:999px;
          padding:0 14px;font-size:.9rem;outline:none;
        ">
        <button id="addEventBtn" style="
          height:38px;padding:0 18px;border:none;border-radius:999px;
          background:#111;color:#fff;font-weight:700;cursor:pointer;
        ">Add</button>
      </div>
    `;

    grid.appendChild(panel);

    // populate event tags
    const tagList = panel.querySelector("#eventTagList");
    events.forEach((ev, i) => {
      const tag = document.createElement("div");
      tag.style.cssText = `
        display:flex;align-items:center;gap:6px;
        background:#f0f0f0;border-radius:999px;
        padding:5px 12px;font-size:.85rem;font-weight:600;
      `;
      tag.innerHTML = `
        <span>${ev}</span>
        <button data-i="${i}" style="
          background:none;border:none;cursor:pointer;
          font-size:1rem;color:#999;line-height:1;padding:0;
        ">×</button>
      `;
      tag.querySelector("button").onclick = () => {
        events.splice(i, 1);
        saveEvents();
        renderCameras();
      };
      tagList.appendChild(tag);
    });

    if(events.length === 0){
      tagList.innerHTML = `<span style="color:#aaa;font-size:.85rem">No events yet — add one below</span>`;
    }

    // add event button
    const addEventBtn   = panel.querySelector("#addEventBtn");
    const newEventInput = panel.querySelector("#newEventInput");

    const doAdd = () => {
      const val = newEventInput.value.trim();
      if(!val) return;
      if(!events.includes(val)){
        events.push(val);
        saveEvents();
      }
      newEventInput.value = "";
      renderCameras();
    };

    addEventBtn.onclick = doAdd;
    newEventInput.addEventListener("keydown", e => { if(e.key === "Enter") doAdd(); });
  }

  const searchVal = (document.getElementById("cameraSearchInput")?.value || "").toLowerCase();
  const sortVal   = document.getElementById("cameraSortSelect")?.value || "custom";

  let list = cameras
    .map((cam, index) => ({ cam, index }))
    .filter(({ cam }) => cam.name.toLowerCase().includes(searchVal));

  if(sortVal === "name"){
    list.sort((a,b) => a.cam.name.localeCompare(b.cam.name));
  } else if(sortVal === "status"){
    list.sort((a,b) => a.cam.status.localeCompare(b.cam.status));
  }
  // "custom" — no sort, uses cameras array order which is the admin-defined order

  list.forEach(({ cam, index }) => {
    const req = getRequestForCamera(index);

    const card = document.createElement("div");
    card.className = "camera-card fade-in";
    card.dataset.index = index;
    if(cam.disabled) card.classList.add("disabled");

    let statusLabel = cam.disabled
      ? "Disabled"
      : cam.status === "in"
        ? "Available"
        : "With " + cam.user + (cam.takeHome ? " • Take Home" : "");

    const requestBadgeHTML = req
      ? `<div class="camera-request-badge">📋 Take-Home Requested</div>`
      : "";

    // drag handle — only shown in admin mode with custom sort
    const dragHandleHTML = (isAdminMode && sortVal === "custom")
      ? `<div class="drag-handle" title="Drag to reorder">
           <span></span><span></span><span></span>
         </div>`
      : "";

    card.innerHTML = `
      <div class="camera-image" style="background-image:url('${cam.image}')">
        ${requestBadgeHTML}
        ${dragHandleHTML}
      </div>
      <div class="camera-status ${cam.status === "in" ? "status-in" : "status-out"}">
        ${statusLabel}
      </div>
      <div class="camera-footer">${cam.name}</div>
    `;

    if(!isAdminMode){
      card.onclick = () => {
        if(cam.disabled) return;
        activeCameraIndex = index;
        openScanModal(cam.name);
      };
    }

    if(isAdminMode){

      // drag and drop only when custom sort is active
      if(sortVal === "custom"){
        card.draggable = true;

        card.addEventListener("dragstart", e => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", index.toString());
          card.classList.add("dragging");
        });

        card.addEventListener("dragend", () => {
          card.classList.remove("dragging");
          document.querySelectorAll(".camera-card").forEach(c => c.classList.remove("drag-over"));
        });

        card.addEventListener("dragover", e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          document.querySelectorAll(".camera-card").forEach(c => c.classList.remove("drag-over"));
          card.classList.add("drag-over");
        });

        card.addEventListener("dragleave", () => {
          card.classList.remove("drag-over");
        });

        card.addEventListener("drop", e => {
          e.preventDefault();
          card.classList.remove("drag-over");

          const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
          const toIndex   = index;

          if(fromIndex === toIndex) return;

          // reorder cameras array
          const moved = cameras.splice(fromIndex, 1)[0];
          cameras.splice(toIndex, 0, moved);

          // also reorder any requests that reference these indexes
          requests.forEach(r => {
            if(r.cameraIndex === fromIndex) r.cameraIndex = toIndex;
            else if(fromIndex < toIndex && r.cameraIndex > fromIndex && r.cameraIndex <= toIndex){
              r.cameraIndex--;
            } else if(fromIndex > toIndex && r.cameraIndex >= toIndex && r.cameraIndex < fromIndex){
              r.cameraIndex++;
            }
          });

          saveCameras();
          saveRequests();
          renderCameras();
        });
      }

      const controls = document.createElement("div");
      controls.className = "admin-camera-controls";

      const split = document.createElement("div");
      split.className = "admin-split-button";

      const checkIn = document.createElement("button");
      checkIn.className   = "checkin-btn";
      checkIn.textContent = "Check In";
      checkIn.onclick = e => {
        e.stopPropagation();
        cam.status   = "in";
        cam.user     = "Available";
        cam.takeHome = false;
        requests = requests.filter(r => r.cameraIndex !== index);
        saveRequests();
        saveCameras();
        addLog("Check In", cam.name);
        render();
      };

      const checkOut = document.createElement("button");
      checkOut.className   = "checkout-btn";
      checkOut.textContent = "Check Out";
      checkOut.onclick = e => {
        e.stopPropagation();
        activeCameraIndex = index;
        openScanModal(cam.name);
      };

      split.append(checkIn, checkOut);

      if(req){
        const reqRow = document.createElement("div");
        reqRow.className = "request-row";
        reqRow.innerHTML = `
          <div class="request-label">📋 <strong>${req.userName}</strong> wants to take home</div>
          ${req.reason ? `<div class="request-reason">"${req.reason}"</div>` : ""}
        `;

        const acceptBtn = document.createElement("button");
        acceptBtn.className   = "admin-btn-enable";
        acceptBtn.textContent = "✓ Approve Take Home";
        acceptBtn.onclick = e => {
          e.stopPropagation();
          cam.status   = "out";
          cam.user     = req.userName;
          cam.takeHome = true;
          requests = requests.filter(r => r.cameraIndex !== index);
          saveRequests();
          saveCameras();
          addLog("Approved Take Home", `${cam.name} — ${req.userName}`);
          render();
        };

        const denyBtn = document.createElement("button");
        denyBtn.className   = "admin-btn-disable";
        denyBtn.textContent = "✕ Deny Request";
        denyBtn.onclick = e => {
          e.stopPropagation();
          openDenyModal(index);
        };

        controls.append(reqRow, acceptBtn, denyBtn, split);
      } else {
        controls.append(split);
      }

      const editBtn = document.createElement("button");
      editBtn.className   = "admin-btn-out";
      editBtn.textContent = "Edit Camera";
      editBtn.onclick = e => { e.stopPropagation(); openCameraModal(index); };

      const disableBtn = document.createElement("button");
      disableBtn.className   = cam.disabled ? "admin-btn-enable" : "admin-btn-disable";
      disableBtn.textContent = cam.disabled ? "Enable Camera"    : "Disable Camera";
      disableBtn.onclick = e => {
        e.stopPropagation();
        if(!cam.disabled){
          openGenericConfirm(
            `Disable "${cam.name}"?`,
            "The camera will be unavailable for checkout.",
            () => { cam.disabled = true; saveCameras(); addLog("Disabled Camera", cam.name); render(); }
          );
        } else {
          cam.disabled = false; saveCameras(); addLog("Enabled Camera", cam.name); render();
        }
      };

      const requestToggleBtn = document.createElement("button");
      requestToggleBtn.className   = cam.requestsAllowed ? "admin-btn-history" : "admin-btn-enable";
      requestToggleBtn.textContent = cam.requestsAllowed ? "🚫 Block Requests"  : "✓ Allow Requests";
      requestToggleBtn.onclick = e => {
        e.stopPropagation();
        cam.requestsAllowed = !cam.requestsAllowed;
        if(!cam.requestsAllowed){
          requests = requests.filter(r => r.cameraIndex !== index);
          saveRequests();
          addLog("Blocked Take-Home Requests", cam.name);
        } else {
          addLog("Allowed Take-Home Requests", cam.name);
        }
        saveCameras();
        render();
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className   = "admin-btn-disable";
      deleteBtn.textContent = "Delete Camera";
      deleteBtn.onclick = e => { e.stopPropagation(); openDeleteCamera(index); };

      controls.append(editBtn, disableBtn, requestToggleBtn, deleteBtn);
      card.appendChild(controls);
    }

    grid.appendChild(card);
  });

  if(isAdminMode){
    const addCard = document.createElement("div");
    addCard.className = "camera-card add-camera-card";
    addCard.innerHTML = `
      <div class="camera-image add-camera-image">+</div>
      <div class="camera-footer">Add Camera</div>
    `;
    addCard.onclick = () => openCameraModal(null);
    grid.appendChild(addCard);
  }
}

document.getElementById("cameraSearchInput")
  ?.addEventListener("input",  () => { if(activeTab === "cameras") renderCameras(); });
document.getElementById("cameraSortSelect")
  ?.addEventListener("change", () => { if(activeTab === "cameras") renderCameras(); });

/* ==================================================
   RENDER — LOGS
================================================== */

function renderLogs(){
  grid.innerHTML = "";

  const search    = (document.getElementById("logSearchInput")?.value  || "").toLowerCase();
  const typeVal   = document.getElementById("logTypeFilter")?.value    || "all";
  const dateVal   = document.getElementById("logDateFilter")?.value    || "";
  const eventVal  = document.getElementById("logEventFilter")?.value   || "all";

  // populate event filter dropdown with current events
  const eventFilter = document.getElementById("logEventFilter");
  if(eventFilter && eventFilter.dataset.populated !== "true"){
    eventFilter.innerHTML = `<option value="all">All Events</option>`;
    events.forEach(ev => {
      const opt = document.createElement("option");
      opt.value = ev; opt.textContent = ev;
      eventFilter.appendChild(opt);
    });
    eventFilter.dataset.populated = "true";
  }

  let list = logs.filter(log => {
    const matchSearch = (log.action + log.detail + log.admin).toLowerCase().includes(search);
    const matchType   = typeVal === "all" || log.action.toLowerCase().includes(typeVal);
    const matchEvent  = eventVal === "all" || log.detail.toLowerCase().includes(eventVal.toLowerCase());
    return matchSearch && matchType && matchEvent;
  });

  if(dateVal){
    const target = new Date(dateVal + "T12:00:00").toLocaleDateString();
    list = list.filter(log => log.time.includes(target));
  }

  if(list.length === 0){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#888;padding:40px">No logs found.</div>`;
    return;
  }

  list.forEach(log => {
    const card = document.createElement("div");
    card.className = "log-card fade-in";
    card.innerHTML = `
      <div class="log-title">${log.action}</div>
      <div class="log-detail">${log.detail}</div>
      <div class="log-footer">${log.time} — ${log.admin}</div>
    `;
    grid.appendChild(card);
  });
}

document.getElementById("logSearchInput")
  ?.addEventListener("input",  () => { if(activeTab === "logs") renderLogs(); });
document.getElementById("logTypeFilter")
  ?.addEventListener("change", () => { if(activeTab === "logs") renderLogs(); });
document.getElementById("logDateFilter")
  ?.addEventListener("change", () => { if(activeTab === "logs") renderLogs(); });

document.getElementById("exportLogsBtn")
  ?.addEventListener("click", () => {
    const rows = ["Time,Action,Detail,Admin"];
    logs.forEach(l => {
      const row = [l.time, l.action, l.detail, l.admin]
        .map(v => `"${(v||"").replace(/"/g,'""')}"`)
        .join(",");
      rows.push(row);
    });
    const blob = new Blob([rows.join("\n")], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "camera_checkout_logs.csv"; a.click();
    URL.revokeObjectURL(url);
  });

/* ==================================================
   RENDER — STAFF
================================================== */

function renderStaff(){
  grid.innerHTML = "";

  const search = (document.getElementById("staffSearchInput")?.value || "").toLowerCase();

  const entries = Object.entries(users)
    .filter(([id, name]) => name.toLowerCase().includes(search) || id.includes(search))
    .sort((a, b) => a[1].localeCompare(b[1]));

  entries.forEach(([id, name]) => {
    const isAdminUser = admins.includes(name);
    const roleTitle   = roles[name] || null;

    let badgeHTML = "";
    if(roleTitle){
      badgeHTML = `<div class="staff-admin-badge staff-role-badge">${roleTitle}</div>`;
    } else if(isAdminUser){
      badgeHTML = `<div class="staff-admin-badge">Admin</div>`;
    }

    const card = document.createElement("div");
    card.className = "staff-card fade-in";
    card.innerHTML = `
      <div class="staff-name">${name}</div>
      <div class="staff-id">${id}</div>
      ${badgeHTML}
      <div class="staff-controls">
        <button class="staff-edit">Edit</button>
        <button class="staff-delete">Delete</button>
      </div>
    `;

    card.querySelector(".staff-edit").onclick   = () => openStaffModal(id);
    card.querySelector(".staff-delete").onclick = () => openDeleteStaff(id, name);
    grid.appendChild(card);
  });

  const addCard = document.createElement("div");
  addCard.className = "staff-card add-staff-card";
  addCard.style.cssText = `
    border:3px dashed #bbb; background:#f7f7f7; border-radius:22px;
    display:flex; flex-direction:column; align-items:center;
    justify-content:center; cursor:pointer; min-height:140px; transition:.15s;
  `;
  addCard.innerHTML = `
    <div style="font-size:48px;color:#aaa;line-height:1">+</div>
    <div style="font-weight:700;color:#666;margin-top:8px">Add Staff</div>
  `;
  addCard.onmouseenter = () => { addCard.style.borderColor="#000"; addCard.style.background="#eee"; };
  addCard.onmouseleave = () => { addCard.style.borderColor="#bbb"; addCard.style.background="#f7f7f7"; };
  addCard.onclick = () => openStaffModal(null);
  grid.appendChild(addCard);
}

document.getElementById("staffSearchInput")
  ?.addEventListener("input", () => { if(activeTab === "staff") renderStaff(); });

/* ==================================================
   STAFF MODAL
================================================== */

function openStaffModal(id){
  editingStaffId = id;
  if(id === null){
    staffModalTitle.textContent = "Add Staff Member";
    staffNameInput.value        = "";
    staffAdminToggle.checked    = false;
  } else {
    const name = users[id];
    staffModalTitle.textContent = "Edit Staff Member";
    staffNameInput.value        = name;
    staffAdminToggle.checked    = admins.includes(name);
  }
  showModal(staffEditModal);
  staffNameInput.focus();
}

saveStaffBtn.onclick = () => {
  const name = staffNameInput.value.trim();
  if(!name){ staffNameInput.style.outline = "2px solid red"; return; }
  staffNameInput.style.outline = "";

  const isAdminChecked = staffAdminToggle.checked;

  if(editingStaffId === null){
    pendingStaffId = generateID();
    staffConfirmName.textContent      = name;
    staffConfirmId.textContent        = "ID: " + pendingStaffId;
    staffConfirmModal.dataset.name    = name;
    staffConfirmModal.dataset.isAdmin = isAdminChecked ? "true" : "false";
    hideModal(staffEditModal);
    showModal(staffConfirmModal);
  } else {
    const oldName = users[editingStaffId];
    users[editingStaffId] = name;
    const adminIdx = admins.indexOf(oldName);
    if(isAdminChecked && adminIdx === -1) admins.push(name);
    else if(!isAdminChecked && adminIdx !== -1) admins.splice(adminIdx, 1);
    if(oldName !== name){ const i = admins.indexOf(oldName); if(i !== -1) admins[i] = name; }
    saveUsers();
    addLog("Edited Staff", name);
    hideModal(staffEditModal);
    render();
  }
};

cancelStaffBtn.onclick = () => hideModal(staffEditModal);

staffRegenerate.onclick = () => {
  pendingStaffId             = generateID();
  staffConfirmId.textContent = "ID: " + pendingStaffId;
};

staffConfirmYes.onclick = () => {
  const name  = staffConfirmModal.dataset.name;
  const isAdm = staffConfirmModal.dataset.isAdmin === "true";
  users[pendingStaffId] = name;
  if(isAdm && !admins.includes(name)) admins.push(name);
  saveUsers();
  addLog("Added Staff", `${name} (ID: ${pendingStaffId})`);
  hideModal(staffConfirmModal);
  render();
};

staffConfirmCancel.onclick = () => {
  hideModal(staffConfirmModal);
  showModal(staffEditModal);
};

/* ==================================================
   DELETE STAFF
================================================== */

function openDeleteStaff(id, name){
  deletingStaffId = id;
  deleteStaffName.textContent = `Delete "${name}"?`;
  showModal(deleteStaffModal);
}

confirmDeleteStaff.onclick = () => {
  if(deletingStaffId === null) return;
  const name = users[deletingStaffId];
  const idx  = admins.indexOf(name);
  if(idx !== -1) admins.splice(idx, 1);
  delete users[deletingStaffId];
  saveUsers();
  addLog("Deleted Staff", name);
  hideModal(deleteStaffModal);
  deletingStaffId = null;
  render();
};

cancelDeleteStaff.onclick = () => {
  hideModal(deleteStaffModal);
  deletingStaffId = null;
};

/* ==================================================
   ID ENTRY MODAL
   — manual confirm button, no auto-submit
================================================== */

function openScanModal(context){
  scanCameraName.textContent = context === "Admin Login" ? "" : context;
  scanTitle.textContent      = context === "Admin Login" ? "Admin Login" : "Enter Your ID Code";
  scanInput.value            = "";
  scanConfirmBtn.disabled       = true;
  scanConfirmBtn.style.opacity  = "0.4";
  showModal(scanModal);
  setTimeout(() => scanInput.focus(), 80);
}

// enable confirm button only when 6 digits entered
scanInput.addEventListener("input", () => {
  const ready = scanInput.value.length === 6;
  scanConfirmBtn.disabled      = !ready;
  scanConfirmBtn.style.opacity = ready ? "1" : "0.4";
});

// confirm button submits
scanConfirmBtn.onclick = () => {
  if(scanInput.value.length === 6) handleScan(scanInput.value);
};

scanCancelBtn.onclick = () => {
  hideModal(scanModal);
  activeCameraIndex = null;
  scannedUser       = null;
  checkoutAction    = null;
};

function handleScan(id){
  hideModal(scanModal);

  const name = users[id];
  if(!name){ showModal(errorModal); return; }

  scannedUser = name;

  // admin login path
  if(scanTitle.textContent === "Admin Login"){
    if(admins.includes(name)){
      isAdminMode   = true;
      loggedInAdmin = name;

      adminTabs.classList.remove("hidden");
      adminToggle.src = "images/ui/admin_icon_on.png";

      tabIcons.forEach((icon, i) => {
        const names = ["cameras","logs","staff"];
        icon.src = `images/ui/${names[i]}_icon_off.png`;
      });
      tabIcons[0].src = "images/ui/cameras_icon_on.png";
      activeTab = "cameras";

      updateAdminGlow();
      addLog("Admin Login", name);
      render();
    } else {
      showModal(errorModal);
    }
    return;
  }

  // show check in / out choice screen
  openChoiceModal(name);
}

/* ==================================================
   CHECK IN / OUT CHOICE MODAL
================================================== */

function openChoiceModal(name){
  const cam = cameras[activeCameraIndex];
  choiceTitle.textContent = `${name} — ${cam.name}`;

  if(cam.status === "out" && cam.user !== name){
    // camera is checked out by someone else — block student
    hideModal(choiceModal);
    activeCameraIndex = null;
    scannedUser       = null;
    checkoutAction    = null;
    showOwnershipError(cam.user);
    return;
  }

  if(cam.status === "out" && cam.user === name){
    // their own camera — show check in only
    choiceCheckIn.style.display  = "block";
    choiceCheckOut.style.display = "none";
  } else {
    // camera is available — show check out only
    choiceCheckIn.style.display  = "none";
    choiceCheckOut.style.display = "block";
  }

  showModal(choiceModal);
}

choiceCheckIn.onclick = () => {
  checkoutAction = "in";
  hideModal(choiceModal);
  showConfirmModal();
};

choiceCheckOut.onclick = () => {
  checkoutAction = "out";
  hideModal(choiceModal);
  openSdModal();
};

choiceCancel.onclick = () => {
  hideModal(choiceModal);
  activeCameraIndex = null;
  scannedUser       = null;
  checkoutAction    = null;
};

/* ==================================================
   SD CARD SELECTION MODAL
================================================== */

function openSdModal(){
  selectedSdCard = null;

  // wire up the SD card buttons dynamically
  const sdButtons = document.querySelectorAll(".sd-btn");
  sdButtons.forEach(btn => {
    btn.onclick = () => {
      selectedSdCard = btn.dataset.sd;
      hideModal(sdModal);
      openEventModal();   // go to event selection next
    };
  });

  showModal(sdModal);
}

sdCancelBtn.onclick = () => {
  hideModal(sdModal);
  // go back to choice
  openChoiceModal(scannedUser);
};

/* ==================================================
   EVENT SELECTION MODAL
   Opens after SD card selection
   Admins can manage the list from the camera tab
================================================== */

function openEventModal(){
  selectedEvent = null;

  // populate the select dropdown with current events
  eventSelect.innerHTML = `<option value="">-- Select an event --</option>`;
  events.forEach(ev => {
    const opt = document.createElement("option");
    opt.value       = ev;
    opt.textContent = ev;
    eventSelect.appendChild(opt);
  });

  eventCustomInput.value  = "";
  eventSubmitBtn.disabled = true;
  eventSubmitBtn.style.opacity = "0.4";

  showModal(eventModal);
}

// enable submit when either select has a value or custom input has text
function updateEventSubmit(){
  const hasSelection = eventSelect.value !== "";
  const hasCustom    = eventCustomInput.value.trim().length > 0;
  const ready        = hasSelection || hasCustom;
  eventSubmitBtn.disabled      = !ready;
  eventSubmitBtn.style.opacity = ready ? "1" : "0.4";
}

eventSelect.addEventListener("change", () => {
  // if they pick from dropdown, clear custom input
  if(eventSelect.value) eventCustomInput.value = "";
  updateEventSubmit();
});

eventCustomInput.addEventListener("input", () => {
  // if they type custom, clear dropdown
  if(eventCustomInput.value.trim()) eventSelect.value = "";
  updateEventSubmit();
});

eventSubmitBtn.onclick = () => {
  const custom    = eventCustomInput.value.trim();
  const fromList  = eventSelect.value;
  selectedEvent   = custom || fromList;

  if(!selectedEvent) return;

  // if custom and not already in list, save it (Option B)
  if(custom && !events.includes(custom)){
    events.push(custom);
    saveEvents();
  }

  hideModal(eventModal);
  showConfirmModal();
};

eventCancelBtn.onclick = () => {
  hideModal(eventModal);
  // go back to SD card selection
  openSdModal();
};

/* ==================================================
   CONFIRM CHECKOUT MODAL
================================================== */

function showConfirmModal(){
  const cam = cameras[activeCameraIndex];

  confirmImage.src  = cam.image;
  confirmCamera.textContent = cam.name;

  if(checkoutAction === "out"){
    const sdPart    = selectedSdCard ? ` • ${selectedSdCard}` : "";
    const evPart    = selectedEvent  ? ` • ${selectedEvent}`  : "";
    confirmUser.textContent = `Check out to ${scannedUser}${sdPart}${evPart}`;
  } else {
    confirmUser.textContent = `Check in from ${cam.user}`;
  }

  const canRequest = checkoutAction === "out" && cam.requestsAllowed !== false;
  takeHomeBtn.style.display = canRequest ? "inline-block" : "none";

  showModal(confirmModal);
}

confirmYes.onclick = () => doCheckout(false);

takeHomeBtn.onclick = () => {
  hideModal(confirmModal);
  openTakeHomeModal();
};

confirmNo.onclick = () => {
  hideModal(confirmModal);
  activeCameraIndex = null;
  scannedUser       = null;
  checkoutAction    = null;
  selectedSdCard    = null;
  selectedEvent     = null;
};

function doCheckout(takeHome){
  const cam = cameras[activeCameraIndex];

  if(checkoutAction === "out"){
    cam.status   = "out";
    cam.user     = scannedUser;
    cam.takeHome = takeHome;
    cam.sdCard   = selectedSdCard || null;
    const sdLog  = selectedSdCard ? ` [${selectedSdCard}]` : "";
    const evLog  = selectedEvent  ? ` [${selectedEvent}]`  : "";
    addLog(
      takeHome ? "Check Out (Take Home)" : "Check Out",
      `${cam.name} — ${scannedUser}${sdLog}${evLog}`
    );
  } else {
    cam.status   = "in";
    cam.user     = "Available";
    cam.takeHome = false;
    cam.sdCard   = null;
    addLog("Check In", `${cam.name} — ${scannedUser}`);
  }

  saveCameras();
  hideModal(confirmModal);
  activeCameraIndex = null;
  scannedUser       = null;
  checkoutAction    = null;
  selectedSdCard    = null;
  selectedEvent     = null;
  render();
}

/* ==================================================
   TAKE-HOME REASON MODAL
================================================== */

function openTakeHomeModal(){
  takeHomeReasonInput.value       = "";
  takeHomeSubmitBtn.disabled      = true;
  takeHomeSubmitBtn.style.opacity = "0.4";
  showModal(takeHomeModal);
  takeHomeReasonInput.focus();
}

takeHomeReasonInput.addEventListener("input", () => {
  const hasText = takeHomeReasonInput.value.trim().length > 0;
  takeHomeSubmitBtn.disabled      = !hasText;
  takeHomeSubmitBtn.style.opacity = hasText ? "1" : "0.4";
});

takeHomeSubmitBtn.onclick = () => {
  const reason = takeHomeReasonInput.value.trim();
  if(!reason) return;

  const cam = cameras[activeCameraIndex];
  requests = requests.filter(r => r.cameraIndex !== activeCameraIndex);
  requests.push({
    id          : Date.now(),
    cameraIndex : activeCameraIndex,
    cameraName  : cam.name,
    userName    : scannedUser,
    reason,
    time        : new Date().toLocaleString()
  });

  saveRequests();
  addLog("Take-Home Requested", `${cam.name} — ${scannedUser}: "${reason}"`);

  hideModal(takeHomeModal);
  activeCameraIndex = null;
  scannedUser       = null;
  checkoutAction    = null;
  selectedSdCard    = null;
  selectedEvent     = null;

  render();
  showToast(`Take-home request sent for ${cam.name}`);
};

takeHomeCancelBtn.onclick = () => {
  hideModal(takeHomeModal);
  showConfirmModal();
};

/* ==================================================
   DENY REASON MODAL
================================================== */

function openDenyModal(cameraIndex){
  denyingRequestIndex   = cameraIndex;
  denyReasonInput.value = "";
  showModal(denyModal);
  denyReasonInput.focus();
}

denySubmitBtn.onclick = () => {
  if(denyingRequestIndex === null) return;
  const req    = getRequestForCamera(denyingRequestIndex);
  const reason = denyReasonInput.value.trim();
  const detail = reason
    ? `${cameras[denyingRequestIndex].name} — ${req?.userName}: "${reason}"`
    : `${cameras[denyingRequestIndex].name} — ${req?.userName}`;

  requests = requests.filter(r => r.cameraIndex !== denyingRequestIndex);
  saveRequests();
  addLog("Denied Take Home", detail);
  hideModal(denyModal);
  denyingRequestIndex = null;
  render();
};

denyCancelBtn.onclick = () => {
  hideModal(denyModal);
  denyingRequestIndex = null;
};

/* ==================================================
   TOAST
================================================== */

function showToast(message){
  let toast = document.getElementById("toastNotif");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "toastNotif";
    toast.style.cssText = `
      position:fixed; bottom:60px; left:50%; transform:translateX(-50%);
      background:#111; color:#fff; padding:12px 24px; border-radius:999px;
      font-weight:600; font-size:.9rem; z-index:400;
      box-shadow:0 6px 20px rgba(0,0,0,.25); transition:opacity .4s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent   = message;
  toast.style.opacity = "1";
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.opacity = "0"; }, 2800);
}

/* ==================================================
   OWNERSHIP ERROR MODAL
   Shown when a student tries to check in/out
   a camera that belongs to someone else
================================================== */

const ownershipModal  = document.getElementById("ownershipModal");
const ownershipMsg    = document.getElementById("ownershipMsg");
const ownershipOk     = document.getElementById("ownershipOk");

function showOwnershipError(ownerName){
  ownershipMsg.textContent = `This camera was checked out by ${ownerName}. Only an admin can check it in.`;
  showModal(ownershipModal);
}

ownershipOk.onclick = () => hideModal(ownershipModal);

/* ==================================================
   ERROR MODAL
================================================== */

errorOk.onclick = () => hideModal(errorModal);

/* ==================================================
   CAMERA MODAL
================================================== */

function openCameraModal(index){
  editingCameraIndex = index;
  cameraImageData    = "";

  if(index === null){
    cameraModalTitle.textContent  = "Add Camera";
    cameraNameInput.value         = "";
    imagePreview.src              = "images/cameras/no_camera.png";
    cameraTakeHome.checked        = false;
    cameraAllowRequests.checked   = true;
  } else {
    const cam = cameras[index];
    cameraModalTitle.textContent  = "Edit Camera";
    cameraNameInput.value         = cam.name;
    imagePreview.src              = cam.image;
    cameraImageData               = cam.image;
    cameraTakeHome.checked        = !!cam.takeHome;
    cameraAllowRequests.checked   = cam.requestsAllowed !== false;
  }

  showModal(cameraModal);
}

function closeCameraModal(){
  hideModal(cameraModal);
  editingCameraIndex = null;
  cameraImageData    = "";
}

imageDropZone?.addEventListener("click", () => cameraFileInput.click());

cameraFileInput?.addEventListener("change", e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = evt => { cameraImageData = evt.target.result; imagePreview.src = cameraImageData; };
  reader.readAsDataURL(file);
  e.target.value = "";
});

saveCameraBtn.onclick = () => {
  const name = cameraNameInput.value.trim();
  if(!name){ cameraNameInput.style.outline = "2px solid red"; return; }
  cameraNameInput.style.outline = "";

  if(editingCameraIndex === null){
    cameras.push({
      name,
      image           : cameraImageData || "images/cameras/no_camera.png",
      status          : "in",
      user            : "Available",
      disabled        : false,
      takeHome        : cameraTakeHome.checked,
      requestsAllowed : cameraAllowRequests.checked
    });
    addLog("Added Camera", name);
  } else {
    const cam = cameras[editingCameraIndex];
    cam.name            = name;
    cam.takeHome        = cameraTakeHome.checked;
    cam.requestsAllowed = cameraAllowRequests.checked;
    if(cameraImageData) cam.image = cameraImageData;
    if(!cam.requestsAllowed){
      requests = requests.filter(r => r.cameraIndex !== editingCameraIndex);
      saveRequests();
    }
    addLog("Edited Camera", name);
  }

  saveCameras();
  closeCameraModal();
  render();
};

cancelCameraBtn.onclick = () => closeCameraModal();

/* ==================================================
   DELETE CAMERA
================================================== */

function openDeleteCamera(index){
  deletingCameraIndex = index;
  const p = deleteCameraModal.querySelector("p");
  if(p) p.textContent = `Delete "${cameras[index].name}"? This cannot be undone.`;
  showModal(deleteCameraModal);
}

confirmDeleteCamera.onclick = () => {
  if(deletingCameraIndex === null) return;
  const name = cameras[deletingCameraIndex].name;
  cameras.splice(deletingCameraIndex, 1);
  requests = requests.filter(r => r.cameraIndex !== deletingCameraIndex);
  saveCameras(); saveRequests();
  addLog("Deleted Camera", name);
  hideModal(deleteCameraModal);
  deletingCameraIndex = null;
  render();
};

cancelDeleteCamera.onclick = () => {
  hideModal(deleteCameraModal);
  deletingCameraIndex = null;
};

/* ==================================================
   GENERIC CONFIRM
================================================== */

let _genericConfirmCallback = null;

const genericConfirmModal = (() => {
  const el = document.createElement("div");
  el.className = "modal hidden";
  el.innerHTML = `
    <div class="modal-content">
      <h2 id="genericConfirmTitle">Are you sure?</h2>
      <p id="genericConfirmMsg" style="margin:12px 0 20px;color:#555"></p>
      <div class="modal-actions">
        <button id="genericConfirmYes">Confirm</button>
        <button id="genericConfirmNo">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector("#genericConfirmYes").onclick = () => {
    hideModal(el);
    if(_genericConfirmCallback) _genericConfirmCallback();
    _genericConfirmCallback = null;
  };
  el.querySelector("#genericConfirmNo").onclick = () => {
    hideModal(el);
    _genericConfirmCallback = null;
  };
  return el;
})();

function openGenericConfirm(title, message, callback){
  document.getElementById("genericConfirmTitle").textContent = title;
  document.getElementById("genericConfirmMsg").textContent   = message;
  _genericConfirmCallback = callback;
  showModal(genericConfirmModal);
}

/* ==================================================
   SAVE ON UNLOAD
================================================== */

window.addEventListener("beforeunload", () => {
  saveCameras(); saveUsers(); saveLogs(); saveRequests();
});

/* ==================================================
   APP VERSION
   Bump this number every time you push an update.
   Also bump the ?v= numbers in index.html to match.
================================================== */

const APP_VERSION = "2.6.0";

/* ==================================================
   DATA MIGRATION
   Runs on every boot. Safely adds any missing fields
   to existing localStorage data so old saves never
   crash the new code.
================================================== */

function migrateData(){

  const savedVersion = localStorage.getItem("cc_version");

  // FIX: patch old corrupted name from previous version
  // scan all users and fix "Josh Wepking — Lead Developer" -> "Josh Wepking"
  let userFixed = false;
  Object.keys(users).forEach(id => {
    if(users[id] === "Josh Wepking — Lead Developer"){
      users[id] = "Josh Wepking";
      userFixed = true;
    }
  });
  if(userFixed) saveUsers();

  // ensure every camera has all required fields
  cameras.forEach(cam => {
    if(cam.requestsAllowed === undefined) cam.requestsAllowed = true;
    if(cam.takeHome       === undefined) cam.takeHome        = false;
    if(cam.disabled       === undefined) cam.disabled        = false;
    if(cam.sdCard         === undefined) cam.sdCard          = null;
  });

  saveCameras();

  if(savedVersion !== APP_VERSION){
    localStorage.setItem("cc_version", APP_VERSION);
    console.log(`App migrated from v${savedVersion || "unknown"} to v${APP_VERSION}`);
  }
}

/* ==================================================
   BOOT
================================================== */

migrateData();
startClock();
checkWeeklyReport();
render();
