'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FiSearch, FiMessageSquare } from 'react-icons/fi'
import { FaGamepad, FaStar } from 'react-icons/fa'

interface DashboardProps {
  onSearch: (query: string) => void
  onViewDetail: (gameTitle: string) => void
  onToggleChat: () => void
  searchLoading: boolean
  activeAgentId: string | null
  searchError?: string | null
}

const SAMPLE_GAMES = [
  { title: 'Elden Ring', platforms: ['PC', 'PS5', 'Xbox'], genre: ['RPG', 'Action'], rating: '9.5', initials: 'ER', gradient: 'from-amber-600 to-orange-500' },
  { title: "Baldur's Gate 3", platforms: ['PC', 'PS5'], genre: ['RPG'], rating: '9.7', initials: 'BG3', gradient: 'from-red-700 to-amber-600' },
  { title: 'Genshin Impact', platforms: ['Mobile', 'PC', 'PS5'], genre: ['RPG', 'Open World'], rating: '8.5', initials: 'GI', gradient: 'from-cyan-500 to-blue-600' },
  { title: 'Call of Duty: Warzone', platforms: ['PC', 'PS5', 'Xbox', 'Mobile'], genre: ['FPS', 'Battle Royale'], rating: '8.0', initials: 'COD', gradient: 'from-green-700 to-emerald-500' },
  { title: 'Minecraft', platforms: ['PC', 'Mobile', 'Console'], genre: ['Sandbox', 'Survival'], rating: '9.0', initials: 'MC', gradient: 'from-green-500 to-lime-400' },
  { title: 'Fortnite', platforms: ['PC', 'Mobile', 'PS5', 'Xbox'], genre: ['Battle Royale'], rating: '8.2', initials: 'FN', gradient: 'from-blue-500 to-purple-600' },
  { title: 'The Legend of Zelda: TotK', platforms: ['Console'], genre: ['Adventure', 'RPG'], rating: '9.6', initials: 'TZ', gradient: 'from-emerald-500 to-teal-400' },
  { title: 'Cyberpunk 2077', platforms: ['PC', 'PS5', 'Xbox'], genre: ['RPG', 'Action'], rating: '8.8', initials: 'CP', gradient: 'from-yellow-400 to-cyan-500' },
  { title: 'Among Us', platforms: ['Mobile', 'PC'], genre: ['Party', 'Social'], rating: '8.0', initials: 'AU', gradient: 'from-red-500 to-pink-500' },
  { title: 'Apex Legends', platforms: ['PC', 'PS5', 'Xbox', 'Mobile'], genre: ['FPS', 'Battle Royale'], rating: '8.5', initials: 'AL', gradient: 'from-red-600 to-red-400' },
  { title: 'Stardew Valley', platforms: ['PC', 'Mobile', 'Console'], genre: ['Simulation', 'RPG'], rating: '9.2', initials: 'SV', gradient: 'from-green-400 to-yellow-400' },
  { title: 'God of War Ragnarok', platforms: ['PS5', 'PC'], genre: ['Action', 'Adventure'], rating: '9.4', initials: 'GoW', gradient: 'from-blue-800 to-indigo-600' },
]

const PLATFORMS = ['All', 'Mobile', 'PC', 'Console', 'PS5', 'Xbox'] as const

function platformColor(platform: string): string {
  switch (platform) {
    case 'PC': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'PS5': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    case 'Xbox': return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'Mobile': return 'bg-pink-500/20 text-pink-300 border-pink-500/30'
    case 'Console': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    default: return 'bg-muted text-muted-foreground'
  }
}

