import '../globals.css';

/** Root layout of /captcha (outside [locale] and the proxy, C15): no shell, the page sets its language. */
export default function CaptchaLayout({ children }: LayoutProps<'/captcha'>) {
	return (
		<html lang="sl">
			<body>{children}</body>
		</html>
	);
}
