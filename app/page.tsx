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
  // Fallback field for text-only responses
  _rawText?: string
}

// ---------- Deep extract: dig through any nesting to find game data ----------
function deepExtractGameData(obj: any, depth: number = 0): any {
  if (depth > 8 || !obj) return null
  if (typeof obj === 'string') {
    // Try parsing as JSON
    try {
      const parsed = JSON.parse(obj)
      return deepExtractGameData(parsed, depth + 1)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object') return null

  // Check if this object IS game data (has game_title or similar fields)
  if (obj.game_title || obj.gameTitle || obj.title || obj.name) {
    return obj
  }

  // Check if it has a results array (list query response)
  if (Array.isArray(obj.results) && obj.results.length > 0) {
    return obj
  }

  // Unwrap known wrapper keys
  const wrapperKeys = ['result', 'response', 'data', 'output', 'content', 'message', 'text', 'answer']
  for (const key of wrapperKeys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      const inner = deepExtractGameData(obj[key], depth + 1)
      if (inner) return inner
    }
  }

  // Check all keys for nested game data
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

// ---------- Helper: parse agent response robustly ----------
function parseAgentResponse(result: AIAgentResponse, queryText: string): GameData | null {
  if (!result) return null

  // Try multiple extraction paths
  const sources: any[] = []

  // Path 1: result.response.result (standard path)
  if (result.response?.result) {
    sources.push(result.response.result)
  }

  // Path 2: result.response itself
  if (result.response) {
    sources.push(result.response)
  }

  // Path 3: raw_response
  if (result.raw_response) {
    sources.push(result.raw_response)
  }

  // Path 4: the entire result object
  sources.push(result)

  // Try each source to find game data
  for (const source of sources) {
    const extracted = deepExtractGameData(source)
    if (extracted) {
      const normalized = normalizeGameFields(extracted)
      // Check if we got meaningful structured data (at least a title)
      if (normalized.game_title) {
        return normalized
      }
    }
  }

  // Fallback: extract text content and create a text-based game detail
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
      // Try to parse JSON from the text one more time
      try {
        const parsed = JSON.parse(text)
        const extracted = deepExtractGameData(parsed)
        if (extracted) {
          const normalized = normalizeGameFields(extracted)
          if (normalized.game_title) return normalized
        }
      } catch {
        // Not JSON - use as raw text description
      }

      // Return as text-based response
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

// ---------- Main Page ----------
export default function Page() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'detail'>('dashboard')
  const [gameDetail, setGameDetail] = useState<GameData | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    setSearchLoading(true)
    setActiveAgentId(AGENT_ID)
    setSearchError(null)

    try {
      const result = await callAIAgent(query, AGENT_ID)

      if (!result) {
        setSearchError('No response from agent. Please try again.')
        return
      }

      // Parse regardless of success flag - sometimes success is false but data exists
      const parsed = parseAgentResponse(result, query)

      if (parsed) {
        setGameDetail(parsed)
        setCurrentView('detail')
      } else if (result.success === false) {
        const errMsg = result.error || result.response?.message || 'Could not fetch game info. Please try again.'
        setSearchError(errMsg)
      } else {
        setSearchError('Unable to parse game data. Please try a different search.')
      }
    } catch {
      setSearchError('Network error. Please check your connection and try again.')
    } finally {
      setSearchLoading(false)
      setActiveAgentId(null)
    }
  }, [])

  const handleViewDetail = useCallback((gameTitle: string) => {
    handleSearch(gameTitle)
  }, [handleSearch])

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
