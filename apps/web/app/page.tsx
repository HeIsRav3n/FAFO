import { prisma } from "@vibe/database";
import { 
  ArrowUpRight, 
  Users, 
  Flame, 
  Clock, 
  ShieldCheck 
} from "lucide-react";

async function getStats() {
  // These will work once migrations are run and data is added
  try {
    const totalCalls = await prisma.call.count();
    const totalProjects = await prisma.project.count();
    const topProject = await prisma.project.findFirst({
      orderBy: { followersCount: 'desc' }
    });
    return { totalCalls, totalProjects, topProject };
  } catch (e) {
    return { totalCalls: 0, totalProjects: 0, topProject: null };
  }
}

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-sm font-medium text-blue-400 mb-1 uppercase tracking-widest">Analytics Overview</h2>
          <h1 className="text-4xl font-bold tracking-tight">Vibe Feed</h1>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 text-sm">Last update: Just now</p>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Calls" 
          value={stats.totalCalls.toString()} 
          change="+12.5%" 
          icon={Flame} 
          color="text-orange-500" 
        />
        <StatCard 
          title="Active Projects" 
          value={stats.totalProjects.toString()} 
          change="+8.2%" 
          icon={ShieldCheck} 
          color="text-blue-500" 
        />
        <StatCard 
          title="Global Reach" 
          value="4.2M" 
          change="+24.1%" 
          icon={Users} 
          color="text-green-500" 
        />
        <StatCard 
          title="Bot Uptime" 
          value="99.9%" 
          change="Stable" 
          icon={Clock} 
          color="text-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Calls Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold px-1">Recent Intelligence</h3>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors px-2 py-1">View all</button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <CallCard key={i} />
            ))}
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="glass p-6 h-fit sticky top-10">
          <h3 className="text-xl font-bold mb-6">Top Alpha Callers</h3>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-8 text-zinc-500 font-mono text-sm">0{i}</div>
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium group-hover:text-blue-400 transition-colors">User_{i}00</div>
                  <div className="text-xs text-zinc-500">1,240 pts • 42 calls</div>
                </div>
                <div className="text-xs font-medium text-green-500">+12%</div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors border border-white/5">
            View Full Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }: any) {
  return (
    <div className="glass p-6 card-hover">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg bg-black/40 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">{change}</span>
      </div>
      <h3 className="text-zinc-500 text-sm font-medium mb-1">{title}</h3>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function CallCard() {
  return (
    <div className="glass p-6 flex flex-col md:flex-row gap-6 card-hover group cursor-pointer">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex-shrink-0 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-accent/20" />
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-lg group-hover:text-blue-400 transition-colors">Project Name</h4>
          <span className="text-zinc-500 text-sm">@handled</span>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full ml-auto">2m ago</span>
        </div>
        
        <p className="text-zinc-400 text-sm line-clamp-2">
          This is a sample tweet content that was detected by the Vibe Calls bot. It looks very promising!
        </p>

        <div className="flex items-center gap-6 pt-2">
          <div className="text-sm font-medium flex items-center gap-1.5 text-blue-400">
            <Users className="w-4 h-4" />
            12.4K
          </div>
          <div className="text-sm font-medium flex items-center gap-1.5 text-zinc-500">
            <Flame className="w-4 h-4" />
            +45% ROI
          </div>
          <div className="text-sm font-medium flex items-center gap-1.5 text-green-500">
            <ShieldCheck className="w-4 h-4" />
            Low Risk
          </div>
        </div>
      </div>

      <div className="self-center">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
          <ArrowUpRight className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
