/**
 * Vaultage UI Logic | src/utils/explorer.js
 */

// DEFINE INIT BREADCRUMB OBJECT - ROOT NEVER SHOWS, BECAUSE OF 👇
let sessionPath = [{ id: "root", label: "Home" }];

// LOADS THE ROOT FOLDER - PASSES 'NULL' TO FOLDERID IN FOLDER CONTROLLER
// USEFUL FOR REFRESH, BUT RUNS AFTER LOGIN ALSO
window.onload = () => {
  runTest("/folders/content", "RESOLVE_ROOT"); // LABEL FOR OUTPUT DIV
  showSplash(); // SHOW FAUX LOGIN MODAL TO SEE IF MODAL SHOULD SHOW
};

// PUSH TERMINAL TEXT TO THE TOP
const updateScroll = () => {
  const term = document.getElementById("output");
  if (term) term.scrollTop = term.scrollHeight;
};

// CHECK SESSION STORAGE TO SEE IF WE'VE PASSED FAUX LOGIN
window.showSplash = function () {
  const splash = document.getElementById("login-splash");
  const authActive = sessionStorage.getItem("vaultage_auth_active");

  if (!authActive) {
    // IF NOT, SHOW THE MODAL
    splash.classList.remove("hidden", "opacity-0", "scale-105");
    splash.classList.add("flex", "opacity-100", "scale-100");
  } else {
    splash.classList.add("hidden");
  }
};

// TIED TO FRONTEND MODAL 'LOGIN' BUTTON - SETS SESSION STORAGE
window.executeLoginFlow = async function () {
  const splash = document.getElementById("login-splash");

  try {
    await window.login(); // SIMULATED LOGIN FUNCTION

    sessionStorage.setItem("vaultage_auth_active", "true");

    // HIDE MODAL...
    splash.classList.add("opacity-0", "scale-105");

    setTimeout(() => {
      splash.classList.add("hidden");
      splash.classList.remove("flex");
    }, 700); // ... SLOWLY
  } catch (err) {
    console.error("Splash Auth Failed:", err);
  }
};

// MODAL FOR README
window.showDoc = function (type) {
  const modal = document.getElementById("docs-modal");
  if (modal) {
    modal.classList.remove("hidden");
    const output = document.getElementById("output");
    if (output)
      // 'TERMINAL' TEXT
      output.innerText += `\n> ACCESSING_PROTOCOL_MANIFEST: ${type.toUpperCase()}...`;
    updateScroll();
  }
};

// CLOSES 👆
window.closeDocs = function () {
  const modal = document.getElementById("docs-modal");
  if (modal) modal.classList.add("hidden");
};

// CLOSES UPLOAD MODAL
window.closeModal = function () {
  const modal = document.getElementById("upload-modal");
  if (modal) modal.classList.add("hidden");
};

// FAUX SIGN IN LOGIC WITH HARD-CODED DATA FOR POC
window.login = async function () {
  const output = document.getElementById("output");
  output.innerText += "\n> ATTEMPTING_SECURE_INITIALIZATION...";
  updateScroll();

  try {
    // 1. HIT THE REAL CONTROLLER
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "00000000" }), // PRESET DATA
    });

    const data = await res.json();

    if (res.ok) {
      // GET THE ROOT FOLDER
      runTest("/folders/content", "RESOLVE_ROOT"); // LABEL JUST FOR #OUTPUT
      output.innerText += "\n> AUTH_SUCCESS: Logged in.";

      // 2. THE JANITOR LOG - REMOVES EXAMPLE.TXT FILES
      if (data.cleaned !== undefined) {
        // IF AUTH CONTROLLER RETURNS cleaned: cleanupCount
        output.innerText += `\n> JANITOR: ${data.cleaned} Test data purged.`;
      }

      // TRIGGER UI TRANSITION (Remove modal, etc.)
    } else {
      throw new Error(data.message || "Access_Denied");
    }
  } catch (err) {
    output.innerText += "\n!! AUTH_CRITICAL: " + err.message + "\n";
  }
  updateScroll();
};

