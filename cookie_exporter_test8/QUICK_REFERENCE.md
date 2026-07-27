# Quick Reference: httpOnly Cookies in Chrome Extensions

## TL;DR

**Question:** How do Chrome extensions access httpOnly cookies?
**Answer:** They just do. `chrome.cookies.getAll()` returns them because extensions run in a privileged context.

**Question:** What about cf_clearance?
**Answer:** It's a Cloudflare cookie marked httpOnly. Your extension can read it after the challenge completes.

**Question:** Why does the extension use chrome.debugger?
**Answer:** Extra reliability. It uses the Chrome DevTools Protocol (CDP) as the primary method with a fallback to the standard API.

---

## The 30-Second Explanation

```
┌──────────────────────────────────────────┐
│         Website JavaScript               │
│  Can see: regular cookies                │
│  BLOCKED:  httpOnly cookies ❌           │
└──────────────────────────────────────────┘
                    vs
┌──────────────────────────────────────────┐
│       Extension (Privileged Mode)        │
│  Can see: regular cookies ✅             │
│  Can see: httpOnly cookies ✅            │
│  Can see: secure cookies ✅              │
│  Can see: cf_clearance ✅                │
└──────────────────────────────────────────┘
```

---

## What Changed in Your Extension

### Before
```javascript
chrome.cookies.getAll({ url }, callback);
// Works but could fail on some sites
```

### Now
```javascript
// Try 1: Chrome DevTools Protocol (more reliable)
await chrome.debugger.sendCommand({ tabId }, "Storage.getCookies");

// If that fails, Try 2: Standard API (faster)
chrome.cookies.getAll({ url }, callback);
```

**Result:** Works on almost all sites including Cloudflare.

---

## Required Setup

### manifest.json
```json
{
  "permissions": ["cookies", "tabs", "debugger"],
  "host_permissions": ["<all_urls>"]
}
```

**That's it.** No extra configuration needed.

---

## The APIs

### Method 1: Chrome Debugger (Primary)
```javascript
await chrome.debugger.attach({ tabId }, "1.3");
const result = await chrome.debugger.sendCommand(
  { tabId },
  "Storage.getCookies"  // Gets ALL cookies
);
await chrome.debugger.detach({ tabId });
```
**Pro:** Most reliable  
**Con:** Needs debugger permission, protocol overhead

### Method 2: Standard API (Fallback)
```javascript
chrome.cookies.getAll({ url }, (cookies) => {
  console.log(cookies);  // Has httpOnly flag
});
```
**Pro:** Fast, simple  
**Con:** Can fail on some sites

---

## Common Console Messages

| Message | Meaning | Status |
|---------|---------|--------|
| `Storage.getCookies: X cookies found` | CDP method working | ✅ Good |
| `Falling back to chrome.cookies.getAll()` | CDP failed, using standard API | ✅ Still works |
| `cf_clearance FOUND!` | Cookie is present | ✅ Success |
| `cf_clearance NOT found` | Cookie missing | ⚠️ Check site/challenge |

---

## Quick Test

```javascript
// Run in extension Service Worker console:

chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  const url = tabs[0].url;
  chrome.cookies.getAll({ url }, (cookies) => {
    console.log(`Found ${cookies.length} cookies`);
    cookies.forEach(c => {
      console.log(`- ${c.name}: ${c.value.substring(0, 20)}...`);
      if (c.httpOnly) console.log("  └─ httpOnly: YES");
    });
  });
});
```

---

## Why httpOnly is Still Readable

```
httpOnly flag means:
  ❌ Page JavaScript CANNOT read it
  ✅ Extension API CAN read it  ← This is your extension
  ✅ Browser sees it internally
  ✅ Network requests include it
```

**It's a JavaScript sandbox boundary, not an extension boundary.**

---

## cf_clearance Specific

```
What:    Cookie from Cloudflare
Mark:    httpOnly=true, secure=true
Purpose: Identify you as human (anti-bot)
Your extension sees it?  YES ✅
Can you export it?       YES ✅
Is it dangerous?         NO (you're already logged in)
```

---

## Troubleshooting Flowchart

