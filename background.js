chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCookies" && message.url) {
      try {
        // Extract domain from URL
        const url = new URL(message.url);
        const domain = url.hostname;
        
        // Fetch cookies for the domain (gets httpOnly, secure, and all cookies)
        chrome.cookies.getAll({ domain: domain }, (cookies) => {
          if (chrome.runtime.lastError) {
            console.error("Error fetching cookies:", chrome.runtime.lastError);
            sendResponse({ cookies: [], error: chrome.runtime.lastError.message });
          } else {
            console.log(`Retrieved ${cookies.length} cookies for domain: ${domain}`);
            // Log details of restricted cookies
            cookies.forEach(cookie => {
              if (cookie.httpOnly || cookie.secure) {
                console.log(`Restricted cookie: ${cookie.name} (httpOnly: ${cookie.httpOnly}, secure: ${cookie.secure})`);
              }
            });
            sendResponse({ cookies });
          }
        });
      } catch (error) {
        console.error("Error processing URL:", error);
        sendResponse({ cookies: [], error: error.message });
      }
      return true; // Keeps sendResponse alive
    }
  });
  