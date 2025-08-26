import React, { useState, useEffect } from 'react';
import { Search, BarChart3, Award, Target, Trophy, Users, Calendar, Database, Loader, AlertCircle, SortAsc } from 'lucide-react';

const Top100Archive = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [selectedSeason, setSelectedSeason] = useState('25');
  const [selectedDivision, setSelectedDivision] = useState('1');
  const [sortBy, setSortBy] = useState('position');
  const [allPositionData, setAllPositionData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Config
  const SHEET_ID = process.env.REACT_APP_SHEET_ID || '17-BZlcYuAQCfUV5gxAzS93Dsy6bq8mk_yRat88R5t-w';
  const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';
  const SHEET_RANGE = 'Sorted by team!A:R';

  useEffect(() => {
    loadFromGoogleSheets();
  }, []);

  const loadFromGoogleSheets = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      const data = await response.json();
      if (!data.values || data.values.length === 0) throw new Error('No data found in the sheet');

      const [headerRow, ...rows] = data.values;
      const norm = (s) => String(s || '').trim().toLowerCase();
      const idx = (names) => {
        const candidates = Array.isArray(names) ? names : [names];
        const i = headerRow.findIndex(h => candidates.includes(norm(h)));
        return i === -1 ? null : i;
      };

      const cSeason   = idx(['season']);
      const cDivision = idx(['div','division']);
      const cPosition = idx(['pos','position']);
      const cTeam     = idx(['team']);
      const cPlayed   = idx(['p','played']);
      const cWon      = idx(['w','won']);
      const cDrawn    = idx(['d','drawn']);
      const cLost     = idx(['l','lost']);
      const cGF       = idx(['gf']);
      const cGA       = idx(['ga']);
      const cGD       = idx(['gd']);
      const cPoints   = idx(['pts','points']);
      const cStart    = idx(['start date']);
      const cManager  = idx(['manager']);

      const get = (row, i) => (i == null ? '' : String(row[i] ?? '').trim());

      const formattedData = rows
        .filter(row => get(row, cSeason) && get(row, cTeam))
        .map(row => ({
          season:          get(row, cSeason),
          division:        get(row, cDivision),
          position:        get(row, cPosition),
          team:            get(row, cTeam),
          played:          get(row, cPlayed),
          won:             get(row, cWon),
          drawn:           get(row, cDrawn),
          lost:            get(row, cLost),
          goals_for:       get(row, cGF),
          goals_against:   get(row, cGA),
          goal_difference: get(row, cGD),
          points:          get(row, cPoints),
          start_date:      get(row, cStart),
          manager:         get(row, cManager),
        }));

      setAllPositionData(formattedData);
      setDataLoaded(true);
      const latestSeason = Math.max(...formattedData.map(r => parseInt(r.season) || 0)).toString();
      setSelectedSeason(latestSeason);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Status logic
  const getTeamTags = (position, division) => {
    const pos = parseInt(position || 0, 10);
    const div = parseInt(division || 0, 10);
    const tags = [];

    if (pos === 1) tags.push({ label: 'Champions', style: 'bg-yellow-100 text-yellow-800 border border-yellow-300' });
    if (div === 1 && pos >= 2 && pos <= 4) tags.push({ label: 'SMFA Champions Cup', style: 'bg-purple-100 text-purple-800 border border-purple-300' });
    if (div === 1 && pos >= 5 && pos <= 10) tags.push({ label: 'SMFA Shield', style: 'bg-indigo-100 text-indigo-800 border border-indigo-300' });
    if (div >= 2 && div <= 5 && (pos === 2 || pos === 3)) tags.push({ label: 'Auto-Promoted', style: 'bg-green-100 text-green-800 border border-green-300' });
    if (div >= 2 && div <= 5 && pos >= 4 && pos <= 7) tags.push({ label: 'Playoffs', style: 'bg-blue-100 text-blue-800 border border-blue-300' });
    if (div >= 1 && div <= 4 && pos >= 17 && pos <= 20) tags.push({ label: 'Relegated', style: 'bg-red-100 text-red-800 border border-red-300' });
    if (pos >= 18 && pos <= 20) tags.push({ label: 'Auto-Sacked', style: 'bg-rose-200 text-rose-900 border border-rose-400' });

    return tags;
  };

  const getRowStyling = (position, division) => {
    const pos = parseInt(position || 0, 10);
    const div = parseInt(division || 0, 10);

    if (pos >= 18 && pos <= 20) return 'bg-rose-50 border-l-4 border-rose-700 ring-1 ring-rose-200 hover:bg-rose-100';
    if (div >= 1 && div <= 4 && pos >= 17 && pos <= 20) return 'bg-red-50 border-l-4 border-red-700 ring-1 ring-red-200 hover:bg-red-100';
    if (pos === 1) return 'bg-yellow-50 border-l-4 border-yellow-500 ring-1 ring-yellow-200 hover:bg-yellow-100';
    if (div >= 2 && div <= 5 && (pos === 2 || pos === 3)) return 'bg-green-50 border-l-4 border-green-600 ring-1 ring-green-200 hover:bg-green-100';
    if (div >= 2 && div <= 5 && pos >= 4 && pos <= 7) return 'bg-blue-50 border-l-4 border-blue-600 ring-1 ring-blue-200 hover:bg-blue-100';
    return 'bg-white hover:bg-gray-50';
  };

  const getPositionBadge = (position, division) => {
    const pos = parseInt(position);
    const div = parseInt(division);
    if (pos === 1) return { bg: 'bg-yellow-400 text-white', icon: '👑' };
    if (div === 1 && pos >= 2 && pos <= 4) return { bg: 'bg-purple-500 text-white', icon: '🏆' };
    if (div === 1 && pos >= 5 && pos <= 10) return { bg: 'bg-indigo-500 text-white', icon: '🛡️' };
    if (div >= 2 && div <= 5 && (pos === 2 || pos === 3)) return { bg: 'bg-green-500 text-white', icon: '⬆️' };
    if (div >= 2 && div <= 5 && pos >= 4 && pos <= 7) return { bg: 'bg-blue-500 text-white', icon: '🎟️' };
    if (div >= 1 && div <= 4 && pos >= 17 && pos <= 20) return { bg: 'bg-red-600 text-white', icon: '⬇️' };
    if (pos >= 18 && pos <= 20) return { bg: 'bg-rose-700 text-white', icon: '⛔' };
    return { bg: 'bg-gray-200 text-gray-800', icon: '' };
  };

  const getFilteredData = (season, division, sortOrder) => {
    let filtered = [...allPositionData];
    if (season) filtered = filtered.filter(r => (r.season || '').trim() === (season || '').trim());
    if (division) filtered = filtered.filter(r => (r.division || '').trim() === (division || '').trim());

    switch(sortOrder) {
      case 'points': return filtered.sort((a, b) => parseInt(b.points||0)-parseInt(a.points||0));
      case 'team': return filtered.sort((a, b) => a.team.localeCompare(b.team));
      case 'manager': return filtered.sort((a, b) => (a.manager||'').localeCompare(b.manager||''));
      default: return filtered.sort((a, b) => parseInt(a.position||0)-parseInt(b.position||0));
    }
  };

  const availableSeasons = [...new Set(allPositionData.map(r => (r.season||'').trim()))].filter(Boolean).sort((a,b)=>b.localeCompare(a));
  const availableDivisions = [...new Set(allPositionData.filter(r => (r.season||'').trim() === (selectedSeason||'').trim()).map(r => (r.division||'').trim()))].filter(Boolean).sort();

  // Search results
  const SearchResults = () => {
    const filtered = allPositionData.filter(team =>
      team.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (team.manager && team.manager.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => {
      const seasonCompare = parseInt(b.season) - parseInt(a.season);
      if (seasonCompare !== 0) return seasonCompare;
      const divCompare = parseInt(a.division) - parseInt(b.division);
      if (divCompare !== 0) return divCompare;
      return parseInt(a.position) - parseInt(b.position);
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">Search Results</h3>
            <p className="text-gray-600">{filtered.length} records found</p>
          </div>
        </div>
        <div className="grid gap-4">
          {filtered.map((team, i) => {
            const badge = getPositionBadge(team.position, team.division);
            return (
              <div key={i} className={`${getRowStyling(team.position, team.division)} rounded-xl p-6 shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold">{team.team}</h4>
                    <p className="text-sm text-gray-500">Manager: {team.manager || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">Season {team.season} D{team.division}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.bg}`}>{badge.icon} #{team.position}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const LeagueTable = () => {
    const tableData = getFilteredData(selectedSeason, selectedDivision, sortBy);
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <h3 className="text-2xl font-bold">Season {selectedSeason} - Division {selectedDivision}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th>Pos</th><th>Team</th><th>P</th><th>Pts</th></tr></thead>
            <tbody>
              {tableData.map((team,i)=>{
                const badge = getPositionBadge(team.position, team.division);
                const tags = getTeamTags(team.position, selectedDivision);
                return (
                  <tr key={i} className={getRowStyling(team.position, selectedDivision)}>
                    <td><span className={`px-2 py-1 rounded-full font-bold ${badge.bg}`}>{badge.icon} {team.position}</span></td>
                    <td>{team.team}<br/><small>{team.manager||'Unknown'}</small>
                      {tags.length>0 && <div className="mt-1 flex flex-wrap gap-1">
                        {tags.map((t,j)=><span key={j} className={`px-1 rounded text-xs ${t.style}`}>{t.label}</span>)}
                      </div>}
                    </td>
                    <td>{team.played}</td>
                    <td>{team.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* nav */}
      <div className="p-4 flex gap-4 bg-white shadow">
        <button onClick={()=>setActiveTab('search')}>Search</button>
        <button onClick={()=>setActiveTab('tables')}>Tables</button>
      </div>
      <div className="p-4">
        {activeTab==='search' && <SearchResults />}
        {activeTab==='tables' && <LeagueTable />}
      </div>
    </div>
  );
};

export default Top100Archive;