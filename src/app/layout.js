import { WhopIframeSdkProvider } from "@whop/react";import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
	title: "Xdoc",
	description: "AI-powered X/Twitter analytics assistant",
};

export default function RootLayout({
	children,
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="dark">
				<WhopIframeSdkProvider>{children}</WhopIframeSdkProvider>
				<Toaster position="top-right" />
			</body>
		</html>
	);
}
