# Cookie Exporter Troubleshooting Guide

## cf_clearance Cookie Not Appearing?

### Checklist

1. **Are you on a Cloudflare-protected site?**
   - cf_clearance only appears on sites using Cloudflare protection
   - Check: Visit site in normal browser, look for Cloudflare badge in Network tab
   - Test with: Try visiting a known Cloudflare site

2. **Have you waited for the challenge to complete?**
   - Cloudflare requires solving a challenge (usually automatic)
   - Browser shows "Challenge failed" or needs manual interaction? Check Network tab
   - Try: Refresh the page and wait 10-15 seconds before opening extension

3. **Are host permissions correct?**
   ```json
   "host_permissions": ["<all_urls>"]
   ```
   - This is required to access any domain's cookies
   - If permission is missing, the extension can't read ANY cookies

4. **Check extension console logs:**
   - Right-click extension icon → "Inspect popup"
   - Go to "Service Worker" tab (not popup tab)
   - Look for messages like:
     - ✅ "Storage.getCookies: X cookies found" - CDP working
     - 📍 "Using standard chrome.cookies.getAll()" - Fallback active
     - ⚠️ "cf_clearance NOT found" - Cookie not in browser

### What the Console Messages Mean

```
🔍 Attempting CDP method for: example.com
✅ Storage.getCookies: 5 cookies found
✅ Network.getCookies: 3 cookies found
✅ Total: 5 cookies for example.com
  • __Host-session [httpOnly, secure]
  • cf_clearance [httpOnly, secure]
  • _ga [secure]
🔒 ✅ cf_clearance FOUND! (httpOnly: true)
```

**This means:** ✅ Extension is working perfectly

```
🔍 Attempting CDP method for: example.com
⚠️ CDP method failed: Debugging port is closed
📍 Falling back to chrome.cookies.getAll()...
  - URL query: 0 cookies
  - Domain query: 5 cookies
✅ Total: 5 cookies for example.com
🔒 ✅ cf_clearance FOUND! (httpOnly: true)
```

**This means:** ✅ CDP failed but fallback worked (still getting cookies)

```
⚠️ cf_clearance NOT found
```

**Means:** Either the site doesn't use Cloudflare, or the cookie hasn't been created yet

---

## No Cookies Appearing at All?

### Step-by-Step Diagnosis

1. **Check manifest.json permissions:**
   ```json
   "permissions": ["cookies", "tabs", "debugger"],
   "host_permissions": ["<all_urls>"]
   ```

2. **Reload the extension:**
   - Chrome → Extensions → Find "Cookie Exporter"
   - Click refresh icon

3. **Check browser console for errors:**
   - Open DevTools (F12)
   - Check "Console" tab for JavaScript errors

4. **Check Service Worker console:**
   - Right-click extension icon → "Manage extension"
   - Scroll down to "Service Worker"
   - Click "background.js" to view logs

5. **Try a different website:**
   - Visit a normal site without Cloudflare protection (e.g., google.com)
   - See if cookies appear
   - If they do: problem is domain-specific
   - If they don't: problem is extension-wide

### Common Permission Errors

**Error:** "Debugger is not allowed to attach"
- **Cause:** Trying to debug extension's own origin or restricted page
- **Fix:** This is expected for some pages - extension has fallback to chrome.cookies API

**Error:** "Missing host permission for [domain]"
- **Cause:** host_permissions doesn't match the domain
- **Fix:** Change `host_permissions` to `["<all_urls>"]`

---

## Why httpOnly Cookies Are Still Readable

The `httpOnly` flag **doesn't prevent extensions** from reading cookies. It only prevents:
- ❌ Page JavaScript from accessing it via `document.cookie`
- ✅ BUT extensions can still read it via `chrome.cookies` API
- ✅ AND via Chrome DevTools Protocol

