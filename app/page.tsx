"use client"

import {
  ExternalLink,
  Users,
  X,
  Coins,
  Grid3X3,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useState } from "react"
import ConnectWallet from "./components/ConnectWallet"

export default function Component() {
  const [showConnectWallet, setShowConnectWallet] = useState(false)
  const [tab, setTab] = useState('points')
  
  // Dummy data for points, referrals, and user info
  const userPoints = 123456
  const referralCount = 12
  const referralEarnings = 7890
  const userRank = 42
  const topUsers = [
    { rank: 1, address: "0x1234...5678", points: "125,432" },
    { rank: 2, address: "0x9876...5432", points: "98,765" },
    { rank: 3, address: "0xabcd...efgh", points: "87,543" },
    { rank: 4, address: "0x5678...1234", points: "76,321" },
    { rank: 5, address: "0xijkl...mnop", points: "65,432" },
  ]
  const topProtocols = [
    { rank: 1, name: "Uniswap", points: "54,321" },
    { rank: 2, name: "Aave", points: "43,210" },
    { rank: 3, name: "SonicSwap", points: "32,109" },
    { rank: 4, name: "Curve", points: "21,098" },
    { rank: 5, name: "Balancer", points: "10,987" },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Dialog open={showConnectWallet} onOpenChange={setShowConnectWallet}>
        <DialogContent className="sm:max-w-[425px]">
          <ConnectWallet />
        </DialogContent>
      </Dialog>

      {/* Title and Subtitle */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">Sonic Points</h1>
        <p className="text-gray-400">Track your points and see how you rank against other users</p>
      </div>

      {/* Centered Connect Wallet Card */}
      <div className="flex justify-center mb-6">
        <Card className="w-full max-w-lg bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-700/60 shadow-lg">
          <CardContent className="p-10 text-center flex flex-col items-center">
            <div className="text-lg mb-6 text-gray-200">Connect your wallet to view your points</div>
            <Button
              onClick={() => setShowConnectWallet(true)}
              className="w-56 py-2 rounded-full font-semibold text-white bg-gradient-to-r from-orange-500 to-blue-600 border-2 border-transparent hover:from-orange-600 hover:to-blue-700 transition-all shadow-lg text-base"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Blue Info Bar */}
      <div className="w-full mb-8">
        <div className="rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 text-blue-100 px-6 py-3 text-center text-sm font-medium shadow">
          <span className="mr-2">🔵</span>
          Points reset to 0 for season 2. Claims for season 1 open after a bot/sybil review.
        </div>
      </div>

      {/* How to Earn Points Section with Tabs */}
      <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-orange-500/30 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-0">
          <CardTitle className="text-xl">How to Earn Points</CardTitle>
          <Button variant="ghost" className="text-orange-400 hover:text-orange-300 flex items-center gap-1 text-sm">
            Learn More <ExternalLink className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex gap-2 mb-6">
            <button
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all border-b-2 ${tab === 'points' ? 'border-orange-500 text-orange-400 bg-gray-900/60' : 'border-transparent text-gray-400 hover:text-orange-400'}`}
              onClick={() => setTab('points')}
            >
              Points
            </button>
            <button
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all border-b-2 ${tab === 'gems' ? 'border-orange-500 text-orange-400 bg-gray-900/60' : 'border-transparent text-gray-400 hover:text-orange-400'}`}
              onClick={() => setTab('gems')}
            >
              Gems
            </button>
          </div>
          {tab === 'points' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <h4 className="text-lg font-semibold">Passive Points</h4>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">PP</Badge>
                </div>
                <p className="text-gray-400 text-sm mb-4">Earn points by simply holding whitelisted assets</p>
                <Button
                  variant="outline"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 flex items-center gap-1"
                >
                  <Coins className="w-4 h-4" />
                  Explore assets
                </Button>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <h4 className="text-lg font-semibold">Activity Points</h4>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">AP</Badge>
                </div>
                <p className="text-gray-400 text-sm mb-4">Earn points by deploying your whitelisted assets</p>
                <Button
                  variant="outline"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 flex items-center gap-1"
                >
                  <Grid3X3 className="w-4 h-4" />
                  Explore apps
                </Button>
              </div>
            </div>
          )}
          {tab === 'gems' && (
            <div className="text-center py-8 text-gray-400 text-base">
              Earn further airdrop allocation from participating apps. <br />
              <Button
                variant="outline"
                className="mt-4 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Learn more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Points Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20 shadow-lg">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <Coins className="w-10 h-10 text-orange-400 mb-4" />
            <div className="text-3xl font-bold mb-1">{userPoints.toLocaleString()}</div>
            <div className="text-gray-400 text-sm mb-2">Your Points</div>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Rank #{userRank}</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20 shadow-lg">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <Users className="w-10 h-10 text-blue-400 mb-4" />
            <div className="text-3xl font-bold mb-1">{referralCount}</div>
            <div className="text-gray-400 text-sm mb-2">Referrals</div>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">+10% bonus</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20 shadow-lg">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <Trophy className="w-10 h-10 text-green-400 mb-4" />
            <div className="text-3xl font-bold mb-1">{referralEarnings.toLocaleString()}</div>
            <div className="text-gray-400 text-sm mb-2">Referral Earnings</div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Points</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Top 5 Users */}
        <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top 5 Users</CardTitle>
            <Button variant="ghost" className="text-orange-400 hover:text-orange-300 text-sm">
              Show all
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700/50">
                  <TableHead className="text-gray-400">#</TableHead>
                  <TableHead className="text-gray-400">User Address</TableHead>
                  <TableHead className="text-gray-400 text-right">Total Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((user) => (
                  <TableRow key={user.rank} className="border-gray-700/30 hover:bg-gray-800/30">
                    <TableCell className="font-medium">{user.rank}</TableCell>
                    <TableCell className="font-mono text-sm">{user.address}</TableCell>
                    <TableCell className="text-right font-semibold">{user.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top 5 Protocols */}
        <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top 5 Protocols</CardTitle>
            <Button variant="ghost" className="text-orange-400 hover:text-orange-300 text-sm">
              Show all
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700/50">
                  <TableHead className="text-gray-400">#</TableHead>
                  <TableHead className="text-gray-400">Protocol</TableHead>
                  <TableHead className="text-gray-400 text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProtocols.map((protocol) => (
                  <TableRow key={protocol.rank} className="border-gray-700/30 hover:bg-gray-800/30">
                    <TableCell className="font-medium">{protocol.rank}</TableCell>
                    <TableCell className="font-mono text-sm">{protocol.name}</TableCell>
                    <TableCell className="text-right font-semibold">{protocol.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
