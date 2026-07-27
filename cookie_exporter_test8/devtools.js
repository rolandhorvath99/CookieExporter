// Devtools script to access Chrome DevTools Protocol
// This allows us to get ALL cookies including those normally hidden

chrome.devtools.inspectedWindow.eval("document.cookie", function(result, error) {
  if (error) {
    console.error("Error accessing document.cookie:", error);
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getDevtoolsCookies") {
    // Use the Chrome DevTools Protocol to get all network cookies
    chrome.devtools.network.getHAR(function(har) {
      const allCookies = [];
      
      // Extract cookies from HAR entries
      if (har && har.log && har.log.entries) {
        har.log.entries.forEach(entry => {
          if (entry.request && entry.request.cookies) {
            entry.request.cookies.forEach(cookie => {
              const existing = allCookies.find(c => c.name === cookie.name);
              if (!existing) {
                allCookies.push({
                  name: cookie.name,
                  value: cookie.value,
                  domain: message.domain || "",
                  path: cookie.path || "/"
                });
              }
            });
          }
        });
      }
      
      sendResponse({ cookies: allCookies });
    });
    return true;
  }
});
