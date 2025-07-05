import {
  ArrowLeft,
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
    <div className="w-64 bg-gray-900/50 backdrop-blur-sm border-r border-gray-700/50 h-full flex flex-col">
      <div className="p-6 flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 mb-8">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
          <span className="text-xl font-bold">
            My<span className="text-orange-500">SONIC</span>
          </span>
        </div>

        <nav className="space-y-2 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sidebarItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                item.active
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge && <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5">{item.badge}</Badge>}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
} 