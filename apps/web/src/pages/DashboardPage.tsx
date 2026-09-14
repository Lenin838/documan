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
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-8 border border-indigo-800/40 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.name || "User"}!
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-xl leading-relaxed">
              Document management, contract governance, system topology, and developer workspace.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="historical" size="md" showIndicator={false} className="font-mono">
              Role: {user?.role || "user"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">
          Quick Workspaces
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900 border-slate-800/80 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-indigo-950/20 group">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center font-bold text-base mb-3 shadow-inner">
                  P
                </div>
                <h3 className="font-bold text-slate-100 text-base">
                  Projects & Topology
                </h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Manage projects, API specifications, and cross-project topology links.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <Link to="/projects" className="block">
                  <Button variant="secondary" size="sm" className="w-full justify-between">
                    <span>View Projects</span>
                    <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-slate-900 border-slate-800/80 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-indigo-950/20 group">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-950/80 text-sky-400 border border-sky-800/60 flex items-center justify-center font-bold text-base mb-3 shadow-inner">
                  D
                </div>
                <h3 className="font-bold text-slate-100 text-base">
                  Documents Repository
                </h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Author ADRs, technical specs, dependencies, and audit trails.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <Link to="/documents" className="block">
                  <Button variant="secondary" size="sm" className="w-full justify-between">
                    <span>View Documents</span>
                    <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-slate-900 border-slate-800/80 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-indigo-950/20 group">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-bold text-base mb-3 shadow-inner">
                  K
                </div>
                <h3 className="font-bold text-slate-100 text-base">
                  Knowledge Discovery
                </h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Multi-dimensional search across metadata, tags, and content.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <Link to="/knowledge/search" className="block">
                  <Button variant="secondary" size="sm" className="w-full justify-between">
                    <span>Search Knowledge</span>
                    <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
                  </Button>
                </Link>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-slate-900 border-slate-800/80 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-indigo-950/20 group">
            <CardBody className="flex flex-col justify-between h-full">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 text-amber-400 border border-amber-800/60 flex items-center justify-center font-bold text-base mb-3 shadow-inner">
                  R
                </div>
                <h3 className="font-bold text-slate-100 text-base">
                  Document Reviews
                </h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  Inspect pending reviewer queues, approval history, and changes requested.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/80">
                <Link to="/reviews" className="block">
                  <Button variant="secondary" size="sm" className="w-full justify-between">
                    <span>View Reviews</span>
                    <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">&rarr;</span>
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