export default function Dashboard({ onSearch, onViewDetail, onToggleChat, searchLoading, activeAgentId, searchError }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activePlatform, setActivePlatform] = useState<string>('All')
  const [sampleData, setSampleData] = useState(false)

  const filteredGames = useMemo(() => {
    if (activePlatform === 'All') return SAMPLE_GAMES
    return SAMPLE_GAMES.filter(g => g.platforms.some(p => p.toLowerCase().includes(activePlatform.toLowerCase())))
  }, [activePlatform])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim())
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <FaGamepad className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">GameVerse</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="sample-toggle" checked={sampleData} onCheckedChange={setSampleData} />
                <Label htmlFor="sample-toggle" className="text-sm text-muted-foreground cursor-pointer">Sample Data</Label>
              </div>
              <Button variant="outline" size="sm" onClick={onToggleChat} className="gap-2 border-border hover:bg-primary/10 hover:border-primary/50 transition-all duration-300">
                <FiMessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Search */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">Discover Your Next Game</h2>
          <p className="text-muted-foreground text-base mb-8 max-w-xl mx-auto">Search any game to get instant details, system requirements, downloads, ratings, and more.</p>

          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={sampleData ? 'Elden Ring' : 'Search any game...'}
                value={sampleData && !searchQuery ? 'Elden Ring' : searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (sampleData && !searchQuery) setSearchQuery('Elden Ring') }}
                className="w-full pl-12 pr-28 py-6 text-base bg-card border-border rounded-2xl shadow-[0_4px_24px_rgba(139,92,246,0.1)] focus:shadow-[0_4px_32px_rgba(139,92,246,0.2)] focus:border-primary/50 transition-all duration-300"
              />
              <Button
                type="submit"
                disabled={searchLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-5 shadow-lg shadow-primary/25 transition-all duration-300"
              >
                {searchLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching
                  </span>
                ) : 'Search'}
              </Button>
            </div>
          </form>

          {searchError && (
            <div className="mt-4 max-w-2xl mx-auto p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {searchError}
            </div>
          )}
        </div>

        {/* Loading state */}
        {searchLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Platform Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {PLATFORMS.map(platform => (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300',
                activePlatform === platform
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {platform}
            </button>
          ))}
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-foreground">
            {activePlatform === 'All' ? 'Trending Games' : `${activePlatform} Games`}
          </h3>
          <span className="text-sm text-muted-foreground">{filteredGames.length} games</span>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredGames.map((game) => (
            <Card
              key={game.title}
              className="group bg-card border-border overflow-hidden cursor-pointer shadow-[0_8px_32px_rgba(139,92,246,0.08)] hover:shadow-[0_8px_40px_rgba(139,92,246,0.2)] hover:scale-[1.02] hover:border-primary/30 transition-all duration-300"
              onClick={() => onViewDetail(game.title)}
            >
              <CardContent className="p-0">
                {/* Gradient Image Placeholder */}
                <div className={cn('h-36 bg-gradient-to-br flex items-center justify-center relative overflow-hidden', game.gradient)}>
                  <span className="text-3xl font-bold text-white/90 font-mono tracking-wider">{game.initials}</span>
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-300" />
                </div>

                <div className="p-4 space-y-3">
                  <h4 className="font-semibold text-foreground text-sm leading-tight truncate">{game.title}</h4>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-1.5">
                    {game.platforms.map(p => (
                      <span key={p} className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', platformColor(p))}>{p}</span>
                    ))}
                  </div>

                  {/* Genre + Rating */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {game.genre.slice(0, 2).map(g => (
                        <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">{g}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <FaStar className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs font-semibold text-foreground">{game.rating}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-300"
                    onClick={(e) => { e.stopPropagation(); onViewDetail(game.title); }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent Status */}
        <div className="mt-12 mb-6">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('w-2.5 h-2.5 rounded-full', activeAgentId ? 'bg-accent animate-pulse' : 'bg-muted-foreground/40')} />
                <div>
                  <p className="text-sm font-medium text-foreground">Game Info Agent</p>
                  <p className="text-xs text-muted-foreground">Perplexity sonar-pro - Web search powered</p>
                </div>
              </div>
              <Badge variant={activeAgentId ? 'default' : 'secondary'} className="text-[10px]">
                {activeAgentId ? 'Processing' : 'Ready'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
