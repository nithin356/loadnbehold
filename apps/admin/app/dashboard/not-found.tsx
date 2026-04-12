import { FileQuestion } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-warning-light rounded-full p-4 mb-4">
        <FileQuestion className="w-8 h-8 text-warning" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Page not found</h2>
      <p className="text-sm text-text-secondary mb-6 text-center max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/dashboard"
        className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
      >
        Go to Dashboard
      </a>
    </div>
  );
}
