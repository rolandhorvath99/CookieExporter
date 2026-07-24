chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getCookies" && message.url) {
      try {
        const url = new URL(message.url);
        const fullDomain = url.hostname; // e.g., "northwestfarmer.com.au"
        
        console.log("=== Cookie Fetching Debug ===");
        console.log("Full URL:", message.url);
        console.log("Hostname:", fullDomain);
        
        // Fetch cookies using the full URL (most reliable method)
        chrome.cookies.getAll({ url: message.url }, (cookies) => {
          if (chrome.runtime.lastError) {
            console.error("❌ Error fetching cookies:", chrome.runtime.lastError);
            sendResponse({ cookies: [], error: chrome.runtime.lastError.message });
            return;
          }
          
          console.log(`✅ Successfully retrieved ${cookies.length} cookies`);
          
          // Log all cookies with details
          cookies.forEach(cookie => {
            const flags = [];
            if (cookie.httpOnly) flags.push("httpOnly");
            if (cookie.secure) flags.push("secure");
            if (cookie.sameSite) flags.push(`sameSite=${cookie.sameSite}`);
            if (cookie.session) flags.push("session");
            
            const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
            console.log(`  • ${cookie.name}${flagStr}`);
          });
          
          // Specifically log if cf_clearance is present
          const cfCookie = cookies.find(c => c.name === "cf_clearance");
          if (cfCookie) {
            console.log("🔒 cf_clearance FOUND:", cfCookie);
          } else {
            console.log("⚠️ cf_clearance NOT found in cookie list");
          }
          
          sendResponse({ cookies });
        });
      } catch (error) {
        console.error("❌ Error processing URL:", error);
        sendResponse({ cookies: [], error: error.message });
      }
      return true; // Keeps sendResponse alive
    }
  });
  