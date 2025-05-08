chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCookies" && message.url) {
      chrome.cookies.getAll({ url: message.url }, (cookies) => {
        sendResponse({ cookies });
      });
      return true; // Keeps sendResponse alive
    }
  });
  