```
No cookies showing?
├─ Check: permissions in manifest.json
├─ Check: extension reloaded after code changes
├─ Check: visiting site with cookies
└─ Check: Service Worker logs

cf_clearance missing?
├─ Check: on Cloudflare-protected site (not all sites use it)
├─ Check: waited for challenge to complete
├─ Check: page shows normal content (not "Checking browser")
└─ Check: refresh page and wait 15 seconds

cf_clearance shows but no other cookies?
└─ Extension is working correctly (cf_clearance is httpOnly)
```

---

## Permission Meanings

| Permission | What It Does | Why Extension Needs It |
|------------|-------------|----------------------|
| `cookies` | Read/write cookie data | To access cookies |
| `tabs` | Get current tab info | To know which tab to query |
| `debugger` | Attach Chrome debugger | To use CDP for reliability |
| `<all_urls>` | Access any domain | To read cookies from any site |

---

## The Research Summary

### 1. How Do Extensions Access httpOnly Cookies?
**Answer:** Two ways:
- `chrome.cookies` API (privileged extension API)
- Chrome DevTools Protocol via `chrome.debugger` (protocol level)

### 2. Why Doesn't JavaScript See Them?
**Answer:** httpOnly is a sandbox boundary between page JS and browser internals.

### 3. Is This a Security Vulnerability?
**Answer:** No. The extension runs in your browser, with your permission, and only accesses YOUR cookies.

### 4. What About cf_clearance?
**Answer:** It's just a cookie with the `httpOnly` flag. Your extension reads it like any other.

### 5. Why Use CDP Instead of Just chrome.cookies?
**Answer:** More reliable for problematic sites. Chrome DevTools operates at the protocol level.

---

## Real-World Example

### Scenario: Accessing Cloudflare Site
```
You visit: example.com (Cloudflare-protected)
           ↓
Cloudflare shows: "Checking your browser..."
                 (solving security challenge)
                  ↓
You solve it: ✅ Challenge passed
              ↓
Browser stores: cf_clearance cookie
                ↓
You click extension icon
                 ↓
Extension tries: chrome.debugger.sendCommand("Storage.getCookies")
                 ↓
Result: [
  { name: "cf_clearance", value: "abc123...", httpOnly: true },
  { name: "__Host-session", value: "xyz789...", httpOnly: true },
  { name: "_ga", value: "ga...", httpOnly: false },
  // ... other cookies
]
                 ↓
You see: All cookies listed in popup ✅
```

---

## Code Reference

### Getting Cookies (Both Methods)
```javascript
// Method 1: CDP (Primary)
async function getWithCDP(tabId) {
  await chrome.debugger.attach({ tabId }, "1.3");
  const result = await chrome.debugger.sendCommand({ tabId }, "Storage.getCookies");
  await chrome.debugger.detach({ tabId });
  return result.cookies;
}

// Method 2: Standard API (Fallback)
function getWithStandardAPI(url) {
  return new Promise(resolve => {
    chrome.cookies.getAll({ url }, resolve);
  });
}

// Use with fallback
async function getCookies(url, tabId) {
  try {
    return await getWithCDP(tabId);
  } catch (error) {
    return await getWithStandardAPI(url);
  }
}
```

---

## Did You Know?

- ✅ `chrome.cookies.getAll()` has worked since Chrome Extension API v1
- ✅ httpOnly cookies have been readable to extensions for years
- ✅ There is NO special "hack" needed to read httpOnly cookies
- ✅ The security boundary is between page JS and extensions, not within extensions
- ✅ cf_clearance is just metadata, the flag doesn't create protection from extensions
- ✅ Popular extensions (EditThisCookie) don't do anything special either

---

## Still Confused?

Think of it this way:

```
Like having a safe in your house:
- Burglars can't get in (httpOnly from page JS)
- You have the combination (extension API access)
- The lock says "httpOnly" but you have the key

The lock protects against page JavaScript (unauthorized third party).
It doesn't protect against your extension (the homeowner).
```

---

## References

- [Chrome cookies API](https://developer.chrome.com/docs/extensions/reference/cookies/)
- [Chrome debugger API](https://developer.chrome.com/docs/extensions/reference/debugger/)
- [Chrome DevTools Protocol: Storage Domain](https://chromedevtools.github.io/devtools-protocol/tot/Storage/)
- [MDN: document.cookie restrictions](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security)

---

## Help

**Something not working?** See: `TROUBLESHOOTING.md`  
**Want technical details?** See: `RESEARCH_HTTPONLY_COOKIES.md`  
**Want implementation info?** See: `IMPLEMENTATION_SUMMARY.md`
