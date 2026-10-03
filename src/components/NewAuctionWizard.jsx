import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  FileSpreadsheet, 
  Sliders, 
  Trophy, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  RefreshCw,
  Cpu
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  CRICKET_PRESET, 
  FOOTBALL_PRESET, 
  DEFAULT_CRICKET_PLAYERS, 
  DEFAULT_FOOTBALL_PLAYERS, 
  DEFAULT_RIVALS 
} from '../data/defaultPlayers';
import { aiAnalyzePlayerTable, aiExtractTournamentRules, getStoredApiKey } from '../services/aiService';
import { processRawPlayerRows } from '../utils/csvNormalizer';

export default function NewAuctionWizard({
  isOpen,
  onClose,
  onCreateTournament,
  onOpenApiKeyModal
}) {
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState('cricket');
  const [tournamentName, setTournamentName] = useState('');
  
  // Rules
  const [preset, setPreset] = useState(CRICKET_PRESET);
  const [rawRulesText, setRawRulesText] = useState('');
  const [isExtractingRules, setIsExtractingRules] = useState(false);
  const [rulesExtractMsg, setRulesExtractMsg] = useState('');

  // Players
  const [playerSource, setPlayerSource] = useState('default'); // 'default' or 'upload'
  const [parsedPlayers, setParsedPlayers] = useState([]);
  const [aiMappingResult, setAiMappingResult] = useState(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Teams & My Team Selection
  const DEFAULT_TEAM_POOL = ['Royal Strikers', 'Alpha Kings', 'Viper Syndicate', 'Apex Warriors', 'Phoenix Titans'];
  const [numTeams, setNumTeams] = useState(5);
  const [allTeams, setAllTeams] = useState(DEFAULT_TEAM_POOL.slice(0, 5));
  const [myTeamName, setMyTeamName] = useState('Royal Strikers');
  const [newTeamInput, setNewTeamInput] = useState('');

  const handleNumTeamsChange = (delta) => {
    const next = Math.min(5, Math.max(2, numTeams + delta));
    setNumTeams(next);
    if (next > allTeams.length) {
      // Add default teams to fill up
      const extras = DEFAULT_TEAM_POOL.filter(t => !allTeams.includes(t)).slice(0, next - allTeams.length);
      const filled = [...allTeams, ...extras];
      // If still short, generate placeholders
      while (filled.length < next) filled.push(`Team ${filled.length + 1}`);
      setAllTeams(filled);
    } else if (next < allTeams.length) {
      // Trim from end — but never remove myTeam
      let trimmed = [...allTeams];
      while (trimmed.length > next) {
        const lastIdx = trimmed.length - 1;
        if (trimmed[lastIdx].trim().toLowerCase() === myTeamName.trim().toLowerCase()) {
          trimmed.splice(lastIdx - 1, 1); // remove the one before myTeam
        } else {
          trimmed.pop();
        }
      }
      setAllTeams(trimmed);
    }
  };

  if (!isOpen) return null;

  const hasApiKey = Boolean(getStoredApiKey());

  const handleSelectSport = (selected) => {
    setSport(selected);
    const newPreset = selected === 'cricket' ? CRICKET_PRESET : FOOTBALL_PRESET;
    setPreset(newPreset);
    if (!tournamentName) {
      setTournamentName(selected === 'cricket' ? 'Mock IPL Mega Auction 2026' : 'European Football Auction 2026');
    }
  };

  // AI Rule Extraction
  const handleExtractRules = async () => {
    if (!rawRulesText.trim()) return;
    setIsExtractingRules(true);
    setRulesExtractMsg('Gemini 2.5 Flash is extracting tournament rules and constraints...');
    
    const res = await aiExtractTournamentRules(rawRulesText, preset);
    setIsExtractingRules(false);

    if (res.success && res.rules) {
      setPreset(prev => ({
        ...prev,
        totalPurse: res.rules.totalPurse || prev.totalPurse,
        currency: res.rules.currency || prev.currency,
        unit: res.rules.unit || prev.unit,
        minSquad: res.rules.minSquad || prev.minSquad,
        maxSquad: res.rules.maxSquad || prev.maxSquad,
        maxOverseas: res.rules.maxOverseas || prev.maxOverseas,
        basePriceDefault: res.rules.basePriceDefault || prev.basePriceDefault
      }));
      setRulesExtractMsg(`✓ Extracted: ${res.rules.explanation || 'Rules configured successfully!'}`);
    } else {
      setRulesExtractMsg(`⚠️ ${res.error || 'Failed to extract. Please adjust inputs manually.'}`);
    }
  };

  // File Upload Handling with AI
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIsAiAnalyzing(true);
    const fileName = file.name.toLowerCase();

    const onRawDataLoaded = async (rows) => {
      if (!rows || rows.length === 0) {
        setUploadError('No data found in file.');
        setIsAiAnalyzing(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      
      // Call Gemini AI to map unknown headers
      const aiMap = await aiAnalyzePlayerTable(headers, rows.slice(0, 10), sport);
      setAiMappingResult(aiMap);

      // Process rows preserving decimal ratings and player names
      const finalPlayers = processRawPlayerRows(
        rows, 
        aiMap.columnMap, 
        sport, 
        preset.basePriceDefault
      );

      setParsedPlayers(finalPlayers);
      setIsAiAnalyzing(false);
    };

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => onRawDataLoaded(results.data),
        error: (err) => {
          setUploadError('CSV error: ' + err.message);
          setIsAiAnalyzing(false);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws);
          onRawDataLoaded(data);
        } catch (err) {
          setUploadError('Excel error: ' + err.message);
          setIsAiAnalyzing(false);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleFinish = () => {
    const finalPlayers = playerSource === 'upload' && parsedPlayers.length > 0
      ? parsedPlayers
      : (sport === 'cricket' ? DEFAULT_CRICKET_PLAYERS : DEFAULT_FOOTBALL_PLAYERS);

    // Opposing rival teams (excluding user's designated team)
    const rivalsOnly = allTeams
      .filter(t => t.trim().toLowerCase() !== myTeamName.trim().toLowerCase())
      .map((name, i) => ({
        id: `r-${Date.now()}-${i}`,
        name: name.trim(),
        purseSpent: 0,
        playersCount: 0,
        acquired: []
      }));

    const newTournament = {
      id: `tourney-${Date.now()}`,
      name: tournamentName || (sport === 'cricket' ? 'IPL Mega Auction' : 'Football Auction'),
      sport,
      preset,
      myTeamName: myTeamName.trim() || 'My Team',
      players: finalPlayers,
      mySquad: [],
      rivals: rivalsOnly,
      activePlayerId: finalPlayers[0]?.id || null,
      targetsList: [],
      updatedAt: Date.now()
    };

    onCreateTournament(newTournament);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-3xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Wizard Progress Stepper */}
        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              STEP {step} OF 4
            </span>
            <h2 className="text-xl font-black text-white">
              {step === 1 && 'Tournament Identity & Sport'}
              {step === 2 && 'Rules, Purse & Constraints'}
              {step === 3 && 'Player Pool & AI CSV Parser'}
              {step === 4 && 'Competitor Teams'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-cyan-400' : s < step ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: SPORT & IDENTITY */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-2">
                Tournament / Competition Title
              </label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="e.g. IIT Bombay Mock IPL 2026, Premier League Cup..."
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-3">
                Select Sport Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSelectSport('cricket')}
                  className={`p-5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    sport === 'cricket'
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-glow-gold'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-3xl mb-3">🏏</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Cricket / IPL Style</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Batters, Bowlers, All-rounders, Wicketkeepers, Overseas quotas, Crores purse.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSport('football')}
                  className={`p-5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    sport === 'football'
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-glow-emerald'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-3xl mb-3">⚽</span>
                  <div>
                    <h3 className="text-base font-bold text-white">Football / Soccer</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Goalkeepers, Defenders, Midfielders, Strikers, Foreign caps, Millions purse.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: RULES & CONSTRAINTS */}
        {step === 2 && (
          <div className="space-y-6">
            
            {/* AI Rule Extractor Box */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  AI Rule Extractor (Gemini 2.5)
                </span>
                {!hasApiKey && (
                  <button
                    onClick={onOpenApiKeyModal}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    API Key required
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Paste the organizer WhatsApp announcement or brochure text, and AI will configure purse &amp; squad limits automatically:
              </p>
              <textarea
                value={rawRulesText}
                onChange={(e) => setRawRulesText(e.target.value)}
                placeholder="Paste rules e.g. 'Each team has 120 Cr budget, minimum 16 players, maximum 22, max 7 overseas...'"
                rows={3}
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 italic">{rulesExtractMsg}</span>
                <button
                  type="button"
                  onClick={handleExtractRules}
                  disabled={isExtractingRules || !rawRulesText.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isExtractingRules ? 'animate-spin' : ''}`} />
                  <span>Extract with AI</span>
                </button>
              </div>
            </div>

            {/* Manual Rule Inputs */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Total Purse</label>
                <div className="flex">
                  <span className="bg-slate-800 border border-r-0 border-slate-700 px-3 py-2 text-xs rounded-l-xl text-slate-400 font-mono">
                    {preset.currency}
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={preset.totalPurse}
                    onChange={(e) => setPreset({ ...preset, totalPurse: parseFloat(e.target.value) || 100 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-r-xl px-3 py-2 text-sm text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Min Squad Slots</label>
                <input
                  type="number"
                  value={preset.minSquad}
                  onChange={(e) => setPreset({ ...preset, minSquad: parseInt(e.target.value, 10) || 15 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Mandatory roster count</span>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Max Squad Slots</label>
                <input
                  type="number"
                  value={preset.maxSquad}
                  onChange={(e) => setPreset({ ...preset, maxSquad: parseInt(e.target.value, 10) || 25 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Roster ceiling</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Max Overseas / Foreign</label>
                <input
                  type="number"
                  value={preset.maxOverseas}
                  onChange={(e) => setPreset({ ...preset, maxOverseas: parseInt(e.target.value, 10) || 8 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">Default Base Price</label>
                <input
                  type="number"
                  step="0.1"
                  value={preset.basePriceDefault}
                  onChange={(e) => setPreset({ ...preset, basePriceDefault: parseFloat(e.target.value) || 0.5 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>
            </div>

          </div>
        )}

        {/* STEP 3: PLAYERS & AI CSV PARSING */}
        {step === 3 && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPlayerSource('default')}
                className={`p-4 rounded-2xl border text-left transition ${
                  playerSource === 'default'
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-glow-cyan'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <h4 className="text-sm font-bold text-white mb-1">Pre-loaded Star Pool</h4>
                <p className="text-xs text-slate-400">
                  Use built-in vetted database of top {sport === 'cricket' ? 'IPL/Cricket' : 'European Football'} stars with ratings and base prices.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPlayerSource('upload')}
                className={`p-4 rounded-2xl border text-left transition ${
                  playerSource === 'upload'
                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-glow-cyan'
                    : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <h4 className="text-sm font-bold text-white">Upload Organizer CSV / Excel</h4>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 font-mono">
                    AI POWERED
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Drop the organizer's spreadsheet. Gemini AI automatically parses unstandardized column headers.
                </p>
              </button>
            </div>

            {playerSource === 'upload' && (
              <div className="space-y-3">
                <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-900">
                  {isAiAnalyzing ? (
                    <div className="flex flex-col items-center">
                      <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                      <span className="text-xs font-semibold text-cyan-300">
                        Gemini AI is analyzing column headers &amp; normalizing roster...
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                      <span className="text-xs font-semibold text-white">
                        Click to select or drag .csv or .xlsx file
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {uploadError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {aiMappingResult && (
                  <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      AI Mapping Complete
                    </span>
                    <p className="text-slate-400 text-[11px] mb-2">{aiMappingResult.summary}</p>
                    <div className="text-[10px] font-mono text-slate-400 flex gap-2 flex-wrap">
                      <span>Name: <strong className="text-white">{aiMappingResult.columnMap?.name}</strong></span>
                      <span>Role: <strong className="text-white">{aiMappingResult.columnMap?.role}</strong></span>
                      <span>Rating: <strong className="text-white">{aiMappingResult.columnMap?.rating || 'Auto-imputed'}</strong></span>
                      <span>Price: <strong className="text-white">{aiMappingResult.columnMap?.basePrice || 'Default'}</strong></span>
                    </div>
                  </div>
                )}

                {parsedPlayers.length > 0 && (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Loaded {parsedPlayers.length} players successfully with AI validation!</span>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* STEP 4: TEAMS & MY TEAM SELECTION */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              {/* Number of Teams Stepper */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-0.5">
                      Number of Teams in Auction
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Max 5 (including yours) · Min 2
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleNumTeamsChange(-1)}
                      disabled={numTeams <= 2}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-lg flex items-center justify-center disabled:opacity-30 transition"
                    >−</button>
                    <span className="text-3xl font-black text-white w-8 text-center">{numTeams}</span>
                    <button
                      type="button"
                      onClick={() => handleNumTeamsChange(+1)}
                      disabled={numTeams >= 5}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-lg flex items-center justify-center disabled:opacity-30 transition"
                    >+</button>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {[2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleNumTeamsChange(n - numTeams)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                        numTeams === n
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {n} Teams
                    </button>
                  ))}
                </div>
              </div>

              {/* My Team Section */}
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 mb-5 shadow-glow-cyan">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">👑</span>
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                    My Team Name (Active Squad)
                  </label>
                </div>
                <input
                  type="text"
                  value={myTeamName}
                  onChange={(e) => setMyTeamName(e.target.value)}
                  placeholder="e.g. Chennai Super Kings, IIT Bombay..."
                  className="w-full bg-slate-900 border border-cyan-500/60 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-300"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  All budget mathematics, safe bid ceilings, and roster limits will be calculated for this team.
                </p>
              </div>

              {/* Tournament Teams List */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-mono uppercase text-slate-400">
                  Teams ({allTeams.length} / {numTeams}) · {allTeams.length - 1} rival{allTeams.length - 1 !== 1 ? 's' : ''}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Click a team below to designate it as yours
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4 max-h-56 overflow-y-auto pr-1">
                {allTeams.map((teamName, idx) => {
                  const isMyTeam = teamName.trim().toLowerCase() === myTeamName.trim().toLowerCase();
                  return (
                    <div
                      key={idx}
                      onClick={() => setMyTeamName(teamName)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        isMyTeam
                          ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-bold truncate">{teamName}</span>
                        {isMyTeam ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-400 text-slate-950">
                            👑 My Team
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Rival</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isMyTeam && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMyTeamName(teamName);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            Set Mine
                          </button>
                        )}
                        {allTeams.length > 2 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const filtered = allTeams.filter((_, i) => i !== idx);
                              setAllTeams(filtered);
                              if (isMyTeam && filtered.length > 0) {
                                setMyTeamName(filtered[0]);
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Remove team"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Team Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamInput}
                  onChange={(e) => setNewTeamInput(e.target.value)}
                  placeholder={allTeams.length >= numTeams ? `Max ${numTeams} teams reached` : 'Add another college / franchise team name...'}
                  disabled={allTeams.length >= numTeams}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTeamInput.trim() && !allTeams.includes(newTeamInput.trim()) && allTeams.length < numTeams) {
                      setAllTeams([...allTeams, newTeamInput.trim()]);
                      setNewTeamInput('');
                    }
                  }}
                  disabled={allTeams.length >= numTeams || !newTeamInput.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition disabled:opacity-40"
                >
                  Add Team
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER NAVIGATION */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div></div>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-glow-cyan flex items-center gap-1.5 transition"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-glow-emerald flex items-center gap-2 transition"
            >
              <Trophy className="w-4 h-4" />
              <span>Launch Auction War Room</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

