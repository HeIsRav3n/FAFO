"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  UserCircle, 
  Settings, 
  Zap,
  Globe
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Global Feed", href: "/", icon: Globe },
  { name: "Top Callers", href: "/callers", icon: Users },
  { name: "Project Analytics", href: "/projects", icon: BarChart3 },
  { name: "Trending", href: "/trending", icon: TrendingUp },
  { name: "My Profile", href: "/profile", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-[#0A0A0A] border-r border-white/10 flex flex-col h-full">
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Zap className="text-white w-5 h-5 fill-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">VIBE CALLS</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-blue-500/10 text-blue-400" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-blue-400" : "group-hover:text-white"
              )} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </div>
  );
}
