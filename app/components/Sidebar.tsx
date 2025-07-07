import {
  Home,
  TrendingUp,
  Award,
  BarChart3,
  Coins,
  Trophy,
  HelpCircle,
  Grid3X3,
  Zap,
  GitBranch,
  Settings,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const sidebarItems = [
  { icon: Home, label: "Home", active: false },
  { icon: TrendingUp, label: "Upgrade", active: false },
  { icon: Award, label: "Points", active: true, badge: "HOT" },
  { icon: BarChart3, label: "Dashboard", active: false },
  { icon: Coins, label: "Earn", active: false },
  { icon: Trophy, label: "Leaderboard", active: false },
  { icon: HelpCircle, label: "FAQ", active: false },
  { icon: Grid3X3, label: "Apps", active: false },
  { icon: Zap, label: "Stake", active: false },
  { icon: GitBranch, label: "Bridge", active: false },
  { icon: Settings, label: "Governance", active: false },
]

export function Sidebar() {
  return (
    <div className="w-64 bg-gradient-to-b from-gray-900/80 to-gray-800/80 backdrop-blur-sm border-r border-gray-800/60 h-full flex flex-col justify-between">
      <div className="p-6 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-bold tracking-tight">
            My<span className="text-orange-500">SONIC</span>
          </span>
        </div>
        <nav className="space-y-2 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sidebarItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors font-medium text-base ${
                item.active
                  ? "bg-orange-500/10 text-orange-400 border-l-4 border-orange-500 shadow-orange-500/30 shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs px-2 py-0.5 shadow-lg animate-pulse">
                  {item.badge}
                </Badge>
              )}
            </div>
          ))}
        </nav>
      </div>
      {/* Connect Wallet Button at the bottom */}
      <div className="p-6">
        <button className="w-full py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-orange-500 to-blue-600 border-2 border-transparent hover:from-orange-600 hover:to-blue-700 transition-all shadow-lg">
          Connect Wallet
        </button>
      </div>
    </div>
  )
} 