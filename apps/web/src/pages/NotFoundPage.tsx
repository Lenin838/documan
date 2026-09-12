import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-8 text-center">
        <h1 className="text-6xl font-extrabold text-indigo-500 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          The page, project, or document reference you are looking for does not exist or has been moved.
        </p>
        <Link to="/dashboard">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
