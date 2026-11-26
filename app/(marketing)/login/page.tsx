import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only our own paths, never an absolute URL someone put in the query string.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/today';

  return <LoginForm next={safeNext} />;
}
