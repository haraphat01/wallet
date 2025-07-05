"use client"

import {
  ExternalLink,
  Users,
  X,
  Coins,
  Grid3X3,
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
  
  const topUsers = [
    { rank: 1, address: "0x1234...5678", points: "125,432" },
    { rank: 2, address: "0x9876...5432", points: "98,765" },
    { rank: 3, address: "0xabcd...efgh", points: "87,543" },
    { rank: 4, address: "0x5678...1234", points: "76,321" },
    { rank: 5, address: "0xijkl...mnop", points: "65,432" },
  ]

  return (
    <div className="p-8">
      <Dialog open={showConnectWallet} onOpenChange={setShowConnectWallet}>
        <DialogContent className="sm:max-w-[425px]">
          <ConnectWallet />
        </DialogContent>
      </Dialog>
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Sonic Points</h1>
        <p className="text-gray-400">Track your points and see how you rank against other users</p>
      </div>

      {/* Top Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Connect Wallet Card */}
        <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Coins className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">View your points</h3>
            </div>
            <Button 
              onClick={() => setShowConnectWallet(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>

        {/* Invite Friends Card */}
        <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-orange-400" />
              <h3 className="text-xl font-semibold">Invite Your Friends</h3>
            </div>
            <p className="text-gray-400 mb-6">
              You earn <span className="text-orange-400 font-semibold">10%</span> of the points your friends make
            </p>
            <Button
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Login with X
            </Button>
            <p className="text-xs text-gray-500 mt-2">This is to verify your identity and enable referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* How to Earn Points */}
      <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-orange-500/30 backdrop-blur-sm mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">How to Earn Points</CardTitle>
          <Button variant="ghost" className="text-orange-400 hover:text-orange-300 flex items-center gap-1">
            Learn More <ExternalLink className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Passive Points */}
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

            {/* Activity Points */}
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

            {/* App Points */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <h4 className="text-lg font-semibold">App Points</h4>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">GEMS</Badge>
              </div>
              <p className="text-gray-400 text-sm mb-4">Earn further airdrop allocation from participating apps</p>
              <Button
                variant="outline"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Learn more
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboards */}
      <div className="grid md:grid-cols-2 gap-6">
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
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((rank) => (
                <div
                  key={rank}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-sm font-semibold">
                      {rank}
                    </span>
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-full"></div>
                    <span className="font-medium">Protocol {rank}</span>
                  </div>
                  <span className="text-gray-400 text-sm">Coming soon</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Connect Wallet */}
      <div className="fixed bottom-6 left-6">
        <Button 
          onClick={() => setShowConnectWallet(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-full shadow-lg"
        >
          Connect Wallet
        </Button>
      </div>
    </div>
  )
}
