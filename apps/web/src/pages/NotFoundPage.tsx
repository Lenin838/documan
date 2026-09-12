import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
        <h1 className="text-6xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-2">
          404
        </h1>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page Not Found
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          The page or document reference you are looking for does not exist or
          has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex justify-center items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm transition-colors text-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
