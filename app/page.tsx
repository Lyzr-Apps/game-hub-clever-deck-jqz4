'use client'

import React, { useState, useCallback } from 'react'
import { callAIAgent, AIAgentResponse, extractText } from '@/lib/aiAgent'
import Dashboard from './sections/Dashboard'
import GameDetail from './sections/GameDetail'
import ChatAssistant from './sections/ChatAssistant'

const AGENT_ID = '69a28da3e72641e0c6070b59'

// ---------- ErrorBoundary ----------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------- Types ----------
export interface GameData {
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
  _rawText?: string
  _isLoading?: boolean
}

// ---------- Deep extract: dig through any nesting to find game data ----------
function deepExtractGameData(obj: any, depth: number = 0): any {
  if (depth > 8 || !obj) return null
  if (typeof obj === 'string') {
    try {
      const parsed = JSON.parse(obj)
      return deepExtractGameData(parsed, depth + 1)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object') return null

  if (obj.game_title || obj.gameTitle || obj.title || obj.name) {
    return obj
  }

  if (Array.isArray(obj.results) && obj.results.length > 0) {
    return obj
  }

  const wrapperKeys = ['result', 'response', 'data', 'output', 'content', 'message', 'text', 'answer']
  for (const key of wrapperKeys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      const inner = deepExtractGameData(obj[key], depth + 1)
      if (inner) return inner
    }
  }

  for (const key of Object.keys(obj)) {
    if (wrapperKeys.includes(key)) continue
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const inner = deepExtractGameData(obj[key], depth + 1)
      if (inner) return inner
    }
  }

  return null
}

// ---------- Normalize field names ----------
function normalizeGameFields(data: any): GameData {
  if (!data || typeof data !== 'object') return {}

  return {
    game_title: data.game_title || data.gameTitle || data.title || data.name || undefined,
    developer: data.developer || data.developedBy || undefined,
    publisher: data.publisher || data.publishedBy || undefined,
    description: data.description || data.overview || data.about || undefined,
    platforms: Array.isArray(data.platforms) ? data.platforms :
               (typeof data.platforms === 'string' ? [data.platforms] : undefined),
    genre: Array.isArray(data.genre) ? data.genre :
           Array.isArray(data.genres) ? data.genres :
           (typeof data.genre === 'string' ? [data.genre] : undefined),
    current_version: data.current_version || data.currentVersion || data.version || undefined,
    release_date: data.release_date || data.releaseDate || data.released || undefined,
    upcoming_version: data.upcoming_version || data.upcomingVersion || null,
    upcoming_release_date: data.upcoming_release_date || data.upcomingReleaseDate || null,
    download_links: Array.isArray(data.download_links) ? data.download_links :
                    Array.isArray(data.downloadLinks) ? data.downloadLinks :
                    Array.isArray(data.links) ? data.links : undefined,
    system_requirements: data.system_requirements || data.systemRequirements || data.requirements || undefined,
    ratings: Array.isArray(data.ratings) ? data.ratings :
             Array.isArray(data.scores) ? data.scores : undefined,
    related_games: Array.isArray(data.related_games) ? data.related_games :
                   Array.isArray(data.relatedGames) ? data.relatedGames :
                   Array.isArray(data.similar_games) ? data.similar_games : undefined,
    summary: data.summary || data.brief || undefined,
  }
}

// ---------- Parse agent response robustly ----------
function parseAgentResponse(result: AIAgentResponse, queryText: string): GameData | null {
  if (!result) return null

  const sources: any[] = []

  if (result.response?.result) sources.push(result.response.result)
  if (result.response) sources.push(result.response)
  if (result.raw_response) sources.push(result.raw_response)
  sources.push(result)

  for (const source of sources) {
    const extracted = deepExtractGameData(source)
    if (extracted) {
      const normalized = normalizeGameFields(extracted)
      if (normalized.game_title) {
        return normalized
      }
    }
  }

  // Fallback: extract text content
  const textSources = [
    result.response?.message,
    result.response?.result?.text,
    result.response?.result?.message,
    result.response?.result?.answer,
    result.response?.result?.content,
    result.response?.result?.response,
    typeof result.response?.result === 'string' ? result.response.result : null,
    result.raw_response,
    extractText(result.response ?? { status: 'error', result: {} }),
  ]

  for (const text of textSources) {
    if (typeof text === 'string' && text.trim().length > 20) {
      try {
        const parsed = JSON.parse(text)
        const extracted = deepExtractGameData(parsed)
        if (extracted) {
          const normalized = normalizeGameFields(extracted)
          if (normalized.game_title) return normalized
        }
      } catch {
        // Not JSON
      }

      return {
        game_title: queryText,
        description: text,
        summary: text.substring(0, 300),
        _rawText: text,
      }
    }
  }

  return null
}