// KILL JWT COOKIE
window.logout = async function () {
  const output = document.getElementById("output");
  const userDisp = document.getElementById("user-display");

  output.innerText += "\n> INITIALIZING_PURGE_PROTOCOL...";
  updateScroll();

  try {
    const res = await fetch("/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      // UPDATE SESSION STORAGE
      sessionStorage.removeItem("vaultage_auth_active");

      output.innerText += "\n> STATUS: SESSION_PURGED";
      if (userDisp) userDisp.innerText = "Node: Unverified";

      const explorer = document.getElementById("explorer-view");
      if (explorer) {
        // SHOULDN'T SHOW, BUT AS A FALLBACK - INSTEAD...
        explorer.innerHTML = `<div class="text-[#1d1d1d] font-black tracking-tight uppercase text-xs opacity-20">Auth Required</div>`;
      }

      // ...WE TRIGGER THE LOGIN SPLASH
      if (typeof window.showSplash === "function") {
        window.showSplash();
      }
    } else {
      throw new Error("SERVER_REJECTED_LOGOUT");
    }
  } catch (err) {
    output.innerText += "\n!! LOGOUT_ERROR: " + err.message;
  }
  updateScroll();
};

/* BREADCRUMB LOGIC - HARD-CODED 
  ###
  INITIAL LOAD: onload CALLS runTest("/folders/content", "RESOLVE_ROOT"). 
  BECAUSE uuid IS null, THE else BLOCK TRIGGERS, RESETTING sessionPath 
  TO THE "Vault" ROOT STATE.

  NAVIGATION: CLICKING A FOLDER ICON EXECUTES 
  runTest('${route}', '${item.name}', '${item.id}').
  THIS PASSES ORM DATA (name AND id) INTO THE if(uuid) LOGIC. 
  it CHECKS existingIndex; IF NEW, IT PUSHES id: AND label: 
  TO THE sessionPath COLLECTION.

  RECURSION: BREADCRUMBS ARE GENERATED USING THE SAVED sessionPath DATA. 
  CLICKING A BREADCRUMB RE-RUNS runTest WITH ITS OWN step.id AND step.label, 
  SIMULTANEOUSLY TRIGGERING THE CONTROLLER FETCH AND TRIMMING THE 
  sessionPath ARRAY TO THE SELECTED POSITION.
  ###
*/
const renderBreadcrumbs = () => {
  const nav = document.getElementById("breadcrumb-nav"); // Make sure this ID exists in your HTML
  if (!nav) return;

  nav.innerHTML = sessionPath
    .map((step, index) => {
      // LAST ITEM - NO LINK NEEDED
      if (index === sessionPath.length - 1) {
        return `<span class="text-zinc-900 font-bold">${step.label}</span>`;
      }

      // ...OTHERWISE, CONTINUE ONCLICK LOGIC FOR RUNTEST
      return `
        <button class="text-zinc-500 hover:text-zinc-800 transition-colors" 
                onclick="runTest('/folders/content?folderId=', '${step.label}', '${step.id}')">
          ${step.label}
        </button>
        <span class="text-zinc-300 mx-1">/</span>
      `;
    })
    .join("");
};

