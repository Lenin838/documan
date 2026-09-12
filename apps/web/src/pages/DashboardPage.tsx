import { Link } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth.store";
import { Card, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-2xl p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || "User"}!
            </h1>
            <p className="mt-2 text-indigo-100 max-w-xl">
              Document management, contract governance, system topology, and productivity workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="neutral" className="bg-white/20 text-white border-white/30 px-3 py-1 text-sm">
              Role: {user?.role || "user"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Quick Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg mb-3">
                  P
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Projects & Topology
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage projects, API specifications, and cross-project topology links.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link to="/projects">
                  <Button variant="outline" size="sm" className="w-full">
                    View Projects &rarr;
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg mb-3">
                  D
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Documents Repository
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Author ADRs, technical specs, dependencies, and audit trails.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link to="/documents">
                  <Button variant="outline" size="sm" className="w-full">
                    View Documents &rarr;
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
                  K
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Knowledge Discovery
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Multi-dimensional search across metadata, tags, and content.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link to="/knowledge/search">
                  <Button variant="outline" size="sm" className="w-full">
                    Search Knowledge &rarr;
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg mb-3">
                  R
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Document Reviews
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Inspect pending reviewer queues, approval history, and changes requested.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Link to="/reviews">
                  <Button variant="outline" size="sm" className="w-full">
                    View Reviews &rarr;
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}