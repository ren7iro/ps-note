const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydc2-BNXUKxvtDaz0ob3m2shDhWTKPzeSi4RWHJuhIKMbxs3AaD51sAHfz_fkms8aVJA/exec";

let notesData = [{ title: "Note 1", content: "" }];
let activeTabIndex = 0;
let typingTimer;
const doneTypingInterval = 1500;

// Fitur Enter untuk Unlock
document.getElementById("password").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        unlockNote();
    }
});

// Fitur Shortcut Ctrl + S untuk Save Manual
document.addEventListener("keydown", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); // Mencegah browser membuka dialog "Save Page As"
        saveData();             // Menjalankan fungsi penyimpanan manual ke cloud & local
    }
});

async function unlockNote() {
    let pass = document.getElementById("password").value;
    if (!pass) {
        alert("Please enter the password!");
        return;
    }

    // 1. Tampilkan loader, sembunyikan kotak login
    document.getElementById("login-box").classList.add("hidden");
    document.getElementById("loader").classList.remove("hidden");
    
    let loadedSuccessfully = false;

    try {
        let response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "load", pass: pass })
        });
        let result = await response.json();

        if (result.status === "success") {
            if (result.content && result.content.trim() !== "") {
                try {
                    let parsed = JSON.parse(result.content);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        notesData = parsed;
                    }
                } catch (e) {
                    // Fallback jika data server berformat teks lama
                    notesData = [{ title: "Note 1", content: result.content }];
                }
            } else {
                // Jika cloud kosong, ambil dari local storage jika ada
                let localFallback = localStorage.getItem("ps_note_backup");
                if (localFallback) {
                    try {
                        let parsedLocal = JSON.parse(localFallback);
                        if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                            notesData = parsedLocal;
                        }
                    } catch(err) {}
                }
            }
            loadedSuccessfully = true;
        } else {
            alert(result.message || "Incorrect password!");
            // Kembalikan ke layar login jika password salah
            document.getElementById("loader").classList.add("hidden");
            document.getElementById("login-box").classList.remove("hidden");
            return;
        }
    } catch (err) {
        // Jika offline total, coba load dari local storage browser
        let localFallback = localStorage.getItem("ps_note_backup");
        if (localFallback) {
            try {
                let parsedLocal = JSON.parse(localFallback);
                if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
                    notesData = parsedLocal;
                    loadedSuccessfully = true;
                }
            } catch(e) {}
        }
        
        if (!loadedSuccessfully) {
            alert("Connection failed and no local backup found.");
            document.getElementById("loader").classList.add("hidden");
            document.getElementById("login-box").classList.remove("hidden");
            return;
        }
    }

    if (loadedSuccessfully) {
        // Validasi ekstra struktur data
        if (!Array.isArray(notesData) || notesData.length === 0) {
            notesData = [{ title: "Note 1", content: "" }];
        }

        // 2. Sembunyikan loader, tampilkan aplikasi utama
        document.getElementById("loader").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        
        activeTabIndex = 0;
        renderTabs();
        document.getElementById("content").value = notesData[0].content || "";
    }
}

function renderTabs() {
    const container = document.getElementById("tabs-container");
    container.innerHTML = "";
    
    notesData.forEach((note, index) => {
        let tab = document.createElement("button");
        tab.className = `tab ${index === activeTabIndex ? "active" : ""}`;
        
        let titleSpan = document.createElement("span");
        titleSpan.innerText = note.title;
        titleSpan.ondblclick = () => renameTab(index);
        tab.appendChild(titleSpan);

        if (notesData.length > 1) {
            let closeBtn = document.createElement("button");
            closeBtn.className = "tab-close";
            closeBtn.innerHTML = "&times;";
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                deleteTab(index);
            };
            tab.appendChild(closeBtn);
        }

        tab.onclick = () => switchTab(index);
        container.appendChild(tab);
    });
}

function switchTab(index) {
    if (activeTabIndex !== null && notesData[activeTabIndex]) {
        notesData[activeTabIndex].content = document.getElementById("content").value;
    }
    
    activeTabIndex = index;
    document.getElementById("content").value = notesData[activeTabIndex].content || "";
    
    saveToLocal();
    renderTabs();
}

async function addNewTab() {
    if (activeTabIndex !== null && notesData[activeTabIndex]) {
        notesData[activeTabIndex].content = document.getElementById("content").value;
    }

    let newTitle = prompt("Enter tab name:", `Note ${notesData.length + 1}`);
    if (!newTitle) return;

    let existing = notesData.some(n => n.title.toLowerCase() === newTitle.toLowerCase());
    if (existing) {
        newTitle = `${newTitle} (${notesData.length + 1})`;
    }

    notesData.push({ title: newTitle, content: "" });
    saveToLocal();
    switchTab(notesData.length - 1);
    await saveData();
}

function renameTab(index) {
    let newTitle = prompt("Rename tab:", notesData[index].title);
    if (newTitle) {
        notesData[index].title = newTitle;
        saveToLocal();
        renderTabs();
        saveData();
    }
}

function deleteTab(index) {
    if (notesData.length <= 1) return;
    if (confirm(`Delete tab "${notesData[index].title}"?`)) {
        notesData.splice(index, 1);
        if (activeTabIndex >= notesData.length) {
            activeTabIndex = notesData.length - 1;
        }
        saveToLocal();
        switchTab(activeTabIndex);
        saveData();
    }
}

function handleTyping() {
    if (activeTabIndex !== null && notesData[activeTabIndex]) {
        notesData[activeTabIndex].content = document.getElementById("content").value;
    }
    
    saveToLocal();

    document.getElementById("status").innerText = "Unsaved changes...";
    clearTimeout(typingTimer);
    typingTimer = setTimeout(saveData, doneTypingInterval);
}

function saveToLocal() {
    try {
        localStorage.setItem("ps_note_backup", JSON.stringify(notesData));
    } catch (e) {}
}

async function saveData() {
    clearTimeout(typingTimer);
    if (activeTabIndex !== null && notesData[activeTabIndex]) {
        notesData[activeTabIndex].content = document.getElementById("content").value;
    }
    
    saveToLocal();

    let pass = document.getElementById("password").value;
    let contentString = JSON.stringify(notesData);
    
    document.getElementById("status").innerText = "Saving to Drive...";

    try {
        let response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "save", pass: pass, content: contentString })
        });
        let result = await response.json();

        if (result.status === "success") {
            document.getElementById("status").innerText = "All changes saved ✓";
            setTimeout(() => { 
                if(document.getElementById("status").innerText === "All changes saved ✓") {
                    document.getElementById("status").innerText = ""; 
                }
            }, 3000);
        } else {
            document.getElementById("status").innerText = "Failed to save to cloud!";
        }
    } catch (err) {
        document.getElementById("status").innerText = "Offline (Saved locally)";
    }
}

async function changePassword() {
    let currentPass = document.getElementById("password").value;
    let newPass = prompt("Enter new password:");
    
    if (!newPass) return;

    document.getElementById("status").innerText = "Changing password...";

    try {
        let response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "change_password", 
                pass: currentPass, 
                newPass: newPass 
            })
        });
        let result = await response.json();

        if (result.status === "success") {
            alert("Password changed successfully!");
            document.getElementById("password").value = newPass; 
            document.getElementById("status").innerText = "Password updated ✓";
            setTimeout(() => { document.getElementById("status").innerText = ""; }, 3000);
        } else {
            alert(result.message || "Failed to change password.");
            document.getElementById("status").innerText = "";
        }
    } catch (err) {
        alert("Connection error.");
        document.getElementById("status").innerText = "";
    }
}
