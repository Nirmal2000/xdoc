export default async function ExperienceLayout({
	children,
	params,
}) {
	const { experienceId } = await params;

	return children;
}