// ---------- Sample game data for instant display ----------
const SAMPLE_GAME_DATA: Record<string, GameData> = {
  'Elden Ring': { game_title: 'Elden Ring', developer: 'FromSoftware', publisher: 'Bandai Namco', platforms: ['PC', 'PS5', 'Xbox Series X/S', 'PS4', 'Xbox One'], genre: ['Action RPG', 'Open World'], description: 'Elden Ring is an action role-playing game set in a vast open world called the Lands Between. Created by Hidetaka Miyazaki and George R.R. Martin, it features challenging combat, deep lore, and expansive exploration. Players take on the role of the Tarnished, seeking to restore the Elden Ring and become the Elden Lord.', current_version: '1.14', release_date: 'February 25, 2022', ratings: [{ source: 'Metacritic', score: '96/100' }, { source: 'IGN', score: '10/10' }], summary: 'A critically acclaimed open-world action RPG by FromSoftware and George R.R. Martin.' },
  "Baldur's Gate 3": { game_title: "Baldur's Gate 3", developer: 'Larian Studios', publisher: 'Larian Studios', platforms: ['PC', 'PS5', 'Xbox Series X/S'], genre: ['RPG', 'Turn-Based'], description: "Baldur's Gate 3 is a cinematic RPG set in the Dungeons & Dragons universe. Gather your party and embark on an epic adventure filled with choice, combat, and rich storytelling across the Forgotten Realms and beyond.", current_version: 'Patch 7', release_date: 'August 3, 2023', ratings: [{ source: 'Metacritic', score: '96/100' }, { source: 'IGN', score: '10/10' }], summary: 'A landmark RPG with deep story choices and D&D 5th Edition mechanics.' },
  'Genshin Impact': { game_title: 'Genshin Impact', developer: 'miHoYo (HoYoverse)', publisher: 'miHoYo', platforms: ['PC', 'PS5', 'PS4', 'iOS', 'Android'], genre: ['Action RPG', 'Open World', 'Gacha'], description: 'Genshin Impact is a free-to-play open-world action RPG featuring elemental combat, a vast world to explore, and an engaging storyline set in the fantasy world of Teyvat.', current_version: '4.4', release_date: 'September 28, 2020', download_links: [{ platform: 'PC', store_name: 'Official Website', url: 'https://genshin.hoyoverse.com' }, { platform: 'Mobile', store_name: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.miHoYo.GenshinImpact' }], ratings: [{ source: 'Metacritic', score: '84/100' }], summary: 'A beautiful free-to-play open-world RPG with elemental combat.' },
  'Call of Duty: Warzone': { game_title: 'Call of Duty: Warzone', developer: 'Infinity Ward / Raven Software', publisher: 'Activision', platforms: ['PC', 'PS5', 'Xbox Series X/S', 'PS4', 'Xbox One'], genre: ['FPS', 'Battle Royale'], description: 'Call of Duty: Warzone is a free-to-play battle royale game featuring massive maps, squad-based gameplay, and intense first-person shooter action.', ratings: [{ source: 'IGN', score: '8/10' }], summary: 'A massive free-to-play battle royale in the Call of Duty universe.' },
  'Minecraft': { game_title: 'Minecraft', developer: 'Mojang Studios', publisher: 'Xbox Game Studios', platforms: ['PC', 'Mobile', 'PS5', 'Xbox', 'Nintendo Switch'], genre: ['Sandbox', 'Survival', 'Creative'], description: 'Minecraft is a sandbox game that lets you build, explore, and survive in a blocky, procedurally generated 3D world. With near-infinite possibilities, players can craft tools, build structures, and explore vast landscapes.', current_version: '1.21', download_links: [{ platform: 'PC', store_name: 'Minecraft.net', url: 'https://www.minecraft.net' }, { platform: 'Mobile', store_name: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.mojang.minecraftpe' }], ratings: [{ source: 'Metacritic', score: '93/100' }], summary: 'The best-selling game of all time - build, explore, and survive.' },
  'Fortnite': { game_title: 'Fortnite', developer: 'Epic Games', publisher: 'Epic Games', platforms: ['PC', 'PS5', 'Xbox', 'Nintendo Switch', 'Mobile'], genre: ['Battle Royale', 'Shooter'], description: 'Fortnite is a free-to-play battle royale game featuring fast-paced building mechanics, seasonal content updates, and crossover events with major entertainment brands.', download_links: [{ platform: 'PC', store_name: 'Epic Games Store', url: 'https://store.epicgames.com/en-US/p/fortnite' }], ratings: [{ source: 'IGN', score: '9.6/10' }], summary: 'A cultural phenomenon - free-to-play battle royale with building mechanics.' },
  'The Legend of Zelda: TotK': { game_title: 'The Legend of Zelda: Tears of the Kingdom', developer: 'Nintendo EPD', publisher: 'Nintendo', platforms: ['Nintendo Switch'], genre: ['Action-Adventure', 'Open World'], description: 'The sequel to Breath of the Wild. Explore the vast lands and skies of Hyrule with new abilities including Ultrahand, Fuse, Ascend, and Recall.', current_version: '1.2.1', release_date: 'May 12, 2023', ratings: [{ source: 'Metacritic', score: '96/100' }, { source: 'IGN', score: '10/10' }], summary: 'A masterpiece sequel expanding Hyrule into the skies above.' },
  'Cyberpunk 2077': { game_title: 'Cyberpunk 2077', developer: 'CD Projekt Red', publisher: 'CD Projekt', platforms: ['PC', 'PS5', 'Xbox Series X/S'], genre: ['Action RPG', 'Open World', 'Cyberpunk'], description: 'An open-world RPG set in the megalopolis of Night City. Play as V, a mercenary outlaw going after a one-of-a-kind implant that is the key to immortality.', current_version: '2.12', release_date: 'December 10, 2020', download_links: [{ platform: 'PC', store_name: 'Steam', url: 'https://store.steampowered.com/app/1091500/Cyberpunk_2077/' }], ratings: [{ source: 'Metacritic', score: '86/100' }], summary: 'A sprawling open-world RPG set in a dystopian future megacity.' },
  'Among Us': { game_title: 'Among Us', developer: 'Innersloth', publisher: 'Innersloth', platforms: ['PC', 'Mobile', 'Nintendo Switch', 'PS5', 'Xbox'], genre: ['Party', 'Social Deduction'], description: 'Among Us is an online multiplayer social deduction game where players work together to complete tasks on a spaceship while trying to identify the impostors among them.', download_links: [{ platform: 'PC', store_name: 'Steam', url: 'https://store.steampowered.com/app/945360/Among_Us/' }, { platform: 'Mobile', store_name: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.innersloth.spacemafia' }], ratings: [{ source: 'IGN', score: '8/10' }], summary: 'A wildly popular social deduction party game.' },
  'Apex Legends': { game_title: 'Apex Legends', developer: 'Respawn Entertainment', publisher: 'Electronic Arts', platforms: ['PC', 'PS5', 'Xbox', 'Nintendo Switch', 'Mobile'], genre: ['FPS', 'Battle Royale'], description: 'Apex Legends is a free-to-play hero shooter battle royale game featuring unique characters (Legends) with distinct abilities, squad-based gameplay, and fast-paced combat.', download_links: [{ platform: 'PC', store_name: 'Steam', url: 'https://store.steampowered.com/app/1172470/Apex_Legends/' }], ratings: [{ source: 'Metacritic', score: '89/100' }], summary: 'A fast-paced hero-based battle royale from the Titanfall creators.' },
  'Stardew Valley': { game_title: 'Stardew Valley', developer: 'ConcernedApe', publisher: 'ConcernedApe', platforms: ['PC', 'Mobile', 'PS5', 'Xbox', 'Nintendo Switch'], genre: ['Simulation', 'Farming RPG'], description: 'Stardew Valley is a farming simulation RPG where you inherit your grandfather\'s farm and build it into a thriving homestead. Farm, fish, mine, and build relationships with the locals.', current_version: '1.6', download_links: [{ platform: 'PC', store_name: 'Steam', url: 'https://store.steampowered.com/app/413150/Stardew_Valley/' }], ratings: [{ source: 'Metacritic', score: '89/100' }], summary: 'A beloved farming sim with deep gameplay and charming pixel art.' },
  'God of War Ragnarok': { game_title: 'God of War Ragnarok', developer: 'Santa Monica Studio', publisher: 'Sony Interactive Entertainment', platforms: ['PS5', 'PS4', 'PC'], genre: ['Action-Adventure', 'Hack and Slash'], description: 'God of War Ragnarok continues the story of Kratos and Atreus as they journey through the Nine Realms, facing Norse gods and the coming of Ragnarok.', current_version: '1.04', release_date: 'November 9, 2022', download_links: [{ platform: 'PC', store_name: 'Steam', url: 'https://store.steampowered.com/app/2322010/God_of_War_Ragnarok/' }], ratings: [{ source: 'Metacritic', score: '94/100' }, { source: 'IGN', score: '10/10' }], summary: 'An epic sequel following Kratos and Atreus through Norse mythology.' },
}

// ---------- Main Page ----------
export default function Page() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'detail'>('dashboard')
  const [gameDetail, setGameDetail] = useState<GameData | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Enrich game data with AI agent in the background
  const enrichWithAgent = useCallback(async (query: string, currentData: GameData) => {
    try {
      const result = await callAIAgent(
        `Give me complete information about the game "${query}" including description, platforms, download links, system requirements, ratings, version info, and related games.`,
        AGENT_ID
      )

      if (!result) return

      const parsed = parseAgentResponse(result, query)
      if (parsed && parsed.game_title) {
        // Merge: AI data overrides sample data for non-empty fields
        setGameDetail(prev => {
          if (!prev) return parsed
          return {
            ...prev,
            ...Object.fromEntries(
              Object.entries(parsed).filter(([_, v]) => v !== undefined && v !== null && v !== '')
            ),
            _isLoading: false,
          }
        })
      } else {
        // Just clear the loading state
        setGameDetail(prev => prev ? { ...prev, _isLoading: false } : prev)
      }
    } catch {
      setGameDetail(prev => prev ? { ...prev, _isLoading: false } : prev)
    }
  }, [])

  // Handle search bar submission - full AI search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    setSearchLoading(true)
    setActiveAgentId(AGENT_ID)
    setSearchError(null)

    // Check if it matches a sample game for instant preview
    const sampleKey = Object.keys(SAMPLE_GAME_DATA).find(
      k => k.toLowerCase() === query.trim().toLowerCase()
    )
    if (sampleKey) {
      setGameDetail({ ...SAMPLE_GAME_DATA[sampleKey], _isLoading: true })
      setCurrentView('detail')
      setSearchLoading(false)
      setActiveAgentId(null)
      enrichWithAgent(query, SAMPLE_GAME_DATA[sampleKey])
      return
    }

    // Show a loading detail page immediately
    setGameDetail({
      game_title: query,
      description: 'Searching for game information...',
      _isLoading: true,
    })
    setCurrentView('detail')

    try {
      const result = await callAIAgent(query, AGENT_ID)

      if (!result) {
        setGameDetail(prev => prev ? {
          ...prev,
          description: 'No response from agent. The game information could not be loaded.',
          _isLoading: false,
        } : prev)
        setSearchLoading(false)
        setActiveAgentId(null)
        return
      }

      const parsed = parseAgentResponse(result, query)

      if (parsed) {
        setGameDetail({ ...parsed, _isLoading: false })
      } else if (result.success === false) {
        const errMsg = result.error || result.response?.message || 'Could not fetch game info.'
        setGameDetail(prev => prev ? {
          ...prev,
          description: errMsg,
          _isLoading: false,
          _rawText: errMsg,
        } : prev)
      } else {
        setGameDetail(prev => prev ? {
          ...prev,
          description: 'No game data found. Try searching with a different query.',
          _isLoading: false,
          _rawText: 'No game data found.',
        } : prev)
      }
    } catch {
      setGameDetail(prev => prev ? {
        ...prev,
        description: 'Network error. Please check your connection and try again.',
        _isLoading: false,
        _rawText: 'Network error.',
      } : prev)
    } finally {
      setSearchLoading(false)
      setActiveAgentId(null)
    }
  }, [enrichWithAgent])

  // Handle clicking a sample game card - show INSTANTLY, then enrich
  const handleViewDetail = useCallback((gameTitle: string) => {
    const sampleData = SAMPLE_GAME_DATA[gameTitle]
    if (sampleData) {
      // Show detail immediately with sample data
      setGameDetail({ ...sampleData, _isLoading: true })
      setCurrentView('detail')
      setSearchError(null)
      // Enrich with AI in background
      enrichWithAgent(gameTitle, sampleData)
    } else {
      // Not a sample game - do full search
      handleSearch(gameTitle)
    }
  }, [enrichWithAgent, handleSearch])

  const handleBack = useCallback(() => {
    setCurrentView('dashboard')
    setGameDetail(null)
  }, [])

  const handleToggleChat = useCallback(() => {
    setChatOpen(prev => !prev)
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {currentView === 'dashboard' && (
          <Dashboard
            onSearch={handleSearch}
            onViewDetail={handleViewDetail}
            onToggleChat={handleToggleChat}
            searchLoading={searchLoading}
            activeAgentId={activeAgentId}
            searchError={searchError}
          />
        )}

        {currentView === 'detail' && (
          <GameDetail
            data={gameDetail}
            onBack={handleBack}
            onSearchGame={handleSearch}
          />
        )}

        <ChatAssistant
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </ErrorBoundary>
  )
}