**Example:**
```javascript
// In page JavaScript:
console.log(document.cookie);  // ❌ cf_clearance NOT in here (httpOnly blocked)

// In extension code:
chrome.cookies.getAll({}, (cookies) => {
  const cf = cookies.find(c => c.name === "cf_clearance");
  console.log(cf.value);  // ✅ Extension CAN read it!
});
```

---

## Testing the Extension

### Quick Test

1. **Go to a Cloudflare-protected site**
   - Examples: example.com, stackoverflow.com, or search "cloudflare protected sites"

2. **Wait for challenge to complete**
   - You should see a normal page (no "Checking your browser" message)
   - If you see the challenge message: wait 10-15 seconds

3. **Click extension icon**
   - Should show list of cookies
   - cf_clearance should be in the list

4. **Check extension logs**
   - Right-click extension → "Inspect" 
   - Go to "Service Worker" tab
   - Should see `cf_clearance FOUND` message

### Manual Console Test

1. **In extension Service Worker console, run:**
```javascript
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.runtime.sendMessage({action: "getCookies", url: tabs[0].url}, 
    (response) => {
      console.log("Cookies:", response.cookies);
      const cf = response.cookies.find(c => c.name === "cf_clearance");
      console.log("cf_clearance:", cf);
    }
  );
});
```

2. **Look at popup console for output**

---

## Browser Compatibility

| Browser | Works | Notes |
|---------|-------|-------|
| Chrome 88+ | ✅ Yes | Full support for debugger API |
| Edge (Chromium) | ✅ Yes | Same engine as Chrome |
| Brave | ✅ Yes | Based on Chromium |
| Opera | ✅ Yes | Chromium-based |
| Firefox | ❌ No | Uses different extension API |

---

## Advanced Debugging

### Enable Verbose Logging

Modify `background.js` to add more logs:

```javascript
console.log("=== Starting cookie fetch ===");
console.log("URL:", url);
console.log("Tab ID:", tabId);
console.log("Permissions:", chrome.permissions);
```

### Test Each Method Separately

**Test standard API only:**
```javascript
chrome.cookies.getAll({url}, (cookies) => {
  console.log("Standard API result:", cookies);
});
```

**Test CDP only:**
```javascript
await chrome.debugger.attach({ tabId }, "1.3");
const result = await chrome.debugger.sendCommand({ tabId }, "Storage.getCookies");
console.log("CDP result:", result.cookies);
await chrome.debugger.detach({ tabId });
```

---

## Report a Bug

If cookies still aren't showing:

1. **Gather information:**
   - Website URL
   - Extension console output (copy error messages)
   - Browser version (Help → About)
   - Screenshot of popup

2. **Check if it's a known issue:**
   - Some sites use special cookie protection
   - Some corporate environments block extensions
   - Some browsers have additional restrictions

3. **Try the latest version:**
   - Extension auto-updates, but you can manually refresh
   - Right-click extension → "Manage extension" → refresh

---

## FAQ

**Q: Why can't extensions see httpOnly cookies?**
A: They actually CAN! Only page JavaScript is blocked from accessing them.

**Q: Is it safe to show httpOnly cookies?**
A: Yes - you're already logged in, so showing them in your extension doesn't create new risks.

**Q: Why does the extension need the "debugger" permission?**
A: It's the most robust way to access cookies. It's used as a fallback if the standard API fails.

**Q: Can I use this to steal cookies from other people?**
A: No - extensions can only access cookies from sites you visit in YOUR browser, for YOUR own account.

**Q: Why is cf_clearance needed?**
A: Cloudflare uses it to identify you as a human. Some automated tools need it to make requests.

---

## Still Having Issues?

1. **Check the RESEARCH_HTTPONLY_COOKIES.md file** for technical details
2. **Review manifest.json** for missing permissions
3. **Check Service Worker logs** (right-click extension → inspect)
4. **Try a different website** to isolate the problem
5. **Reload the extension** (refresh button in extensions manager)
