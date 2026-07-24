chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCookies" && message.url) {
      chrome.cookies.getAll({ url: message.url }, (cookies) => {
        if (chrome.runtime.lastError) {
          console.error("Error fetching cookies:", chrome.runtime.lastError);
          sendResponse({ cookies: [], error: chrome.runtime.lastError.message });
        } else {
          console.log(`Retrieved ${cookies.length} cookies for ${message.url}`);
          sendResponse({ cookies });
        }
      });
      return true; // Keeps sendResponse alive
    }
  });
  