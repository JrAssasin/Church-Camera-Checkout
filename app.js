/* ==================================================
   FREEDOM CAMERA CHECKOUT SYSTEM
   app.js — v2.1.0
================================================== */

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

let editingStaffId  = null;
let deletingStaffId = null;

let pendingStaffId     = null;
let currentUploadImage = "";
let cameraImageData    = "";

/* =========================
   STORAGE KEYS
========================= */

const LS = {
  CAMERAS  : "cc_cameras",
  USERS    : "cc_users",
  LOGS     : "cc_logs",
  REQUESTS : "cc_requests"
};

/* =========================
   DEFAULT DATA
========================= */

const defaultCameras = [
  { name:"Nikon D610",           status:"in", user:"Available", image:"images/cameras/nikon_d610.png",         disabled:false, takeHome:false },
  { name:"Nikon Z6 II",          status:"in", user:"Available", image:"images/cameras/nikon_z6ii.png",          disabled:false, takeHome:false },
  { name:"Nikon Z6 II Big Lens", status:"in", user:"Available", image:"images/cameras/nikon_z6ii_big_lens.png", disabled:false, takeHome:false },
  { name:"Sony A7",              status:"in", user:"Available", image:"images/cameras/sony_a7.png",             disabled:false, takeHome:false },
  { name:"Canon Backup",         status:"in", user:"Available", image:"images/cameras/no_camera.png",           disabled:false, takeHome:false },
  { name:"Spare Camera",         status:"in", user:"Available", image:"images/cameras/no_camera.png",           disabled:false, takeHome:false }
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
  "843809":"Josh Wepking — Lead Developer"
};

const admins = [
  "Cheyenne Wepking",
  "Izzy Wood",
  "Abby Dephouse",
  "Josh Wepking — Lead Developer"
];

/* =========================
   LOAD STORAGE
========================= */

const cameras =
  JSON.parse(localStorage.getItem(LS.CAMERAS)) || structuredClone(defaultCameras);

const users =
  JSON.parse(localStorage.getItem(LS.USERS)) || structuredClone(defaultUsers);

let logs =
  JSON.parse(localStorage.getItem(LS.LOGS)) || [];

// requests: array of { id, cameraIndex, cameraName, userName, time }
let requests =
  JSON.parse(localStorage.getItem(LS.REQUESTS)) || [];

/* =========================
   SAVE HELPERS
========================= */

function saveCameras()  { localStorage.setItem(LS.CAMERAS,  JSON.stringify(cameras));  }
function saveUsers()    { localStorage.setItem(LS.USERS,    JSON.stringify(users));    }
function saveLogs()     { localStorage.setItem(LS.LOGS,     JSON.stringify(logs));     }
function saveRequests() { localStorage.setItem(LS.REQUESTS, JSON.stringify(requests)); }

/* =========================
   LOGGING
========================= */

