import "./globals.css";

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
				{children}
			</body>
		</html>
	);
}
