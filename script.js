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

async function unlockNote() {
    let pass = document.getElementById("password").value;
    if (!pass) {
        alert("Please enter the password!");
        return;
    }

    document.getElementById("status").innerText = "Loading data...";
    
    try {
        let response = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "load", pass: pass })
        });
        let result = await response.json();

        if (result.status === "success") {
            if (result.content) {
                try {
                    let parsed = JSON.parse(result.content);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        notesData = parsed;
                    }
                } catch (e) {
                    notesData = [{ title: "Note 1", content: result.content }];
                }
            }
            
            renderTabs();
            switchTab(0);
            document.getElementById("login-box").classList.add("hidden");
            document.getElementById("app").classList.remove("hidden");
            document.getElementById("status").innerText = "";
        } else {
            alert(result.message || "Incorrect password!");
            document.getElementById("status").innerText = "";
        }
    } catch (err) {
        alert("Connection failed. Please try again.");
        document.getElementById("status").innerText = "";
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
    renderTabs();
}

function addNewTab() {
    // Sinkronisasi teks dari tab aktif saat ini sebelum tab baru dibuat
    if (activeTabIndex !== null && notesData[activeTabIndex]) {
        notesData[activeTabIndex].content = document.getElementById("content").value;
    }

    let newTitle = prompt("Enter tab name:", `Note ${notesData.length + 1}`);
    if (!newTitle) return;

    notesData.push({ title: newTitle, content: "" });
    switchTab(notesData.length - 1);
    
    // Memicu auto-save keseluruhan data tab langsung ke server
    saveData();
}

function renameTab(index) {
    let newTitle = prompt("Rename tab:", notesData[index].title);
    if (newTitle) {
        notesData[index].title = newTitle;
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
        switchTab(activeTabIndex);
        saveData();
    }
}

function handleTyping() {
    if (activeTabIndex !== null && notesData[activeTabIndex]) {
        notesData[activeTabIndex].content = document.getElementById("content").value;
    }
    document.getElementById("status").innerText = "Unsaved changes...";
    clearTimeout(typingTimer);
    typingTimer = setTimeout(saveData, doneTypingInterval);
}

async function saveData() {
    clearTimeout(typingTimer);
    if (activeTabIndex !== null && notesData[activeTabIndex]) {
        notesData[activeTabIndex].content = document.getElementById("content").value;
    }
    
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
            document.getElementById("status").innerText = "Failed to save!";
        }
    } catch (err) {
        document.getElementById("status").innerText = "Connection error!";
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
