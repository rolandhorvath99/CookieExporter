document.addEventListener("DOMContentLoaded", function () {
    const cookieList = document.getElementById("cookieList");
    const jsonOutput = document.getElementById("jsonOutput");
    const copyBtn = document.getElementById("copyBtn");
    const selectAllBtn = document.getElementById("selectAllBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const searchInput = document.getElementById("searchInput");
    const downloadBtn = document.getElementById("downloadBtn");
    const domainName = document.getElementById("domainName");
  
    let cookiesData = [];
    let currentURL = "";
  
    jsonOutput.value = `"cookies": []`;
  
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tab = tabs[0];
      currentURL = tab.url;
      const domain = new URL(tab.url).hostname;
      domainName.textContent = domain;
      loadCookies(currentURL);
    });
  
    function loadCookies(url) {
      chrome.runtime.sendMessage({ action: "getCookies", url: url }, function (response) {
        if (response && response.cookies) {
          cookiesData = response.cookies.map(cookie => ({ ...cookie, checked: false }));
          renderCookies();
        } else {
          console.error("Failed to fetch cookies.");
        }
      });
    }
  
    function renderCookies(filteredList = null) {
      cookieList.innerHTML = "";
      const listToRender = filteredList || cookiesData;
  
      listToRender.forEach((cookie) => {
        const label = document.createElement("label");
        label.className = "cookie-item";
  
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = cookie.checked;
        checkbox.dataset.name = cookie.name;
        checkbox.dataset.value = cookie.value;
  
        checkbox.addEventListener("change", function () {
          const index = cookiesData.findIndex(
            (c) => c.name === cookie.name && c.value === cookie.value
          );
          if (index !== -1) {
            cookiesData[index].checked = checkbox.checked;
          }
          updateJsonOutput();
        });
  
        const name = document.createElement("strong");
        name.textContent = cookie.name + ": ";
  
        const value = document.createElement("span");
        value.textContent = cookie.value;
        value.className = "cookie-value";
        value.contentEditable = true;
        value.spellcheck = false;
        value.addEventListener("input", () => {
          const index = cookiesData.findIndex(
            (c) => c.name === cookie.name && c.value === cookie.value
          );
          if (index !== -1) {
            cookiesData[index].value = value.textContent;
            checkbox.dataset.value = value.textContent;
          }
          updateJsonOutput();
        });
  
        label.appendChild(checkbox);
        label.appendChild(name);
        label.appendChild(value);
        cookieList.appendChild(label);
      });
  
      updateJsonOutput();
    }
  
    function updateJsonOutput() {
      const selected = cookiesData
        .filter((c) => c.checked)
        .map((c) => ({
          name: c.name,
          value: c.value.replace(/['"{}`]/g, ""),
        }));
      jsonOutput.value = `"cookies": ${JSON.stringify(selected, null, 2)}`;
    }
  
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(jsonOutput.value).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = originalText), 1500);
      });
    });
  
    selectAllBtn.addEventListener("click", () => {
      const allSelected = cookiesData.every((c) => c.checked);
      cookiesData.forEach((c) => (c.checked = !allSelected));
      renderCookies();
    });
  
    refreshBtn.addEventListener("click", () => {
      loadCookies(currentURL);
    });
  
    searchInput.addEventListener("input", () => {
      const value = searchInput.value.toLowerCase();
      const filtered = cookiesData.filter((c) =>
        c.name.toLowerCase().includes(value)
      );
      renderCookies(filtered);
    });
  
    downloadBtn.addEventListener("click", () => {
      const blob = new Blob([jsonOutput.value], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cookies.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  });
  