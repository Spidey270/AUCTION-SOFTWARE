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
import AuctionPlanModal from './components/AuctionPlanModal';
import AuctionReviewModal from './components/AuctionReviewModal';

import { 
  CRICKET_PRESET, 
  FOOTBALL_PRESET, 
  DEFAULT_CRICKET_PLAYERS, 
  DEFAULT_FOOTBALL_PLAYERS, 
  DEFAULT_RIVALS 
} from './data/defaultPlayers';
import { calculateProjectedValue, computeTeamSummary } from './utils/auctionMath';
import { loadStoredTournaments, persistStoredTournaments, snapshotTournamentState } from './utils/persistence';

function createAuctionPlan(preset) {
  const roleTargets = {};
  const defaults = preset.sport === 'cricket'
    ? { BAT: 0.28, BOWL: 0.33, AR: 0.22, WK: 0.17 }
    : { GK: 0.13, DEF: 0.31, MID: 0.31, FWD: 0.25 };
  let allocated = 0;
  preset.roles.forEach((role, index) => {
    const target = index === preset.roles.length - 1
      ? Math.max(0, preset.minSquad - allocated)
      : Math.min(
        Math.max(0, preset.minSquad - allocated),
        Math.round(preset.minSquad * (defaults[role.id] || 1 / preset.roles.length))
      );
    roleTargets[role.id] = target;
    allocated += target;
  });
  return {
    roleTargets,
    budgetPercent: 90,
    bidIncrements: [...preset.bidIncrements],
    targetSettings: {}
  };
}

