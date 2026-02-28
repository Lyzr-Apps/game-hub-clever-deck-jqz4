'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { FiArrowLeft, FiExternalLink, FiCpu, FiHardDrive, FiMonitor } from 'react-icons/fi'
import { FaStar, FaSteam, FaPlaystation, FaXbox, FaApple, FaGooglePlay, FaWindows, FaDownload, FaCalendarAlt, FaCodeBranch } from 'react-icons/fa'

interface GameData {
  game_title?: string
  developer?: string
  publisher?: string
  description?: string
  platforms?: string[]
  genre?: string[]
  current_version?: string
  release_date?: string
  upcoming_version?: string | null
  upcoming_release_date?: string | null
  download_links?: Array<{ platform?: string; store_name?: string; url?: string }>
  system_requirements?: {
    minimum?: { os?: string; processor?: string; memory?: string; graphics?: string; storage?: string }
    recommended?: { os?: string; processor?: string; memory?: string; graphics?: string; storage?: string }
  }
  ratings?: Array<{ source?: string; score?: string }>
  related_games?: string[]
  summary?: string
}

interface GameDetailProps {
  data: GameData | null
  onBack: () => void
  onSearchGame: (title: string) => void
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function platformColor(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes('pc') || p.includes('windows')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  if (p.includes('ps') || p.includes('playstation')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  if (p.includes('xbox')) return 'bg-green-500/20 text-green-300 border-green-500/30'
  if (p.includes('mobile') || p.includes('ios') || p.includes('android')) return 'bg-pink-500/20 text-pink-300 border-pink-500/30'
  if (p.includes('switch') || p.includes('nintendo')) return 'bg-red-500/20 text-red-300 border-red-500/30'
  return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
}

function storeIcon(storeName: string) {
  const s = (storeName ?? '').toLowerCase()
  if (s.includes('steam')) return <FaSteam className="w-4 h-4" />
  if (s.includes('playstation') || s.includes('ps')) return <FaPlaystation className="w-4 h-4" />
  if (s.includes('xbox') || s.includes('microsoft')) return <FaXbox className="w-4 h-4" />
  if (s.includes('apple') || s.includes('app store') || s.includes('ios')) return <FaApple className="w-4 h-4" />
  if (s.includes('google') || s.includes('play store') || s.includes('android')) return <FaGooglePlay className="w-4 h-4" />
  if (s.includes('windows') || s.includes('pc')) return <FaWindows className="w-4 h-4" />
  return <FaDownload className="w-4 h-4" />
}

function storeButtonColor(storeName: string): string {
  const s = (storeName ?? '').toLowerCase()
  if (s.includes('steam')) return 'bg-[#1b2838] hover:bg-[#2a475e] border-[#2a475e]'
  if (s.includes('playstation') || s.includes('ps')) return 'bg-[#003087] hover:bg-[#0050b5] border-[#0050b5]'
  if (s.includes('xbox') || s.includes('microsoft')) return 'bg-[#107c10] hover:bg-[#0e6b0e] border-[#0e6b0e]'
  if (s.includes('apple') || s.includes('app store') || s.includes('ios')) return 'bg-[#333] hover:bg-[#555] border-[#555]'
  if (s.includes('google') || s.includes('play store') || s.includes('android')) return 'bg-[#01875f] hover:bg-[#02a672] border-[#02a672]'
  return 'bg-primary hover:bg-primary/90 border-primary'
}

export default function GameDetail({ data, onBack, onSearchGame }: GameDetailProps) {
  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No game data available.</p>
      </div>
    )
  }

