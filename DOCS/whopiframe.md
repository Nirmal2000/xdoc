
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