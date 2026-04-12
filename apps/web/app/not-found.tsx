import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl font-black gradient-text mb-4">404</div>
        <h1 className="text-2xl font-black text-text-primary mb-2">Page not found</h1>
        <p className="text-sm text-text-secondary mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl shadow-xl shadow-brand/20 hover:-translate-y-0.5 transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