/*
  MULTI-PURPOSE UTILITY - ACCEPTS A URL (API ROUTE), LABEL (FOR OUTPUT PURPOSES, 
  OR ACTUAL FILENAME USED IN BREADCRUMBS AND UI), AND A UUID (USED FOR THE 
  FOLDER/FILE CONTROLLER (DETERMINED BY storageKey IN renderVisualizer)
*/
window.runTest = async function (url, label, uuid = null) {
  const output = document.getElementById("output");
  let finalUrl = url;

  // DECIDES THE SHAPE OF THE REQUEST: A ? MEANS WE'RE MAKING A GET TO A RESOURCE,
  // LIKE A FOLDER'S CONTENTS - OTHERWISE WE'RE RETRIEVING A SIGNED URL
  if (uuid) {
    finalUrl = url.includes("?")
      ? url + uuid
      : url + "/" + uuid + "/download-url";

    // FOR BREADCRUMB - SEE IF WE HAVE A UUID THAT MATCHES
    const existingIndex = sessionPath.findIndex((p) => p.id === uuid);

    // IF THE id ALREADY EXISTS, WE ARE NAVIGATING BACKWARDS;
    // SLICE THE ARRAY TO REMOVE ALL STEPS AFTER THIS POINT.
    if (existingIndex !== -1) {
      sessionPath = sessionPath.slice(0, existingIndex + 1);

      // IF THE id IS NEW AND NOT THE ROOT, WE ARE NAVIGATING DEEPER;
      // PUSH THE NEW id: AND label: TO THE sessionPath COLLECTION.
    } else if (uuid !== "root_demo_id") {
      sessionPath.push({ id: uuid, label: label });
    }
  } else {
    sessionPath = [{ id: "root_demo_id", label: "Vault" }];
  }

  output.innerText += `\n> ${label} EXEC_CALL: ${finalUrl}\n`;
  updateScroll();

  try {
    const res = await fetch(finalUrl); // SEND THE REQUEST
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Unauthorized");

    output.innerText += JSON.stringify(data, null, 2) + "\n";

    // RENDER IN THE VISUALIZER - WE PASS UUID AS WE DON'T RELY ON IT BEING FOUND IN THE DATA
    renderVisualizer(data, uuid);

    renderBreadcrumbs();
  } catch (err) {
    output.innerText += "!! ERROR: " + err.message + "\n";
  }
  updateScroll();
};

