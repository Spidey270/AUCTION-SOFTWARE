import React, { useState, useEffect, useMemo, useCallback } from 'react';
import HomeScreen from './components/HomeScreen';
import NewAuctionWizard from './components/NewAuctionWizard';
import Header from './components/Header';
import HammerArena from './components/HammerArena';
import RivalsRadar from './components/RivalsRadar';
import SquadVisualizer from './components/SquadVisualizer';
import PlayerDatabase from './components/PlayerDatabase';
import ImportModal from './components/ImportModal';
import RuleSettingsModal from './components/RuleSettingsModal';
import ShortcutsModal from './components/ShortcutsModal';
import AiCopilotDrawer from './components/AiCopilotDrawer';
import ApiKeyModal from './components/ApiKeyModal';

import { 
  CRICKET_PRESET, 
  FOOTBALL_PRESET, 
  DEFAULT_CRICKET_PLAYERS, 
  DEFAULT_FOOTBALL_PLAYERS, 
  DEFAULT_RIVALS 
} from './data/defaultPlayers';
import { computeTeamSummary } from './utils/auctionMath';

const TOURNAMENTS_STORAGE_KEY = 'auction_warroom_tournaments_v3';

export default function App() {
  const [view, setView] = useState('home'); // 'home' or 'warroom'
  const [savedTournaments, setSavedTournaments] = useState([]);
  const [currentTourneyId, setCurrentTourneyId] = useState(null);

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Load saved tournaments on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOURNAMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedTournaments(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load tournaments from localStorage', e);
    }
  }, []);

  // Save tournaments to localStorage whenever savedTournaments changes
  const persistTournaments = (tourneys) => {
    setSavedTournaments(tourneys);
    try {
      localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(tourneys));
    } catch (e) {
      console.warn('Failed to persist tournaments', e);
    }
  };

  // Active tournament
  const activeTournament = useMemo(() => {
    return savedTournaments.find(t => t.id === currentTourneyId) || null;
  }, [savedTournaments, currentTourneyId]);

  // Update active tournament slice
  const updateCurrentTournament = (updater) => {
    setSavedTournaments(prev => {
      const updated = prev.map(t => {
        if (t.id === currentTourneyId) {
          const newProps = typeof updater === 'function' ? updater(t) : updater;
          return { ...t, ...newProps, updatedAt: Date.now() };
        }
        return t;
      });
      try {
        localStorage.setItem(TOURNAMENTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Create new tournament from wizard
  const handleCreateTournament = (newTourney) => {
    const updated = [newTourney, ...savedTournaments];
    persistTournaments(updated);
    setCurrentTourneyId(newTourney.id);
    setView('warroom');
  };

  // Resume tournament
  const handleResumeTournament = (id) => {
    setCurrentTourneyId(id);
    setView('warroom');
  };

  // Delete tournament
  const handleDeleteTournament = (id) => {
    if (window.confirm("Are you sure you want to delete this tournament?")) {
      const filtered = savedTournaments.filter(t => t.id !== id);
      persistTournaments(filtered);
      if (currentTourneyId === id) {
        setCurrentTourneyId(null);
        setView('home');
      }
    }
  };

  // Quick Start Template
  const handleQuickStart = (sport) => {
    const isCricket = sport === 'cricket';
    const quickTourney = {
      id: `tourney-quick-${Date.now()}`,
      name: isCricket ? 'IPL Mega Auction 2026' : 'European Football Auction 2026',
      sport,
      preset: isCricket ? CRICKET_PRESET : FOOTBALL_PRESET,
      players: isCricket ? DEFAULT_CRICKET_PLAYERS : DEFAULT_FOOTBALL_PLAYERS,
      mySquad: [],
      rivals: DEFAULT_RIVALS,
      activePlayerId: (isCricket ? DEFAULT_CRICKET_PLAYERS : DEFAULT_FOOTBALL_PLAYERS)[0]?.id || null,
      targetsList: [],
      updatedAt: Date.now()
    };

    handleCreateTournament(quickTourney);
  };

  // Live War Room Calculations
  const teamSummary = useMemo(() => {
    if (!activeTournament) {
      return computeTeamSummary([], CRICKET_PRESET.totalPurse, CRICKET_PRESET);
    }
    return computeTeamSummary(
      activeTournament.mySquad || [],
      activeTournament.preset.totalPurse,
      activeTournament.preset
    );
  }, [activeTournament]);

  const activePlayer = useMemo(() => {
    if (!activeTournament) return null;
    return activeTournament.players.find(p => p.id === activeTournament.activePlayerId) || null;
  }, [activeTournament]);

  const findNextAvailablePlayerId = useCallback((currentId, playerList) => {
    const available = (playerList || []).filter(p => !p.status && p.id !== currentId);
    return available[0]?.id || null;
  }, []);

  // Win Player
  const handleWinPlayer = (player, finalBid) => {
    if (!activeTournament) return;
    const updatedPlayer = {
      ...player,
      status: 'WON_BY_ME',
      boughtFor: finalBid
    };

    updateCurrentTournament(t => {
      const newPlayers = t.players.map(p => p.id === player.id ? updatedPlayer : p);
      const nextId = findNextAvailablePlayerId(player.id, newPlayers);
      return {
        players: newPlayers,
        mySquad: [updatedPlayer, ...(t.mySquad || [])],
        activePlayerId: nextId
      };
    });
  };

  // Sell to Rival
  const handleSellToRival = (player, rivalId, finalBid) => {
    if (!activeTournament) return;
    const rival = activeTournament.rivals.find(r => r.id === rivalId);
    const updatedPlayer = {
      ...player,
      status: 'SOLD_RIVAL',
      soldToRivalId: rivalId,
      soldToTeam: rival ? rival.name : 'Rival',
      boughtFor: finalBid
    };

    updateCurrentTournament(t => {
      const newPlayers = t.players.map(p => p.id === player.id ? updatedPlayer : p);
      const nextId = findNextAvailablePlayerId(player.id, newPlayers);
      const newRivals = t.rivals.map(r => {
        if (r.id === rivalId) {
          return {
            ...r,
            purseSpent: Number(((r.purseSpent || 0) + finalBid).toFixed(2)),
            playersCount: (r.playersCount || 0) + 1,
            acquired: [...(r.acquired || []), updatedPlayer]
          };
        }
        return r;
      });

      return {
        players: newPlayers,
        rivals: newRivals,
        activePlayerId: nextId
      };
    });
  };

  // Mark Unsold
  const handleMarkUnsold = (player) => {
    if (!activeTournament) return;
    const updatedPlayer = {
      ...player,
      status: 'UNSOLD'
    };

    updateCurrentTournament(t => {
      const newPlayers = t.players.map(p => p.id === player.id ? updatedPlayer : p);
      const nextId = findNextAvailablePlayerId(player.id, newPlayers);
      return {
        players: newPlayers,
        activePlayerId: nextId
      };
    });
  };

  // Release / Undo a player
  const handleReleasePlayer = (playerId) => {
    if (!activeTournament) return;
    updateCurrentTournament(t => ({
      mySquad: t.mySquad.filter(p => p.id !== playerId),
      players: t.players.map(p => {
        if (p.id === playerId) {
          const { status, boughtFor, ...rest } = p;
          return { ...rest, status: null };
        }
        return p;
      })
    }));
  };

  // Update Rival
  const handleUpdateRival = (id, updates) => {
    if (!activeTournament) return;
    updateCurrentTournament(t => ({
      rivals: t.rivals.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  };

  // Add Rival
  const handleAddRival = (name) => {
    if (!activeTournament) return;
    const newRival = {
      id: `r-${Date.now()}`,
      name,
      purseSpent: 0,
      playersCount: 0,
      acquired: []
    };
    updateCurrentTournament(t => ({
      rivals: [...(t.rivals || []), newRival]
    }));
  };

  // Delete Rival
  const handleDeleteRival = (id) => {
    if (!activeTournament) return;
    updateCurrentTournament(t => ({
      rivals: t.rivals.filter(r => r.id !== id)
    }));
  };

  // Target Wishlist toggle
  const handleToggleTarget = (playerId) => {
    if (!activeTournament) return;
    updateCurrentTournament(t => {
      const list = t.targetsList || [];
      return {
        targetsList: list.includes(playerId) ? list.filter(id => id !== playerId) : [...list, playerId]
      };
    });
  };

  // Import Players
  const handleImportPlayers = (newPlayers, replaceExisting) => {
    if (!activeTournament) return;
    updateCurrentTournament(t => {
      if (replaceExisting) {
        return {
          players: newPlayers,
          mySquad: [],
          activePlayerId: newPlayers[0]?.id || null
        };
      }
      return {
        players: [...t.players, ...newPlayers]
      };
    });
  };

  // Reset Auction
  const handleResetAuction = () => {
    if (!activeTournament) return;
    if (window.confirm("Are you sure you want to reset all auction progress for this tournament?")) {
      const defaultPool = activeTournament.sport === 'cricket' ? DEFAULT_CRICKET_PLAYERS : DEFAULT_FOOTBALL_PLAYERS;
      updateCurrentTournament({
        players: defaultPool,
        mySquad: [],
        rivals: DEFAULT_RIVALS,
        activePlayerId: defaultPool[0]?.id || null,
        targetsList: []
      });
    }
  };

  // Global Keyboard Shortcuts (active when in War Room)
  useEffect(() => {
    if (view !== 'warroom' || !activeTournament) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('player-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setIsShortcutsOpen(prev => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        setIsAiDrawerOpen(prev => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        const nextId = findNextAvailablePlayerId(activeTournament.activePlayerId, activeTournament.players);
        if (nextId) updateCurrentTournament({ activePlayerId: nextId });
      } else if (e.key === 'u' || e.key === 'U') {
        if (activePlayer) handleMarkUnsold(activePlayer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, activeTournament, activePlayer, findNextAvailablePlayerId]);

  // VIEW 1: HOME SCREEN
  if (view === 'home' || !activeTournament) {
    return (
      <>
        <HomeScreen
          savedTournaments={savedTournaments}
          onLaunchNewAuctionWizard={() => setIsWizardOpen(true)}
          onResumeTournament={handleResumeTournament}
          onDeleteTournament={handleDeleteTournament}
          onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
          onQuickStart={handleQuickStart}
        />

        <NewAuctionWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onCreateTournament={handleCreateTournament}
          onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
        />

        <ApiKeyModal
          isOpen={isApiKeyOpen}
          onClose={() => setIsApiKeyOpen(false)}
        />
      </>
    );
  }

  // VIEW 2: LIVE WAR ROOM
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans select-none">
      
      {/* Top Header */}
      <Header
        tournamentName={activeTournament.name}
        preset={activeTournament.preset}
        myTeamName={activeTournament.myTeamName || 'My Team'}
        onSwitchSport={(sport) => {
          updateCurrentTournament({
            sport,
            preset: sport === 'cricket' ? CRICKET_PRESET : FOOTBALL_PRESET,
            players: sport === 'cricket' ? DEFAULT_CRICKET_PLAYERS : DEFAULT_FOOTBALL_PLAYERS,
            mySquad: [],
            activePlayerId: (sport === 'cricket' ? DEFAULT_CRICKET_PLAYERS : DEFAULT_FOOTBALL_PLAYERS)[0]?.id
          });
        }}
        teamSummary={teamSummary}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onResetAuction={handleResetAuction}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onExitToHome={() => setView('home')}
        onToggleAiDrawer={() => setIsAiDrawerOpen(prev => !prev)}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
      />

      {/* Main War Room Cockpit */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1720px] w-full mx-auto space-y-6">
        
        {/* UPPER TACTICAL GRID: Live Hammer & Rivals Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Auction Block / Hammer Arena (8 cols) */}
          <div className="lg:col-span-8">
            <HammerArena
              activePlayer={activePlayer}
              preset={activeTournament.preset}
              teamSummary={teamSummary}
              rivals={activeTournament.rivals || []}
              myTeamName={activeTournament.myTeamName || 'My Team'}
              onWinPlayer={handleWinPlayer}
              onSellToRival={handleSellToRival}
              onMarkUnsold={handleMarkUnsold}
              onNextPlayer={() => {
                const nextId = findNextAvailablePlayerId(activeTournament.activePlayerId, activeTournament.players);
                if (nextId) updateCurrentTournament({ activePlayerId: nextId });
              }}
              onOpenAiStrategist={() => setIsAiDrawerOpen(true)}
            />
          </div>

          {/* Competitor Intelligence Radar (4 cols) */}
          <div className="lg:col-span-4">
            <RivalsRadar
              rivals={activeTournament.rivals || []}
              preset={activeTournament.preset}
              activePlayer={activePlayer}
              onUpdateRival={handleUpdateRival}
              onAddRival={handleAddRival}
              onDeleteRival={handleDeleteRival}
            />
          </div>

        </div>

        {/* LOWER STRATEGIC GRID: My Squad Visualizer & Player Database */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* My Squad / Cumulative Rating (5 cols) */}
          <div className="lg:col-span-5">
            <SquadVisualizer
              mySquad={activeTournament.mySquad || []}
              preset={activeTournament.preset}
              teamSummary={teamSummary}
              myTeamName={activeTournament.myTeamName || 'My Team'}
              onReleasePlayer={handleReleasePlayer}
            />
          </div>

          {/* Player Market Database & Wishlist (7 cols) */}
          <div className="lg:col-span-7">
            <PlayerDatabase
              players={activeTournament.players || []}
              preset={activeTournament.preset}
              activePlayerId={activeTournament.activePlayerId}
              onSelectPlayerForHammer={(player) => updateCurrentTournament({ activePlayerId: player.id })}
              onToggleTarget={handleToggleTarget}
              targetsList={activeTournament.targetsList || []}
            />
          </div>

        </div>

      </main>

      {/* AI Copilot Drawer */}
      <AiCopilotDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        activePlayer={activePlayer}
        currentBid={activePlayer ? (activePlayer.basePrice || activeTournament.preset.basePriceDefault) : 0}
        teamSummary={teamSummary}
        rivals={activeTournament.rivals || []}
        preset={activeTournament.preset}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
      />

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportPlayers={handleImportPlayers}
        preset={activeTournament.preset}
      />

      <RuleSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preset={activeTournament.preset}
        onSavePreset={(newPreset) => updateCurrentTournament({ preset: newPreset })}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
      />

    </div>
  );
}