function addLog(action, detail){
  logs.unshift({
    time  : new Date().toLocaleString(),
    action,
    detail,
    admin : loggedInAdmin || "System"
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

const undoBtn            = document.getElementById("undoBtn");
const exportDataBtn      = document.getElementById("exportDataBtn");
const restoreDefaultsBtn = document.getElementById("restoreDefaultsBtn");

// scan modal
const scanModal      = document.getElementById("scanModal");
const scanInput      = document.getElementById("scanInput");
const scanCameraName = document.getElementById("scanCameraName");
const scanTitle      = document.getElementById("scanTitle");
const scanCancelBtn  = document.getElementById("scanCancelBtn");

// confirm checkout modal
const confirmModal  = document.getElementById("confirmModal");
const confirmImage  = document.getElementById("confirmImage");
const confirmCamera = document.getElementById("confirmCamera");
const confirmUser   = document.getElementById("confirmUser");
const confirmYes    = document.getElementById("confirmYes");
const confirmNo     = document.getElementById("confirmNo");
const takeHomeBtn   = document.getElementById("takeHomeBtn");

// error modal
const errorModal = document.getElementById("errorModal");
const errorOk    = document.getElementById("errorOk");

// camera modal
const cameraModal      = document.getElementById("cameraModal");
const cameraModalTitle = document.getElementById("cameraModalTitle");
const cameraNameInput  = document.getElementById("cameraNameInput");
const cameraFileInput  = document.getElementById("cameraFileInput");
const imagePreview     = document.getElementById("imagePreview");
const imageDropZone    = document.getElementById("imageDropZone");
const cameraTakeHome   = document.getElementById("cameraTakeHome");
const saveCameraBtn    = document.getElementById("saveCameraBtn");
const cancelCameraBtn  = document.getElementById("cancelCameraBtn");

// delete camera modal
const deleteCameraModal   = document.getElementById("deleteCameraModal");
const confirmDeleteCamera = document.getElementById("confirmDeleteCamera");
const cancelDeleteCamera  = document.getElementById("cancelDeleteCamera");

// staff edit modal
const staffEditModal   = document.getElementById("staffEditModal");
const staffModalTitle  = document.getElementById("staffModalTitle");
const staffNameInput   = document.getElementById("staffNameInput");
const staffAdminToggle = document.getElementById("staffAdminToggle");
const saveStaffBtn     = document.getElementById("saveStaffBtn");
const cancelStaffBtn   = document.getElementById("cancelStaffBtn");

// delete staff modal
const deleteStaffModal   = document.getElementById("deleteStaffModal");
const deleteStaffName    = document.getElementById("deleteStaffName");
const confirmDeleteStaff = document.getElementById("confirmDeleteStaff");
const cancelDeleteStaff  = document.getElementById("cancelDeleteStaff");

// staff confirm modal
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

/* =========================
   REQUEST HELPERS
========================= */

function getRequestForCamera(cameraIndex){
  return requests.find(r => r.cameraIndex === cameraIndex) || null;
}

function pendingRequestCount(){
  return requests.length;
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

    // FIX: reset ALL tab icons to off on logout
    tabIcons.forEach((icon, i) => {
      const names = ["cameras","logs","staff"];
      icon.src = `images/ui/${names[i]}_icon_off.png`;
    });

    activeTab = "cameras";
    updateAdminGlow();

    undoBtn.classList.add("hidden");
    exportDataBtn.classList.add("hidden");
    restoreDefaultsBtn.classList.add("hidden");

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

  // reset all to off first
  tabIcons.forEach((icon, i) => {
    const names = ["cameras","logs","staff"];
    icon.src = `images/ui/${names[i]}_icon_off.png`;
  });

  // activate selected
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
   REQUEST NOTIFICATION BADGE
   Shows in top-right corner when there are
   pending take-home requests (admin only)
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
      position: fixed;
      top: 12px;
      right: 16px;
      z-index: 300;
      background: #e63946;
      color: #fff;
      font-weight: 700;
      font-size: .85rem;
      border-radius: 999px;
      padding: 6px 14px;
      box-shadow: 0 4px 14px rgba(230,57,70,.4);
      cursor: pointer;
      animation: cardPop .2s ease;
    `;
    badge.onclick = () => {
      setActiveTab(0, "cameras");
    };
    document.body.appendChild(badge);
  }

  const count = requests.length;
  badge.textContent = count === 1
    ? "1 Take-Home Request"
    : `${count} Take-Home Requests`;
}

/* ==================================================
   RENDER — CAMERAS
================================================== */

function renderCameras(){

  grid.innerHTML = "";

  const searchVal = (document.getElementById("cameraSearchInput")?.value || "").toLowerCase();
  const sortVal   = document.getElementById("cameraSortSelect")?.value || "name";

  let list = cameras
    .map((cam, index) => ({ cam, index }))
    .filter(({ cam }) => cam.name.toLowerCase().includes(searchVal));

  if(sortVal === "name"){
    list.sort((a,b) => a.cam.name.localeCompare(b.cam.name));
  } else if(sortVal === "status"){
    list.sort((a,b) => a.cam.status.localeCompare(b.cam.status));
  }

  list.forEach(({ cam, index }) => {

    const req = getRequestForCamera(index);

    const card = document.createElement("div");
    card.className = "camera-card fade-in";
    if(cam.disabled) card.classList.add("disabled");

    // status label
    let statusLabel = cam.disabled
      ? "Disabled"
      : cam.status === "in"
        ? "Available"
        : "With " + cam.user + (cam.takeHome ? " • Take Home" : "");

    // pending request indicator on card
    const requestBadgeHTML = req
      ? `<div class="camera-request-badge">📋 Take-Home Requested</div>`
      : "";

    card.innerHTML = `
      <div class="camera-image" style="background-image:url('${cam.image}')">
        ${requestBadgeHTML}
      </div>
      <div class="camera-status ${cam.status === "in" ? "status-in" : "status-out"}">
        ${statusLabel}
      </div>
      <div class="camera-footer">${cam.name}</div>
    `;

    // student tap
    if(!isAdminMode){
      card.onclick = () => {
        if(cam.disabled) return;
        activeCameraIndex = index;
        openScanModal(cam.name);
      };
    }

    // admin controls
    if(isAdminMode){

      const controls = document.createElement("div");
      controls.className = "admin-camera-controls";

      // check in / out row
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
        // clear any pending request for this camera
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

      // if there's a pending request, show Accept / Deny instead of (or in addition to) normal controls
      if(req){
        const reqRow = document.createElement("div");
        reqRow.className = "request-row";
        reqRow.innerHTML = `
          <div class="request-label">📋 <strong>${req.userName}</strong> wants to take home</div>
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
          requests = requests.filter(r => r.cameraIndex !== index);
          saveRequests();
          addLog("Denied Take Home", `${cam.name} — ${req.userName}`);
          render();
        };

        controls.append(reqRow, acceptBtn, denyBtn, split);
      } else {
        controls.append(split);
      }

      // edit
      const editBtn = document.createElement("button");
      editBtn.className   = "admin-btn-out";
      editBtn.textContent = "Edit Camera";
      editBtn.onclick = e => {
        e.stopPropagation();
        openCameraModal(index);
      };

      // disable / enable
      const disableBtn = document.createElement("button");
      disableBtn.className   = cam.disabled ? "admin-btn-enable" : "admin-btn-disable";
      disableBtn.textContent = cam.disabled ? "Enable Camera"    : "Disable Camera";
      disableBtn.onclick = e => {
        e.stopPropagation();
        if(!cam.disabled){
          openGenericConfirm(
            `Disable "${cam.name}"?`,
            "The camera will be unavailable for checkout.",
            () => {
              cam.disabled = true;
              saveCameras();
              addLog("Disabled Camera", cam.name);
              render();
            }
          );
        } else {
          cam.disabled = false;
          saveCameras();
          addLog("Enabled Camera", cam.name);
          render();
        }
      };

      // delete
      const deleteBtn = document.createElement("button");
      deleteBtn.className   = "admin-btn-disable";
      deleteBtn.textContent = "Delete Camera";
      deleteBtn.onclick = e => {
        e.stopPropagation();
        openDeleteCamera(index);
      };

      controls.append(editBtn, disableBtn, deleteBtn);
      card.appendChild(controls);
    }

    grid.appendChild(card);
  });

  // add camera card
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
  ?.addEventListener("input", () => { if(activeTab === "cameras") renderCameras(); });

