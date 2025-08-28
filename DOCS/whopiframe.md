
iFrame
Getting Started
Getting started with the Whop iFrame SDK

Whop apps are embedded into the site using iFrames. This SDK provides a type-safe way for you to communicate with the Whop application using a request/response style API powered by window.postMessage.
Since this package relies on window.postMessage, it only works in Client Components.
​
Relevant Packages
@whop/iframe - The main package for the iframe SDK.
@whop/react - A React wrapper for Whop Apps including helpers for the iframe SDK.
​
Setup
The main function exported from the @whop/iframe package is the createSdk function. When called, this function sets up a listener for messages from the main Whop site, using window.on('message', ...). It is also exposed through the WhopIframeSdkProvider component from @whop/react.
​
React
If you’re using React, it is recommended to use the WhopIframeSdkProvider component from @whop/react to provide the iframe SDK to all child components.

Step 1: Mount provider in root layout

Step 2: Consume the iframe SDK in a component

Copy

Ask AI
// components/example.tsx
import { useIframeSdk } from "@whop/react";

export const Example = () => {
  const iframeSdk = useIframeSdk();

  return (
    <button
      onClick={() => iframeSdk.openExternalUrl({ url: "https://example.com" })}
    >
      Open External URL
    </button>
  );
};

Open External Links
Open external links from within the iFrame

If you want to open external links from within the iFrame, you can use the openExternalLinks function. This will close your app and move to a new website.
​
Usage
This function requires the iFrame SDK to be initialized. See iFrame Overview for more information.

React

Vanilla JS

Copy

Ask AI
"use client";
import { useIframeSdk } from "@whop/react";

export default function Home() {
	const iframeSdk = useIframeSdk();
	
	function openLink() {
		iframeSdk.openExternalUrl({ url: "https://google.com" });
	}
	
	return <button onClick={openLink}>Click me to open Google</button>;
}

---

@whop/iframe
Official SDK to power communications of a Whop embedded app and the host frame. Use this for native js implementations for Whop Apps. If you are using react we recommend the usage of @whop/react instead.

Setup
// lib/iframe-sdk.ts
import { createSdk } from "@whop/iframe";

export const iframeSdk = createSdk({
	appId: process.env.NEXT_PUBLIC_WHOP_APP_ID,
});
Usage
Now you can import your iframeSdk instance and use it to react to user events

// index.ts
import { iframeSdk } from "@/lib/iframe-sdk";

const navigationButtonElement = document.querySelector("button");

if (navigationButtonElement && navigationButtonElement.dataset.listenerAttached !== "true") {
	navigationButtonElement.addEventListener("click", () => {
		iframeSdk.openExternalUrl({ url: "https://example.com" });
	});
	
	navigationButtonElement.dataset.listenerAttached = "true";
}
Readme

---

Popup OAuth + postMessage handoff (for iframes)

- Flow overview:
  - Inside the iframe, open the provider authorize URL in a popup window.
  - The popup completes OAuth on your app’s domain and hits your callback.
  - The callback sets session cookies and responds with a small page that posts a message back to the opener (the iframe) and closes itself.
  - The iframe listens for that message and reloads (or updates UI), now authenticated.

- Parent page (optional):
  - If you control the parent page (Whop experience), you can also listen for `{ type: 'x-auth', status: 'ok' }` on `window` and programmatically reload the iframe if needed.

Example parent listener (if you own the host page):

```html
<script>
  window.addEventListener('message', (e) => {
    if (e?.data && e.data.type === 'x-auth' && e.data.status === 'ok') {
      // Find the iframe and reload it
      const iframe = document.querySelector('iframe[src*="your-app-domain"]');
      if (iframe) {
        iframe.contentWindow.location.reload();
      } else {
        // Fallback: reload page
        window.location.reload();
      }
    }
  });
  </script>
```

Notes
- This pattern avoids relying on third‑party cookies for the round‑trip, and works in Chromium and Safari.
- For Safari: cookies issued by the callback are first‑party (on your domain), so your iframe can use them after reload. If Safari still blocks third‑party cookies, keep tokens server‑side and call your server for X actions.
