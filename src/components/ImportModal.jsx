import React, { useState } from 'react';
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { detectColumns, processRawPlayerRows } from '../utils/csvNormalizer';

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

    const headers = Object.keys(rows[0]);
    const detected = detectColumns(headers, rows.slice(0, 10), preset.sport);
    const mapped = processRawPlayerRows(rows, detected, preset.sport, preset.basePriceDefault);

    if (mapped.length === 0) {
      setErrorMsg('Could not find valid player records. Please check column headers.');
      return;
    }

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

        {/* Sample Datasets */}
        <div className="mt-4">
          <div className="text-[11px] font-mono uppercase text-slate-500 mb-2 tracking-wider">
            ⚡ Quick Load — Built-in Sample Datasets
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                label: 'IPL 2024 Player Pool',
                desc: '80 real players · Batters, Bowlers, AR, WK · Indian & Foreign',
                file: '/sample-data/ipl-players-2024.csv',
                tag: 'CRICKET',
                color: 'cyan'
              }
            ].map((ds) => (
              <button
                key={ds.file}
                onClick={async () => {
                  setErrorMsg('');
                  try {
                    const res = await fetch(ds.file);
                    const text = await res.text();
                    const Papa = (await import('papaparse')).default;
                    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
                    processRawRows(result.data);
                  } catch (e) {
                    setErrorMsg('Failed to load sample: ' + e.message);
                  }
                }}
                className={`flex items-center gap-3 p-3 rounded-xl border border-${ds.color}-500/30 bg-${ds.color}-500/5 hover:bg-${ds.color}-500/10 transition text-left`}
              >
                <div className={`w-8 h-8 rounded-lg bg-${ds.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <FileSpreadsheet className={`w-4 h-4 text-${ds.color}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{ds.label}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-${ds.color}-500/20 text-${ds.color}-300 uppercase`}>
                      {ds.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{ds.desc}</div>
                </div>
                <span className={`text-[11px] font-semibold text-${ds.color}-400 flex-shrink-0`}>Load →</span>
              </button>
            ))}
          </div>
        </div>

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