document.getElementById("cameraSortSelect")
  ?.addEventListener("change", () => { if(activeTab === "cameras") renderCameras(); });

/* ==================================================
   RENDER — LOGS
================================================== */

function renderLogs(){

  grid.innerHTML = "";

  const search  = (document.getElementById("logSearchInput")?.value || "").toLowerCase();
  const typeVal = document.getElementById("logTypeFilter")?.value   || "all";
  const dateVal = document.getElementById("logDateFilter")?.value   || "";

  let list = logs.filter(log => {
    const matchSearch = (log.action + log.detail + log.admin).toLowerCase().includes(search);
    const matchType   = typeVal === "all" || log.action.toLowerCase().includes(typeVal);
    return matchSearch && matchType;
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

    const card = document.createElement("div");
    card.className = "staff-card fade-in";
    card.innerHTML = `
      <div class="staff-name">${name}</div>
      <div class="staff-id">${id}</div>
      ${isAdminUser ? `<div class="staff-admin-badge">Admin</div>` : ""}
      <div class="staff-controls">
        <button class="staff-edit">Edit</button>
        <button class="staff-delete">Delete</button>
      </div>
    `;

    card.querySelector(".staff-edit").onclick   = () => openStaffModal(id);
    card.querySelector(".staff-delete").onclick = () => openDeleteStaff(id, name);

    grid.appendChild(card);
  });

  // add staff card
  const addCard = document.createElement("div");
  addCard.className = "staff-card add-staff-card";
  addCard.style.cssText = `
    border:3px dashed #bbb;
    background:#f7f7f7;
    border-radius:22px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    min-height:140px;
    transition:.15s;
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
    if(isAdminChecked && adminIdx === -1){
      admins.push(name);
    } else if(!isAdminChecked && adminIdx !== -1){
      admins.splice(adminIdx, 1);
    }
    if(oldName !== name){
      const i = admins.indexOf(oldName);
      if(i !== -1) admins[i] = name;
    }

    saveUsers();
    addLog("Edited Staff", name);
    hideModal(staffEditModal);
    render();
  }
};

cancelStaffBtn.onclick = () => hideModal(staffEditModal);

/* ==================================================
   STAFF CONFIRM MODAL
================================================== */

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
   SCAN / ID ENTRY MODAL
   — now says "Enter Your ID Code" not "Scan ID"
   — cancel button added
================================================== */

function openScanModal(context){
  scanCameraName.textContent = context === "Admin Login" ? "" : context;
  scanTitle.textContent      = context === "Admin Login"
    ? "Admin Login"
    : "Enter Your ID Code";
  scanInput.value = "";
  showModal(scanModal);
  setTimeout(() => scanInput.focus(), 80);
}

// auto-submit at 6 digits
scanInput.addEventListener("input", () => {
  if(scanInput.value.length === 6){
    handleScan(scanInput.value);
  }
});

// cancel button — close modal and reset
scanCancelBtn.onclick = () => {
  hideModal(scanModal);
  activeCameraIndex = null;
  scannedUser       = null;
};

function handleScan(id){

  hideModal(scanModal);

  const name = users[id];

  if(!name){
    showModal(errorModal);
    return;
  }

  scannedUser = name;

  // admin login path
  if(scanTitle.textContent === "Admin Login"){
    if(admins.includes(name)){
      isAdminMode   = true;
      loggedInAdmin = name;

      adminTabs.classList.remove("hidden");
      adminToggle.src = "images/ui/admin_icon_on.png";

      // ensure cameras tab icon is on
      tabIcons.forEach((icon, i) => {
        const names = ["cameras","logs","staff"];
        icon.src = `images/ui/${names[i]}_icon_off.png`;
      });
      tabIcons[0].src = "images/ui/cameras_icon_on.png";
      activeTab = "cameras";

      undoBtn.classList.remove("hidden");
      exportDataBtn.classList.remove("hidden");
      restoreDefaultsBtn.classList.remove("hidden");

      updateAdminGlow();
      addLog("Admin Login", name);
      render();
    } else {
      showModal(errorModal);
    }
    return;
  }

  // camera checkout / checkin path
  const cam = cameras[activeCameraIndex];

  confirmImage.src          = cam.image;
  confirmCamera.textContent = cam.name;
  confirmUser.textContent   = cam.status === "in"
    ? `Check out to ${name}?`
    : `Check in from ${cam.user}?`;

  // only show Take Home when checking OUT
  takeHomeBtn.style.display = cam.status === "in" ? "inline-block" : "none";

  showModal(confirmModal);
}

/* ==================================================
   CONFIRM CHECKOUT MODAL
================================================== */

confirmYes.onclick = () => doCheckout(false);

// Take Home → creates a PENDING REQUEST instead of instant checkout
takeHomeBtn.onclick = () => {
  const cam = cameras[activeCameraIndex];

  // check if there's already a request for this camera
  const existing = getRequestForCamera(activeCameraIndex);
  if(existing){
    // replace it
    requests = requests.filter(r => r.cameraIndex !== activeCameraIndex);
  }

  requests.push({
    id          : Date.now(),
    cameraIndex : activeCameraIndex,
    cameraName  : cam.name,
    userName    : scannedUser,
    time        : new Date().toLocaleString()
  });

  saveRequests();
  addLog("Take-Home Requested", `${cam.name} — ${scannedUser}`);

  hideModal(confirmModal);
  activeCameraIndex = null;
  scannedUser       = null;

  render();

  // show a brief confirmation toast
  showToast(`Take-home request sent for ${cam.name}`);
};

confirmNo.onclick = () => {
  hideModal(confirmModal);
  activeCameraIndex = null;
  scannedUser       = null;
};

function doCheckout(takeHome){
  const cam = cameras[activeCameraIndex];

  if(cam.status === "in"){
    cam.status   = "out";
    cam.user     = scannedUser;
    cam.takeHome = takeHome;
    addLog(
      takeHome ? "Check Out (Take Home)" : "Check Out",
      `${cam.name} — ${scannedUser}`
    );
  } else {
    cam.status   = "in";
    cam.user     = "Available";
    cam.takeHome = false;
    addLog("Check In", `${cam.name} — ${cam.user}`);
  }

  saveCameras();
  hideModal(confirmModal);
  activeCameraIndex = null;
  scannedUser       = null;
  render();
}

/* ==================================================
   TOAST NOTIFICATION
   Brief message that fades out automatically
================================================== */

function showToast(message){
  let toast = document.getElementById("toastNotif");
  if(!toast){
    toast = document.createElement("div");
    toast.id = "toastNotif";
    toast.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: #111;
      color: #fff;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 600;
      font-size: .9rem;
      z-index: 400;
      box-shadow: 0 6px 20px rgba(0,0,0,.25);
      transition: opacity .4s ease;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = "1";

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = "0";
  }, 2800);
}

/* ==================================================
   ERROR MODAL
================================================== */

errorOk.onclick = () => hideModal(errorModal);

/* ==================================================
   CAMERA ADD / EDIT MODAL
================================================== */

function openCameraModal(index){
  editingCameraIndex = index;
  cameraImageData    = "";

  if(index === null){
    cameraModalTitle.textContent = "Add Camera";
    cameraNameInput.value        = "";
    imagePreview.src             = "images/cameras/no_camera.png";
    cameraTakeHome.checked       = false;
  } else {
    const cam = cameras[index];
    cameraModalTitle.textContent = "Edit Camera";
    cameraNameInput.value        = cam.name;
    imagePreview.src             = cam.image;
    cameraImageData              = cam.image;
    cameraTakeHome.checked       = !!cam.takeHome;
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
  reader.onload = evt => {
    cameraImageData  = evt.target.result;
    imagePreview.src = cameraImageData;
  };
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
      image    : cameraImageData || "images/cameras/no_camera.png",
      status   : "in",
      user     : "Available",
      disabled : false,
      takeHome : cameraTakeHome.checked
    });
    addLog("Added Camera", name);
  } else {
    const cam = cameras[editingCameraIndex];
    cam.name     = name;
    cam.takeHome = cameraTakeHome.checked;
    if(cameraImageData) cam.image = cameraImageData;
    addLog("Edited Camera", name);
  }

  saveCameras();
  closeCameraModal();
  render();
};

cancelCameraBtn.onclick = () => closeCameraModal();

/* ==================================================
   DELETE CAMERA MODAL
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
  saveCameras();
  saveRequests();
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
   GENERIC CONFIRM DIALOG
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
   RESTORE DEFAULTS
================================================== */

restoreDefaultsBtn?.addEventListener("click", () => {
  openGenericConfirm(
    "Restore Defaults?",
    "All cameras, users, and logs will be reset. This cannot be undone.",
    () => {
      cameras.length = 0;
      cameras.push(...structuredClone(defaultCameras));
      Object.keys(users).forEach(k => delete users[k]);
      Object.assign(users, structuredClone(defaultUsers));
      logs.length     = 0;
      requests.length = 0;
      saveCameras();
      saveUsers();
      saveLogs();
      saveRequests();
      addLog("System", "Restored defaults");
      render();
    }
  );
});

/* ==================================================
   EXPORT LOGS
================================================== */

exportDataBtn?.addEventListener("click", () => {
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
  a.href     = url;
  a.download = "camera_checkout_logs.csv";
  a.click();
  URL.revokeObjectURL(url);
});

/* ==================================================
   SAVE ON UNLOAD
================================================== */

window.addEventListener("beforeunload", () => {
  saveCameras();
  saveUsers();
  saveLogs();
  saveRequests();
});

/* ==================================================
   BOOT
================================================== */

render();
