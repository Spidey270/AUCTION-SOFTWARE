import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Gavel, 
  Star, 
  Sparkles, 
  ArrowUpDown, 
  CheckCircle, 
  XCircle, 
  Users,
  Shield
} from 'lucide-react';
import { calculateProjectedValue } from '../utils/auctionMath';

export default function PlayerDatabase({
  players,
  preset,
  activePlayerId,
  onSelectPlayerForHammer,
  onToggleTarget,
  targetsList = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [onlyOverseas, setOnlyOverseas] = useState(false);
  const [onlyTargets, setOnlyTargets] = useState(false);
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'basePrice', 'name'
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter & Sort Logic
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Search
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.role.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Role
      if (selectedRole !== 'ALL' && player.role !== selectedRole) return false;

      // Status
      if (selectedStatus === 'AVAILABLE' && player.status) return false;
      if (selectedStatus === 'WON_BY_ME' && player.status !== 'WON_BY_ME') return false;
      if (selectedStatus === 'SOLD_RIVAL' && player.status !== 'SOLD_RIVAL') return false;
      if (selectedStatus === 'UNSOLD' && player.status !== 'UNSOLD') return false;

      // Tier
      if (selectedTier !== 'ALL' && player.tier !== selectedTier) return false;

      // Overseas
      if (onlyOverseas && !player.overseas) return false;

      // Targets
      if (onlyTargets && !targetsList.includes(player.id)) return false;

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'rating') comparison = (b.rating || 0) - (a.rating || 0);
      else if (sortBy === 'basePrice') comparison = (b.basePrice || 0) - (a.basePrice || 0);
      else if (sortBy === 'name') comparison = a.name.localeCompare(b.name);

      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }, [players, searchTerm, selectedRole, selectedStatus, selectedTier, onlyOverseas, onlyTargets, sortBy, sortOrder, targetsList]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col">
      
      {/* Top Header & Search Bar */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            Player Market &amp; Auction Pool
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
              {filteredPlayers.length} / {players.length} PLAYERS
            </span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Search, filter, mark strategic targets, and call players to the hammer
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="player-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search player, role, country (Press / to search)..."
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
        {/* Role Filter */}
        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
          <button
            onClick={() => setSelectedRole('ALL')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              selectedRole === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            All Roles
          </button>
          {preset.roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                selectedRole === r.id ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
              }`}
            >
              {r.id}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Status</option>
          <option value="AVAILABLE">Available / On Deck</option>
          <option value="WON_BY_ME">Won By Me</option>
          <option value="SOLD_RIVAL">Sold to Rival</option>
          <option value="UNSOLD">Unsold</option>
        </select>

        {/* Wishlist Targets Toggle */}
        <button
          onClick={() => setOnlyTargets(prev => !prev)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
            onlyTargets
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${onlyTargets ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>Wishlist ({targetsList.length})</span>
        </button>

        {/* Overseas Filter */}
        <button
          onClick={() => setOnlyOverseas(prev => !prev)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
            onlyOverseas
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          ✈️ {preset.sport === 'cricket' ? 'Foreign' : 'Overseas'} Only
        </button>
      </div>

      {/* Main Players Grid / Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/90 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
              <th className="py-2.5 px-3 w-8">★</th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">
                  <span>Player</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('rating')}>
                <div className="flex items-center gap-1">
                  <span>Rating</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => toggleSort('basePrice')}>
                <div className="flex items-center gap-1">
                  <span>Base Price</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">Fair Val</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
            {filteredPlayers.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-slate-500">
                  No players match the selected search or filters.
                </td>
              </tr>
            ) : (
              filteredPlayers.map((player) => {
                const roleObj = preset.roles.find(r => r.id === player.role);
                const fairVal = calculateProjectedValue(player, preset);
                const isTarget = targetsList.includes(player.id);
                const isActive = activePlayerId === player.id;

                return (
                  <tr
                    key={player.id}
                    className={`transition-colors hover:bg-slate-900/70 ${
                      isActive ? 'bg-cyan-950/30 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    {/* Target Wishlist Star */}
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onToggleTarget(player.id)}
                        className="text-slate-600 hover:text-amber-400 transition"
                      >
                        <Star className={`w-3.5 h-3.5 ${isTarget ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </td>

                    {/* Player Name & Country */}
                    <td className="py-2.5 px-3 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-tight">{player.name}</span>
                        {player.overseas ? (
                          <span className="text-[10px] text-rose-300 font-mono bg-rose-500/10 px-1 rounded">✈️ {player.country}</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">{player.country}</span>
                        )}
                        {player.tier && (
                          <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">
                            {player.tier}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleObj?.border} ${roleObj?.bg} ${roleObj?.color}`}>
                        {player.role}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400 text-sm">
                      {player.rating}
                    </td>

                    {/* Base Price */}
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {preset.currency}{player.basePrice.toFixed(2)} {preset.unit}
                    </td>

                    {/* Fair Value */}
                    <td className="py-2.5 px-3 font-mono text-cyan-300">
                      {preset.currency}{fairVal.toFixed(1)} {preset.unit}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      {!player.status ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Available
                        </span>
                      ) : player.status === 'WON_BY_ME' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Won ({preset.currency}{player.boughtFor?.toFixed(1)})
                        </span>
                      ) : player.status === 'SOLD_RIVAL' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          Sold ({player.soldToTeam})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Unsold
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectPlayerForHammer(player)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto ${
                          isActive
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-200 border border-slate-700'
                        }`}
                      >
                        <Gavel className="w-3 h-3" />
                        <span>{isActive ? 'On Block' : 'Hammer'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
