// Store cookies found through various methods
let collectedCookies = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCookies" && message.url) {
    // Use the CDP/debugger method which is more reliable for httpOnly cookies
    getCookiesThroughDebugger(message.url, sender.tab.id, sendResponse);
    return true;
  }
  
  if (message.action === "reportCookies") {
    console.log("📝 Cookies from content script:", message.cookies);
  }
});

/**
 * Method 1: Get cookies via the Chrome DevTools Protocol (most reliable for httpOnly)
 * This bypasses JavaScript restrictions and accesses cookies at the protocol level
 */
async function getCookiesThroughDebugger(url, tabId, sendResponse) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    console.log("🔍 Attempting CDP method for:", domain);
    
    // Attach debugger to the tab
    await chrome.debugger.attach({ tabId }, "1.3");
    
    try {
      // Enable Storage domain
      await chrome.debugger.sendCommand({ tabId }, "Storage.enable");
      
      // Get ALL cookies via Storage.getCookies() - includes httpOnly and secure!
      const result = await chrome.debugger.sendCommand({ tabId }, "Storage.getCookies");
      console.log(`✅ Storage.getCookies: ${result.cookies.length} cookies found`);
      
      // Also try Network.getCookies for the specific URL
      await chrome.debugger.sendCommand({ tabId }, "Network.enable");
      const networkResult = await chrome.debugger.sendCommand({ tabId }, "Network.getCookies", {
        urls: [url]
      });
      console.log(`✅ Network.getCookies: ${networkResult.cookies.length} cookies found`);
      
      // Merge results, preferring Storage.getCookies data
      let allCookies = mergeAndDeduplicateCookies(result.cookies, networkResult.cookies);
      
      logAndRespond(allCookies, domain, sendResponse);
    } finally {
      // Always detach debugger
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {
        console.log("Debugger detach error (expected if tab closed):", e.message);
      }
    }
  } catch (error) {
    console.warn("⚠️ CDP method failed:", error.message);
    console.log("📍 Falling back to chrome.cookies.getAll()...");
    
    // Fallback to the standard cookies API
    getCookiesThroughStandardAPI(url, sendResponse);
  }
}

/**
 * Fallback method: Use the standard chrome.cookies API
 * Note: This should include httpOnly cookies if proper permissions are set
 */
function getCookiesThroughStandardAPI(url, sendResponse) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    console.log("📍 Using standard chrome.cookies.getAll() for:", domain);
    
    // Primary method: Chrome's cookies API with URL
    chrome.cookies.getAll({ url }, (apiCookies) => {
      console.log(`  - URL query: ${apiCookies.length} cookies`);
      
      // Also try with domain parameter
      chrome.cookies.getAll({ domain }, (domainCookies) => {
        console.log(`  - Domain query: ${domainCookies.length} cookies`);
        
        // Merge results
        let allCookies = mergeAndDeduplicateCookies(apiCookies, domainCookies);
        
        // Also try parent domain for wildcard cookies
        const domainParts = domain.split('.');
        if (domainParts.length > 2) {
          const parentDomain = '.' + domainParts.slice(-2).join('.');
          chrome.cookies.getAll({ domain: parentDomain }, (parentCookies) => {
            console.log(`  - Parent domain (${parentDomain}): ${parentCookies.length} cookies`);
            allCookies = mergeAndDeduplicateCookies(allCookies, parentCookies);
            logAndRespond(allCookies, domain, sendResponse);
          });
        } else {
          logAndRespond(allCookies, domain, sendResponse);
        }
      });
    });
  } catch (error) {
    console.error("❌ Standard API error:", error);
    sendResponse({ cookies: [], error: error.message });
  }
}

/**
 * Merge and deduplicate cookies from multiple sources
 */
function mergeAndDeduplicateCookies(cookies1, cookies2) {
  const map = new Map();
  
  [cookies1, cookies2].forEach(cookieArray => {
    cookieArray.forEach(cookie => {
      const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
      map.set(key, cookie);
    });
  });
  
  return Array.from(map.values());
}

/**
 * Log and respond with cookie data
 */
function logAndRespond(allCookies, domain, sendResponse) {
  console.log(`\n✅ Total: ${allCookies.length} cookies for ${domain}`);
  
  allCookies.forEach(cookie => {
    const flags = [];
    if (cookie.httpOnly) flags.push("httpOnly");
    if (cookie.secure) flags.push("secure");
    if (cookie.sameSite) flags.push(`sameSite=${cookie.sameSite}`);
    if (cookie.session) flags.push("session");
    
    const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
    console.log(`  • ${cookie.name}${flagStr}`);
  });
  
  const cfCookie = allCookies.find(c => c.name === "cf_clearance");
  if (cfCookie) {
    console.log("\n🔒 ✅ cf_clearance FOUND! (httpOnly: " + cfCookie.httpOnly + ")");
  } else {
    console.log("\n⚠️ cf_clearance NOT found");
  }
  
  sendResponse({ cookies: allCookies });
}
  