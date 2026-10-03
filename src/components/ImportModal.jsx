import React, { useState } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function ImportModal({
  isOpen,
  onClose,
  onImportPlayers,
  preset
}) {
  const [fileData, setFileData] = useState(null);
  const [parsedPlayers, setParsedPlayers] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processRawRows(results.data);
        },
        error: (err) => {
          setErrorMsg('Failed to parse CSV file: ' + err.message);
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          processRawRows(data);
        } catch (err) {
          setErrorMsg('Failed to read Excel file: ' + err.message);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setErrorMsg('Please upload a .csv or .xlsx / .xls file.');
    }
  };

  const processRawRows = (rows) => {
    if (!rows || rows.length === 0) {
      setErrorMsg('No data rows found in this file.');
      return;
    }

    const mapped = rows.map((row, index) => {
      // Find key matching roughly "name", "player", "player name"
      const nameKey = Object.keys(row).find(k => /name|player/i.test(k)) || Object.keys(row)[0];
      const roleKey = Object.keys(row).find(k => /role|category|position|pos/i.test(k));
      const ratingKey = Object.keys(row).find(k => /rating|ovr|points|score/i.test(k));
      const priceKey = Object.keys(row).find(k => /price|base|baseprice|cost/i.test(k));
      const countryKey = Object.keys(row).find(k => /country|nat|nationality/i.test(k));
      const overseasKey = Object.keys(row).find(k => /overseas|foreign|os/i.test(k));

      const rawRole = roleKey ? String(row[roleKey]).trim().toUpperCase() : 'BAT';
      const rawPrice = priceKey ? parseFloat(String(row[priceKey]).replace(/[^0-9.]/g, '')) : preset.basePriceDefault;
      const rawRating = ratingKey ? parseInt(String(row[ratingKey]).replace(/[^0-9]/g, ''), 10) : 85;
      const isOverseas = overseasKey 
        ? /yes|true|y|1/i.test(String(row[overseasKey])) 
        : countryKey ? !/india/i.test(String(row[countryKey])) : false;

      return {
        id: `imp-${Date.now()}-${index}`,
        name: row[nameKey] ? String(row[nameKey]).trim() : `Player ${index + 1}`,
        role: rawRole || 'BAT',
        country: countryKey ? String(row[countryKey]).trim() : (isOverseas ? 'Overseas' : 'Domestic'),
        overseas: isOverseas,
        rating: isNaN(rawRating) || rawRating <= 0 ? 85 : rawRating,
        basePrice: isNaN(rawPrice) || rawPrice <= 0 ? preset.basePriceDefault : rawPrice,
        tier: 'Uploaded',
        status: null
      };
    }).filter(p => p.name && p.name.length > 1);

    setParsedPlayers(mapped);
  };

  const handleConfirmImport = () => {
    if (parsedPlayers.length === 0) return;
    onImportPlayers(parsedPlayers, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Import Tournament Player Pool</h3>
            <p className="text-xs text-slate-400">
              Upload the Excel or CSV file provided by competition organizers
            </p>
          </div>
        </div>

        {/* Dropzone */}
        <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/50 hover:bg-slate-900">
          <Upload className="w-10 h-10 text-cyan-400 mb-3 animate-bounce" />
          <span className="text-sm font-semibold text-white mb-1">
            Click to upload or drag &amp; drop
          </span>
          <span className="text-xs text-slate-400">
            Supports CSV, XLSX, XLS spreadsheets
          </span>
          <input
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Preview Section */}
        {parsedPlayers.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Parsed {parsedPlayers.length} Players Successfully
              </span>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Replace current pool</span>
              </label>
            </div>

            {/* Quick sample preview */}
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-xs divide-y divide-slate-800/60">
              {parsedPlayers.slice(0, 5).map((p, idx) => (
                <div key={idx} className="py-1.5 flex justify-between items-center text-slate-300">
                  <span className="font-semibold text-white">{p.name}</span>
                  <div className="flex gap-2 font-mono text-[11px]">
                    <span className="text-cyan-400">{p.role}</span>
                    <span className="text-amber-400">★ {p.rating}</span>
                    <span className="text-slate-400">{preset.currency}{p.basePrice}</span>
                  </div>
                </div>
              ))}
              {parsedPlayers.length > 5 && (
                <div className="py-1 text-center text-slate-500 text-[10px]">
                  + {parsedPlayers.length - 5} more players...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedPlayers.length === 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
              parsedPlayers.length > 0
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-glow-cyan'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Load into War Room
          </button>
        </div>

      </div>
    </div>
  );
}
