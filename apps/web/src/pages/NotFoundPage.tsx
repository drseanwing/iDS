interface NotFoundPageProps {
  onNavigateHome?: () => void;
}

export function NotFoundPage({ onNavigateHome }: NotFoundPageProps) {
  function handleGoHome() {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      window.history.back();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-8xl font-bold text-gray-900">404</p>
      <h1 className="text-2xl font-semibold text-gray-800">Page not found</h1>
      <p className="max-w-sm text-sm text-gray-500">
        The page you are looking for does not exist or may have been moved.
      </p>
      <button
        onClick={handleGoHome}
        className="mt-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go back home
      </button>
    </div>
  );
}