// RENDERS FILE/FOLDER UI
const renderVisualizer = (data, uuid) => {
  const explorer = document.getElementById("explorer-view");
  if (!explorer) return;

  let items = [];
  if (data.folders || data.files)
    // SPREAD ANY RESPONSE INTO items
    items = [...(data.folders || []), ...(data.files || [])];

  if (items.length > 0) {
    explorer.innerHTML = items
      .map((item) => {
        // A FILE HAS A storageKey FROM THE File MODEL
        const isFolder = !item.storageKey;
        const route = isFolder ? "/folders/content?folderId=" : "/files";

        const folderIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1d1d1d"><path d="M20 5h-8.59l-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/></svg>`;
        const fileIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1d1d1d"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;

        const activeIcon = isFolder ? folderIcon : fileIcon;

        return `
        <div class="flex flex-col h-fit p-3 border border-zinc-200 rounded-md cursor-pointer hover:bg-zinc-50 hover:border-zinc-300 transition-all group" 
             onclick="runTest('${route}', '${item.name}', '${item.id}')">
            <div class="mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
              ${activeIcon}
            </div>
            <span class="text-[10px] font-black text-zinc-400 uppercase tracking-tighter mb-0.5">
              ${isFolder ? "Dir" : "File"}
            </span>
            <span class="text-[11px] font-bold text-[#1d1d1d] truncate tracking-tighter">
              ${item.name}
            </span>
        </div>`;
      })
      .join("");
  } else if (data.signedUrl) {
    const fileId = uuid; // This now works because it's passed in
    const isDeletable = true;
    const rawName = data.fileName || "Unknown_File";
    const displayName =
      rawName.length > 20 ? rawName.substring(0, 17) + "..." : rawName;

    explorer.innerHTML = `
          <div class="flex items-center justify-between max-w-fit h-fit p-2 pr-3 border border-zinc-200 rounded-lg bg-white group transition-all hover:border-zinc-300 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center border border-zinc-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#1d1d1d">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] font-bold text-zinc-900 tracking-tighter">${displayName}</span>
              </div>
            </div>
            
            <div class="flex items-center gap-1.5 ml-4">
              <a href="${data.signedUrl}" target="_blank" 
                 class="flex items-center justify-center w-8 h-8 rounded-md bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                   <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                 </svg>
              </a>
    
              ${
                isDeletable
                  ? `
                <button onclick="event.stopPropagation(); deleteFile('${fileId}', '${displayName}')" 
                   class="opacity-0 group-hover:opacity-100 flex items-center justify-center w-8 h-8 rounded-md border border-red-100 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[11px] font-black uppercase">
                   ✕
                </button>
              `
                  : ""
              }
            </div>
          </div>`;
  }
};

// --- [04: UPLOAD HANDSHAKE] ---

window.triggerUpload = function () {
  const modal = document.getElementById("upload-modal");
  if (modal) modal.classList.remove("hidden");
  const output = document.getElementById("output");
  output.innerText += "\n> USER_INTERRUPT: Manual_Confirmation_Required";
  updateScroll();
};

window.confirmAndUpload = function () {
  window.closeModal();
  const output = document.getElementById("output");
  output.innerText += "\n> PROTOCOL: Upload 'example.txt' [0-byte].";
  output.innerText += "\n> INITIALIZING_S3_HANDSHAKE...\n";
  updateScroll();

  // Try to find the FilePond hidden input
  const fpInput = document.querySelector(
    'input[type="file"].filepond--browser'
  );
  if (fpInput) {
    fpInput.click();
  } else {
    // Fallback to the root if browser input isn't ready
    const root = document.querySelector(".filepond--root");
    if (root) root.click();
  }
};

// --- [05: FILEPOND LOGIC] ---

const pondInput = document.querySelector("#main-filepond");
if (pondInput) {
  FilePond.create(pondInput, {
    allowMultiple: false,
    server: null,
    onaddfile: async (err, item) => {
      if (err) return;

      const output = document.getElementById("output");
      output.innerText += `\n> FILE_STAGED: ${item.file.name}`;
      updateScroll();

      // 1. THE HANDSHAKE
      const payload = {
        files: [{ name: item.file.name, size: item.file.size }],
      };

      try {
        const response = await fetch("/files/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          // This catches the 'SECURITY_RESTRICTION' error from your new controller
          output.innerText += `\n!! HANDSHAKE_REJECTED: ${result.message}`;
          return;
        }

        const { uploadUrl, id } = result.items[0];
        output.innerText += `\n> HANDSHAKE_OK. UPLOAD_ID: ${id}`;
        output.innerText += `\n> STARTING_BINARY_PUSH...`;
        updateScroll();

        // 2. THE PUSH
        // CRITICAL: Must match the "application/octet-stream" in the controller
        const transfer = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: item.file, // item.file is the native File object in FilePond
        });

        if (transfer.ok) {
          output.innerText += `\n> PROTOCOL_SUCCESS: BYTES_TRANSFERRED.`;
          // Refresh view using the specific Demo Vault folder ID
          runTest(
            "/folders/content?folderId=",
            "Demo Vault",
            "cmlw75s560001mfjnk36olrvw"
          );
        } else {
          const errorText = await transfer.text();
          console.error("S3_REJECT_DETAIL:", errorText);
          output.innerText += `\n!! TRANSFER_FAILED: ${transfer.status} - Storage_Rejected_Body`;
        }
      } catch (fail) {
        console.error(fail);
        output.innerText += `\n!! NETWORK_CRITICAL: Pipeline_Broken.`;
      }
      updateScroll();
    },
  });
}

window.deleteFile = async function (id, fileName) {
  const output = document.getElementById("output");

  // 1. Confirm with the user (safety first for the demo)
  if (!confirm(`Are you sure you want to purge ${fileName}?`)) return;

  output.innerText += `\n> INITIALIZING_DELETE_PROTOCOL: ${fileName}...`;
  updateScroll();

  try {
    const res = await fetch(`/files/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      output.innerText += `\n> SUCCESS: ${fileName} DELETED.`;

      // 2. REFRESH THE VIEW
      // We hit 'RESOLVE_ROOT' to show the file is gone from the list
      runTest("/folders/content", "RESOLVE_ROOT");
    } else {
      const data = await res.json();
      throw new Error(data.message || "DELETE_REJECTED");
    }
  } catch (err) {
    output.innerText += `\n!! DELETE_ERROR: ${err.message}`;
  }
  updateScroll();
};