export default function App() {
  const [view, setView] = useState('home'); // 'home' or 'warroom'
  const [savedTournaments, setSavedTournaments] = useState([]);
  const [currentTourneyId, setCurrentTourneyId] = useState(null);
  const [auctionLog, setAuctionLog] = useState([]);
  const [auctionFocus, setAuctionFocus] = useState(false);

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Load saved tournaments on mount
  useEffect(() => {
    let active = true;

    loadStoredTournaments().then((saved) => {
      if (!active) return;
      if (Array.isArray(saved) && saved.length > 0) {
        setSavedTournaments(saved);
      }
    }).catch((e) => {
      console.warn('Failed to load tournaments from persistence layer', e);
    });

    return () => {
      active = false;
    };
  }, []);

  const persistTournaments = async (tourneys, backupTournament = null, reason = 'auto-save') => {
    setSavedTournaments(tourneys);
    await persistStoredTournaments(tourneys, backupTournament, reason);
  };

  // Active tournament
  const activeTournament = useMemo(() => {
    return savedTournaments.find(t => t.id === currentTourneyId) || null;
  }, [savedTournaments, currentTourneyId]);

  const addHistoryEntry = (tourney, actionLabel, beforeSnapshot) => {
    const safeBefore = beforeSnapshot || snapshotTournamentState(tourney);
    const history = Array.isArray(tourney.history) ? tourney.history : [];

    return {
      ...tourney,
      history: [{
        id: `hist-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        action: actionLabel,
        createdAt: new Date().toISOString(),
        snapshot: safeBefore
      }, ...history].slice(0, 12),
      updatedAt: Date.now()
    };
  };

  // Update active tournament slice
  const updateCurrentTournament = (updater, actionLabel = 'Updated auction') => {
    setSavedTournaments(prev => {
      const updated = prev.map(t => {
        if (t.id !== currentTourneyId) return t;

        const beforeSnapshot = snapshotTournamentState(t);
        const newProps = typeof updater === 'function' ? updater(t) : updater;
        const nextTournament = {
          ...t,
          ...newProps,
          history: Array.isArray(t.history) ? t.history : []
        };

        return addHistoryEntry(nextTournament, actionLabel, beforeSnapshot);
      });

      const latestTournament = updated.find(t => t.id === currentTourneyId) || null;
      if (latestTournament) {
        void persistStoredTournaments(updated, latestTournament, actionLabel);
      }
      return updated;
    });
  };

  const handleUndoLastAction = () => {
    if (!activeTournament || !Array.isArray(activeTournament.history) || activeTournament.history.length === 0) {
      return;
    }

    const [latest, ...rest] = activeTournament.history;
    const previousState = latest?.snapshot || null;
    if (!previousState) return;

    const restoredTournament = {
      ...activeTournament,
      ...previousState,
      id: activeTournament.id,
      history: rest,
      updatedAt: Date.now()
    };

    const updated = savedTournaments.map(t => t.id === currentTourneyId ? restoredTournament : t);
    setSavedTournaments(updated);
    void persistStoredTournaments(updated, restoredTournament, 'Undo last action');
  };

  const handleRestoreHistoryEntry = (historyId) => {
    if (!activeTournament) return;
    const history = activeTournament.history || [];
    const historyIndex = history.findIndex(entry => entry.id === historyId);
    if (historyIndex < 0 || !history[historyIndex].snapshot) return;
    if (!window.confirm(`Restore the tournament to before "${history[historyIndex].action}"? Newer changes will be discarded.`)) return;

    const restoredTournament = {
      ...activeTournament,
      ...history[historyIndex].snapshot,
      id: activeTournament.id,
      history: history.slice(historyIndex + 1),
      updatedAt: Date.now()
    };
    const updated = savedTournaments.map(t => t.id === currentTourneyId ? restoredTournament : t);
    setSavedTournaments(updated);
    void persistStoredTournaments(updated, restoredTournament, 'Restored history checkpoint');
  };

  // Create new tournament from wizard
  const handleCreateTournament = (newTourney) => {
    const finalTourney = {
      ...newTourney,
      history: [],
      auctionLog: [],
      auctionPlan: newTourney.auctionPlan || createAuctionPlan(newTourney.preset)
    };
    const updated = [finalTourney, ...savedTournaments];
    void persistTournaments(updated, finalTourney, 'Created tournament');
    setAuctionLog([]);
    setCurrentTourneyId(finalTourney.id);
    setView('warroom');
    setIsPlanOpen(true);
    setAuctionFocus(false);
  };

  // Resume tournament
  const handleResumeTournament = (id) => {
    const tournament = savedTournaments.find(t => t.id === id);
    setAuctionLog(tournament?.auctionLog || []);
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
      history: [],
      auctionLog: [],
      auctionPlan: createAuctionPlan(isCricket ? CRICKET_PRESET : FOOTBALL_PRESET),
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
  const handleWinPlayer = (player, finalBid, note = '') => {
    if (!activeTournament) return;
    const updatedPlayer = {
      ...player,
      status: 'WON_BY_ME',
      boughtFor: finalBid,
      fairValueAtSale: calculateProjectedValue(player, activeTournament.preset, 1, activeTournament.players)
    };

    updateCurrentTournament(t => {
      const newPlayers = t.players.map(p => p.id === player.id ? updatedPlayer : p);
      const nextId = findNextAvailablePlayerId(player.id, newPlayers);
      const nextAuctionLog = [
        {
          id: `log-${Date.now()}`,
          label: 'Won by me',
          playerName: player.name,
          amount: finalBid,
          role: player.role,
          rating: player.rating,
          fairValue: calculateProjectedValue(player, activeTournament.preset, 1, activeTournament.players),
          note,
          timestamp: new Date().toISOString()
        },
        ...(t.auctionLog || [])
      ];
      return {
        players: newPlayers,
        mySquad: [updatedPlayer, ...(t.mySquad || [])],
        activePlayerId: nextId,
        auctionLog: nextAuctionLog
      };
    }, 'Won player');
  };

  // Sell to Rival
  const handleSellToRival = (player, rivalId, finalBid, note = '') => {
    if (!activeTournament) return;
    const rival = activeTournament.rivals.find(r => r.id === rivalId);
    const updatedPlayer = {
      ...player,
      status: 'SOLD_RIVAL',
      soldToRivalId: rivalId,
      soldToTeam: rival ? rival.name : 'Rival',
      boughtFor: finalBid,
      fairValueAtSale: calculateProjectedValue(player, activeTournament.preset, 1, activeTournament.players)
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

      const nextAuctionLog = [
        {
          id: `log-${Date.now()}`,
          label: `Sold to ${rival?.name || 'rival'}`,
          playerName: player.name,
          amount: finalBid,
          role: player.role,
          rating: player.rating,
          fairValue: calculateProjectedValue(player, activeTournament.preset, 1, activeTournament.players),
          note,
          timestamp: new Date().toISOString()
        },
        ...(t.auctionLog || [])
      ];

      return {
        players: newPlayers,
        rivals: newRivals,
        activePlayerId: nextId,
        auctionLog: nextAuctionLog
      };
    }, 'Sold player to rival');
  };

  // Mark Unsold
  const handleMarkUnsold = (player, note = '') => {
    if (!activeTournament) return;
    const updatedPlayer = {
      ...player,
      status: 'UNSOLD'
    };

    updateCurrentTournament(t => {
      const newPlayers = t.players.map(p => p.id === player.id ? updatedPlayer : p);
      const nextId = findNextAvailablePlayerId(player.id, newPlayers);
      const nextAuctionLog = [
        {
          id: `log-${Date.now()}`,
          label: 'Marked unsold',
          playerName: player.name,
          amount: 0,
          role: player.role,
          rating: player.rating,
          note,
          timestamp: new Date().toISOString()
        },
        ...(t.auctionLog || [])
      ];
      return {
        players: newPlayers,
        activePlayerId: nextId,
        auctionLog: nextAuctionLog
      };
    }, 'Marked player unsold');
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

  const handleSavePlan = (plan, updatePreset = false) => {
    if (!activeTournament) return;
    updateCurrentTournament(t => ({
      auctionPlan: {
        ...(t.auctionPlan || createAuctionPlan(t.preset)),
        ...plan
      },
      ...(updatePreset ? { preset: { ...t.preset, bidIncrements: plan.bidIncrements } } : {})
    }), 'Updated auction plan');
  };

  const handleStartPractice = () => {
    if (!activeTournament) return;
    const practice = {
      ...activeTournament,
      id: `practice-${Date.now()}`,
      name: `${activeTournament.name} — Practice`,
      players: activeTournament.players.map(player => {
        const { status, boughtFor, soldToRivalId, soldToTeam, fairValueAtSale, ...available } = player;
        return { ...available, status: null };
      }),
      mySquad: [],
      rivals: (activeTournament.rivals || []).map(rival => ({ ...rival, purseSpent: 0, playersCount: 0, acquired: [] })),
      activePlayerId: activeTournament.players.find(player => !player.status)?.id || activeTournament.players[0]?.id || null,
      targetsList: [...(activeTournament.targetsList || [])],
      history: [],
      auctionLog: [],
      isPractice: true,
      updatedAt: Date.now()
    };
    const updated = [practice, ...savedTournaments];
    void persistTournaments(updated, practice, 'Created practice auction');
    setCurrentTourneyId(practice.id);
    setView('warroom');
    setAuctionFocus(false);
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
        targetsList: [],
        auctionLog: []
      });
    }
  };

  // Global Keyboard Shortcuts (active when in War Room)
  useEffect(() => {
    if (view !== 'warroom' || !activeTournament || isPlanOpen || isReviewOpen || isSettingsOpen || isImportOpen || isShortcutsOpen || isApiKeyOpen || isAiDrawerOpen) return;

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, activeTournament, activePlayer, findNextAvailablePlayerId, isPlanOpen, isReviewOpen, isSettingsOpen, isImportOpen, isShortcutsOpen, isApiKeyOpen, isAiDrawerOpen]);

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
    <div className="auction-shell min-h-screen text-slate-100 flex flex-col font-sans">
      
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
          }, 'Switched sport preset');
        }}
        teamSummary={teamSummary}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onResetAuction={handleResetAuction}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onExitToHome={() => setView('home')}
        onToggleAiDrawer={() => setIsAiDrawerOpen(prev => !prev)}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
        onUndoLastAction={handleUndoLastAction}
        hasUndoHistory={Array.isArray(activeTournament.history) && activeTournament.history.length > 0}
        onOpenPlan={() => setIsPlanOpen(true)}
        onOpenReview={() => setIsReviewOpen(true)}
        onStartPractice={handleStartPractice}
        isPractice={activeTournament.isPractice}
        onToggleAuctionFocus={() => setAuctionFocus(previous => !previous)}
      />

      {/* Main War Room Cockpit */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1720px] w-full mx-auto space-y-6">
        
        {/* UPPER TACTICAL GRID: Live Hammer & Rivals Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Main Auction Block / Hammer Arena (8 cols) */}
          <div className={auctionFocus ? 'lg:col-span-12' : 'lg:col-span-8'}>
            <HammerArena
              activePlayer={activePlayer}
              allPlayers={activeTournament.players}
              preset={activeTournament.preset}
              teamSummary={teamSummary}
              rivals={activeTournament.rivals || []}
              myTeamName={activeTournament.myTeamName || 'My Team'}
              auctionLog={activeTournament.auctionLog || auctionLog || []}
              auctionPlan={activeTournament.auctionPlan || createAuctionPlan(activeTournament.preset)}
              auctionFocus={auctionFocus}
              keyboardEnabled={!isPlanOpen && !isReviewOpen && !isSettingsOpen && !isImportOpen && !isShortcutsOpen && !isApiKeyOpen && !isAiDrawerOpen}
              onToggleAuctionFocus={() => setAuctionFocus(previous => !previous)}
              onWinPlayer={handleWinPlayer}
              onSellToRival={handleSellToRival}
              onMarkUnsold={handleMarkUnsold}
              onNextPlayer={() => {
                const nextId = findNextAvailablePlayerId(activeTournament.activePlayerId, activeTournament.players);
                if (nextId) updateCurrentTournament({ activePlayerId: nextId });
              }}
              onSelectPlayerForHammer={(player) => updateCurrentTournament({ activePlayerId: player.id })}
              onOpenAiStrategist={() => setIsAiDrawerOpen(true)}
            />
          </div>

          {/* Competitor Intelligence Radar (4 cols) */}
          {!auctionFocus && <div className="lg:col-span-4">
            <RivalsRadar
              rivals={activeTournament.rivals || []}
              preset={activeTournament.preset}
              activePlayer={activePlayer}
              onUpdateRival={handleUpdateRival}
              onAddRival={handleAddRival}
              onDeleteRival={handleDeleteRival}
            />
          </div>}

        </div>

        {/* LOWER STRATEGIC GRID: My Squad Visualizer & Player Database */}
        {!auctionFocus && <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
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

        </div>}

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
        allPlayers={activeTournament.players || []}
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

      <AuctionPlanModal
        isOpen={isPlanOpen}
        onClose={() => setIsPlanOpen(false)}
        preset={activeTournament.preset}
        players={activeTournament.players || []}
        targetsList={activeTournament.targetsList || []}
        plan={activeTournament.auctionPlan || createAuctionPlan(activeTournament.preset)}
        onSave={handleSavePlan}
      />

      <AuctionReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        tournament={activeTournament}
        onRestoreHistoryEntry={handleRestoreHistoryEntry}
      />

    </div>
  );
}