  const platforms = Array.isArray(data?.platforms) ? data.platforms : []
  const genres = Array.isArray(data?.genre) ? data.genre : []
  const downloadLinks = Array.isArray(data?.download_links) ? data.download_links : []
  const ratings = Array.isArray(data?.ratings) ? data.ratings : []
  const relatedGames = Array.isArray(data?.related_games) ? data.related_games : []
  const minReqs = data?.system_requirements?.minimum
  const recReqs = data?.system_requirements?.recommended
  const hasSystemReqs = minReqs?.os || minReqs?.processor || recReqs?.os || recReqs?.processor

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-primary/20 via-card to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" onClick={onBack} className="mb-6 gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <FiArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Title Area */}
            <div className="flex-1 space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">{data?.game_title ?? 'Unknown Game'}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {data?.developer && <span>by <span className="text-foreground font-medium">{data.developer}</span></span>}
                {data?.publisher && data.publisher !== data.developer && <span>Published by <span className="text-foreground font-medium">{data.publisher}</span></span>}
              </div>

              {/* Platform + Genre badges */}
              <div className="flex flex-wrap gap-2">
                {platforms.map((p, i) => (
                  <span key={i} className={cn('text-xs px-2.5 py-1 rounded-full border font-medium', platformColor(p))}>{p}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {genres.map((g, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{g}</Badge>
                ))}
              </div>

              {/* Ratings inline */}
              {ratings.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {ratings.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-card/60 border border-border rounded-lg px-3 py-1.5">
                      <FaStar className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-sm font-semibold text-foreground">{r?.score ?? '-'}</span>
                      <span className="text-xs text-muted-foreground">/ {r?.source ?? 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Version Info Panel */}
            <div className="lg:w-72 space-y-3">
              <Card className="bg-card border-border shadow-[0_8px_32px_rgba(139,92,246,0.1)]">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FaCodeBranch className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Current Version</span>
                  </div>
                  <p className="text-lg font-mono font-semibold text-foreground">{data?.current_version ?? 'N/A'}</p>
                  {data?.release_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FaCalendarAlt className="w-3 h-3" />
                      <span>Released {data.release_date}</span>
                    </div>
                  )}

                  {data?.upcoming_version && (
                    <>
                      <div className="h-px bg-border" />
                      <div className="flex items-center gap-2 text-sm">
                        <FaCodeBranch className="w-4 h-4 text-accent" />
                        <span className="text-muted-foreground">Upcoming</span>
                      </div>
                      <p className="text-lg font-mono font-semibold text-accent">{data.upcoming_version}</p>
                      {data?.upcoming_release_date && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FaCalendarAlt className="w-3 h-3" />
                          <span>Expected {data.upcoming_release_date}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Download Links */}
        {downloadLinks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Download / Purchase</h3>
            <div className="flex flex-wrap gap-3">
              {downloadLinks.map((link, i) => (
                <a key={i} href={link?.url ?? '#'} target="_blank" rel="noopener noreferrer" className={cn('inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white border transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]', storeButtonColor(link?.store_name ?? ''))}>
                  {storeIcon(link?.store_name ?? '')}
                  <span>{link?.store_name ?? link?.platform ?? 'Download'}</span>
                  <FiExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="description" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Description</TabsTrigger>
            {hasSystemReqs && <TabsTrigger value="sysreqs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">System Requirements</TabsTrigger>}
            {ratings.length > 0 && <TabsTrigger value="ratings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ratings</TabsTrigger>}
          </TabsList>

          <TabsContent value="description" className="mt-4">
            <Card className="bg-card border-border shadow-[0_8px_32px_rgba(139,92,246,0.08)]">
              <CardContent className="p-6">
                {data?.description ? renderMarkdown(data.description) : <p className="text-muted-foreground text-sm">No description available.</p>}
                {data?.summary && data.summary !== data.description && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Summary</h4>
                    {renderMarkdown(data.summary)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {hasSystemReqs && (
            <TabsContent value="sysreqs" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {minReqs && (minReqs.os || minReqs.processor) && (
                  <Card className="bg-card border-border shadow-[0_8px_32px_rgba(139,92,246,0.08)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">Minimum</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {minReqs.os && <div className="flex items-start gap-3"><FiMonitor className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">OS</p><p className="text-sm text-foreground">{minReqs.os}</p></div></div>}
                      {minReqs.processor && <div className="flex items-start gap-3"><FiCpu className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Processor</p><p className="text-sm text-foreground">{minReqs.processor}</p></div></div>}
                      {minReqs.memory && <div className="flex items-start gap-3"><FiHardDrive className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Memory</p><p className="text-sm text-foreground">{minReqs.memory}</p></div></div>}
                      {minReqs.graphics && <div className="flex items-start gap-3"><FiMonitor className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Graphics</p><p className="text-sm text-foreground">{minReqs.graphics}</p></div></div>}
                      {minReqs.storage && <div className="flex items-start gap-3"><FiHardDrive className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Storage</p><p className="text-sm text-foreground">{minReqs.storage}</p></div></div>}
                    </CardContent>
                  </Card>
                )}
                {recReqs && (recReqs.os || recReqs.processor) && (
                  <Card className="bg-card border-border shadow-[0_8px_32px_rgba(139,92,246,0.08)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-foreground">Recommended</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {recReqs.os && <div className="flex items-start gap-3"><FiMonitor className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">OS</p><p className="text-sm text-foreground">{recReqs.os}</p></div></div>}
                      {recReqs.processor && <div className="flex items-start gap-3"><FiCpu className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Processor</p><p className="text-sm text-foreground">{recReqs.processor}</p></div></div>}
                      {recReqs.memory && <div className="flex items-start gap-3"><FiHardDrive className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Memory</p><p className="text-sm text-foreground">{recReqs.memory}</p></div></div>}
                      {recReqs.graphics && <div className="flex items-start gap-3"><FiMonitor className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Graphics</p><p className="text-sm text-foreground">{recReqs.graphics}</p></div></div>}
                      {recReqs.storage && <div className="flex items-start gap-3"><FiHardDrive className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><div><p className="text-xs text-muted-foreground">Storage</p><p className="text-sm text-foreground">{recReqs.storage}</p></div></div>}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          {ratings.length > 0 && (
            <TabsContent value="ratings" className="mt-4">
              <Card className="bg-card border-border shadow-[0_8px_32px_rgba(139,92,246,0.08)]">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {ratings.map((r, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl border border-border">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                          <FaStar className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">{r?.score ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">{r?.source ?? 'Unknown'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Related Games */}
        {relatedGames.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Related Games</h3>
            <div className="flex flex-wrap gap-2">
              {relatedGames.map((game, i) => (
                <button
                  key={i}
                  onClick={() => onSearchGame(typeof game === 'string' ? game : '')}
                  className="px-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {typeof game === 'string' ? game : 'Unknown'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
