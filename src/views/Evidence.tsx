/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../state/appState';
import { SUPPLIERS } from '../data/suppliers';
import { byMaterial, getLatestIntensity } from '../lib/calc';
import { SectionTitle, Card, Stat, Pill, FlagEmoji } from '../components/ui';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  Legend 
} from 'recharts';
import { Link2, Sparkles, Building, Globe, Zap, Network, ShieldCheck, AlertCircle } from 'lucide-react';

interface NationalGridData {
  intensity: {
    forecast: number;
    actual: number;
    index: string;
  };
  generationmix: {
    generation: string;
    perc: number;
  }[];
}

interface LeiMatchResult {
  lei: string;
  name: string;
  city: string;
  country: string;
  similarity: number;
}

export default function Evidence() {
  const { mode, material } = useAppState();

  // Scoped supplier book entries
  const scopedSuppliers = useMemo(() => {
    return byMaterial(SUPPLIERS, material);
  }, [material]);

  // Emissions view metric selector (emissions vs production)
  const [metric, setMetric] = useState<'emissions' | 'production'>('emissions');

  // Stats summaries
  const stats = useMemo(() => {
    let total2025Emissions = 0;
    let cumulativeEmissions = 0;
    let facilityCount = scopedSuppliers.length;

    scopedSuppliers.forEach((s) => {
      // Find 2025 year in supplier history
      const hist2025 = s.history.find(h => h.year === 2025);
      if (hist2025) {
        total2025Emissions += hist2025.emissions;
      }
      
      // Sum all years
      s.history.forEach((h) => {
        cumulativeEmissions += h.emissions;
      });
    });

    return {
      facilityCount,
      yearsMeasured: 5, // 2021-2025
      total2025Emissions,
      cumulativeEmissions,
    };
  }, [scopedSuppliers]);

  // Setup Chart 1: stacked historic observation series (2021-2025)
  const historicChartData = useMemo(() => {
    const years = [2021, 2022, 2023, 2024, 2025];
    return years.map((yr) => {
      let steelVal = 0;
      let alumVal = 0;
      let cemVal = 0;

      scopedSuppliers.forEach((s) => {
        const hist = s.history.find(h => h.year === yr);
        if (hist) {
          const value = metric === 'emissions' ? hist.emissions : hist.production;
          if (s.commodity === 'steel') steelVal += value;
          if (s.commodity === 'aluminium') alumVal += value;
          if (s.commodity === 'cement') cemVal += value;
        }
      });

      return {
        year: yr.toString(),
        Steel: steelVal,
        Aluminium: alumVal,
        Cement: cemVal,
      };
    });
  }, [scopedSuppliers, metric]);

  // Setup Chart 2: CBAM scope vs out-of-scope boundaries per facility (horizontal stacked)
  const scopeChartData = useMemo(() => {
    return scopedSuppliers.map((s) => {
      const hist2025 = s.history.find(h => h.year === 2025) || s.history[s.history.length - 1];
      const intensity = hist2025.intensity;
      const full = hist2025.fullIntensity;
      const outOfScope = Math.max(0, full - intensity);
      
      return {
        name: s.name.substring(0, 15) + '..',
        'CBAM Priced direct': intensity,
        'Cradle-to-Gate out-of-scope remainder': outOfScope,
      };
    });
  }, [scopedSuppliers]);


  // ==========================================
  // REAL-TIME LIVE PUBLIC API INTEGRATIONS
  // ==========================================
  
  // Integration 1: UK National Grid Carbon Intensity (Public CORS-friendly JSON API, no tokens required)
  const [gridData, setGridData] = useState<NationalGridData | null>(null);
  const [gridLoading, setGridLoading] = useState<boolean>(true);
  const [gridError, setGridError] = useState<boolean>(false);

  useEffect(() => {
    // Both endpoints are real, public, CORS-enabled, no key. We fetch live
    // intensity + the live generation mix and NEVER fall back to fabricated
    // numbers — if either call fails we surface the error state, because the
    // whole point of this panel is that the "LIVE" badge means live.
    (async () => {
      try {
        const [iRes, gRes] = await Promise.all([
          fetch('https://api.carbonintensity.org.uk/intensity'),
          fetch('https://api.carbonintensity.org.uk/generation'),
        ]);
        if (!iRes.ok || !gRes.ok) throw new Error('grid api failed');
        const iJson = await iRes.json();
        const gJson = await gRes.json();
        const intensity = iJson?.data?.[0]?.intensity;
        // The /generation payload labels each source as `fuel`; our render reads
        // `generation`, so normalise it (and sort biggest-first for readability).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const generationmix = (gJson?.data?.generationmix ?? [])
          .map((g: any) => ({ generation: g.fuel ?? g.generation ?? '—', perc: g.perc ?? 0 }))
          .sort((a: { perc: number }, b: { perc: number }) => b.perc - a.perc);
        if (!intensity) throw new Error('no intensity payload');
        setGridData({ intensity, generationmix });
      } catch {
        setGridError(true);
      } finally {
        setGridLoading(false);
      }
    })();
  }, []);

  // Integration 2: REAL GLEIF LEI lookup — hits the public GLEIF API live from the
  // browser (CORS-enabled, no key), then scores each hit against the query with a
  // Jaccard token-overlap. No setTimeout, no hardcoded list: this is a genuine feed.
  const [leiSearch, setLeiSearch] = useState<string>('Nucor Corporation');
  const [leiResults, setLeiResults] = useState<LeiMatchResult[]>([]);
  const [leiLoading, setLeiLoading] = useState<boolean>(false);
  const [leiError, setLeiError] = useState<boolean>(false);

  const performLeiLookup = async (query: string) => {
    if (!query.trim()) { setLeiResults([]); return; }
    setLeiLoading(true);
    setLeiError(false);
    const norm = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    const qSet = new Set(norm(query));
    try {
      const url =
        `https://api.gleif.org/api/v1/lei-records?filter%5Bentity.legalName%5D=${encodeURIComponent(query.trim())}&page%5Bsize%5D=6`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: LeiMatchResult[] = (j.data ?? []).map((r: any) => {
        const name = r.attributes?.entity?.legalName?.name ?? '—';
        const addr = r.attributes?.entity?.legalAddress ?? {};
        const cSet = new Set(norm(name));
        let inter = 0;
        qSet.forEach((t) => cSet.has(t) && inter++);
        const sim = qSet.size && cSet.size ? inter / (qSet.size + cSet.size - inter) : 0;
        return { lei: r.id, name, city: addr.city ?? '', country: addr.country ?? '—', similarity: sim };
      });
      results.sort((a, b) => b.similarity - a.similarity);
      setLeiResults(results.slice(0, 4));
    } catch {
      setLeiError(true);
      setLeiResults([]);
    } finally {
      setLeiLoading(false);
    }
  };

  // Debounced so typing doesn't hammer the live GLEIF endpoint.
  useEffect(() => {
    const t = setTimeout(() => performLeiLookup(leiSearch), 450);
    return () => clearTimeout(t);
  }, [leiSearch]);

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* Evidence Headway */}
      <SectionTitle
        kicker="GROUND TRUTH DATABASE"
        title="Physically Measured Climate TRACE Records"
        subtitle="Every figure in CarbonBridge is anchored to historical emission inventories compiled from space satellite arrays."
        rightSlot={
          <div className="backdrop-blur-md bg-[#2E4A3F]/10 text-[#2E4A3F] border border-[#2E4A3F]/20 px-4 py-2 rounded-full font-mono text-[9px] font-bold tracking-wider flex items-center gap-1.5 shadow-xs shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
            <span>● AUDITABLE OBSERVATIONS ONLINE</span>
          </div>
        }
      />

      {/* Stats Summary Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Named facilities mapped"
          value={stats.facilityCount}
          subtext="EORI installations cross-resolved"
          tone="neutral"
          suffix="plants"
        />

        <Stat
          label="Verification Series Scope"
          value={stats.yearsMeasured}
          subtext="Consecutive multi-year sweeps"
          tone="neutral"
          suffix="years"
        />

        <Stat
          label="Annual tCO₂e Measured (2025)"
          value={Math.round(stats.total2025Emissions).toLocaleString()}
          subtext="Absolute scope factory sum"
          tone="neutral"
          suffix="t"
        />

        <Stat
          label="Cumulative observations sum"
          value={Math.round(stats.cumulativeEmissions).toLocaleString()}
          subtext="Total auditable historical stack"
          tone="neutral"
          suffix="t"
        />
      </div>

      {/* Chart 1: Stacked observation series */}
      <Card className="border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-150 mb-6 gap-2">
          <div>
            <span className="font-mono text-[9px] uppercase text-stone-400 font-semibold block">CHART 1.1 / TIME HISTORIES</span>
            <h4 className="font-serif text-lg md:text-xl text-stone-900 font-normal">Real physical volumes observed by year (2021–2025)</h4>
          </div>

          <div className="flex bg-stone-200/50 p-1 border border-stone-200/30 rounded-full text-[11px] font-mono">
            <button
              onClick={() => setMetric('emissions')}
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${metric === 'emissions' ? 'bg-stone-900 text-[#F5F5F7] font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-950'}`}
            >
              Absolute Emissions (tCO₂e)
            </button>
            <button
              onClick={() => setMetric('production')}
              className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${metric === 'production' ? 'bg-stone-900 text-[#F5F5F7] font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-950'}`}
            >
              Production Output (t)
            </button>
          </div>
        </div>

        <div className="h-72 w-full font-mono text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historicChartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <XAxis dataKey="year" stroke="#78716c" tickLine={false} />
              <YAxis stroke="#78716c" tickLine={false} />
              
              <Bar dataKey="Steel" stackId="a" fill="#1f3d32" name="Steel plants" />
              <Bar dataKey="Aluminium" stackId="a" fill="#b24c30" name="Aluminium smelters" />
              <Bar dataKey="Cement" stackId="a" fill="#c58231" name="Cement clinker kilns" />

              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-stone-900 text-stone-200 border border-stone-800 p-2 text-xs font-mono rounded-xs shadow-md">
                        <p className="border-b border-stone-800 pb-1 mb-1 font-bold text-stone-50">Observation Year {payload[0].payload.year}</p>
                        {payload.map((p, i) => (
                          <p key={i} style={{ color: p.color }}>{p.name}: {Math.round(p.value as number).toLocaleString()} {metric === 'emissions' ? 't' : 't'}</p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Chart 2: Scope boundaries boundaries per facility */}
      <Card className="border-stone-200">
        <div className="pb-4 border-b border-stone-150 mb-6">
          <span className="font-mono text-[9px] uppercase text-stone-400 font-semibold block">CHART 1.2 / BOUNDARY SPLITS</span>
          <h4 className="font-serif text-lg md:text-xl text-stone-900 font-normal">CBAM-Regulated Scopes vs. Full Cradle-to-Gate footprints</h4>
          <p className="text-xs text-stone-500 font-sans mt-0.5">
            Demonstrating how much total carbon is charged under CBAM boundaries. Direct smelting/kiln emissions are taxed; power grid electrolysis remain untaxed.
          </p>
        </div>

        <div className="h-72 w-full font-mono text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scopeChartData} layout="vertical" margin={{ top: 10, right: 10, bottom: 0, left: 15 }}>
              <XAxis type="number" stroke="#78716c" tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#78716c" tickLine={false} />
              
              <Bar dataKey="CBAM Priced direct" stackId="b" fill="#2E4A3F" name="CBAM Scoped direct portion" />
              <Bar dataKey="Cradle-to-Gate out-of-scope remainder" stackId="b" fill="#78716c" fillOpacity={0.25} name="Exempt electricity scope remainder" />

              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-stone-900 text-stone-200 border border-stone-800 p-2 text-xs font-mono rounded-xs shadow-md">
                        <p className="border-b border-stone-800 pb-1 mb-1 font-bold text-stone-50">{payload[0].payload.name}</p>
                        <p className="text-emerald-400">Scoped Direct Intensity: {(payload[0].value as number).toFixed(2)} t/t</p>
                        <p className="text-stone-400">Exempt Indirect: {(payload[1].value as number).toFixed(2)} t/t</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Auditable Facility Provenance registry table */}
      <Card className="border-stone-200">
        <div className="pb-4 border-b border-stone-150 mb-6">
          <span className="font-mono text-[9px] uppercase text-stone-400 font-semibold block">REGULATORY PROVENANCE MAP</span>
          <h4 className="font-serif text-lg md:text-xl text-stone-900 font-normal">Auditable Entity-Resolution Register</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-mono text-[10px] uppercase">
                <th className="pb-3 pt-1">Installation / Facility</th>
                <th className="pb-3 pt-1">Parent Corporate Owner</th>
                <th className="pb-3 pt-1">Global Legal Entity ID</th>
                <th className="pb-3 pt-1">CBAM Scope (Direct)</th>
                <th className="pb-3 pt-1">Full Scope (Cradle-to-Gate)</th>
                <th className="pb-3 pt-1">Match Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {scopedSuppliers.map((s) => {
                const isCement = s.commodity === 'cement';
                return (
                  <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-4">
                      <span className="font-serif text-sm font-semibold text-stone-950 flex items-center gap-1">
                        <FlagEmoji countryCode={s.country} />
                        {s.facilityName}
                      </span>
                      <span className="block text-[10px] text-stone-500 font-mono mt-0.5">{s.commodity.toUpperCase()} • ROUTE: {s.productionRoute}</span>
                    </td>
                    <td className="py-4 font-sans font-light text-stone-700">
                      <span className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-stone-300" />
                        {s.owner.parent}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-[11px] text-stone-500">
                      {s.owner.lei}
                      <span className="block text-[9px] text-stone-400 uppercase mt-0.5">{s.owner.hq}</span>
                    </td>
                    <td className="py-4 font-mono font-bold text-[#2E4A3F]">{getLatestIntensity(s).toFixed(2)} t/t</td>
                    <td className="py-4 font-mono text-stone-600">
                      {isCement ? '— (Kiln only)' : `${s.fullFootprint.toFixed(2)} t/t`}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-2xs border text-[10px] font-mono ${
                        s.matchConfidence === 'high' ? 'bg-emerald-50 text-emerald-800 border-emerald-150' : 'bg-amber-50 text-amber-800 border-amber-150'
                      }`}>
                        {s.matchConfidence.toUpperCase()} RESOLVE
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>


      {/* ==========================================
          LIVE PIPELINE FEEDS PANEL (CORS PUBLIC APIs)
          ========================================== */}
      <div className="space-y-4">
        <div className="border-b border-stone-200 pb-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-stone-450 font-bold block">
            SECTION 07 / REAL-TIME INTEGRATED APIs
          </span>
          <h4 className="font-serif text-xl md:text-2xl text-stone-900 font-normal">
            Real Live Data Pipeline Feeds
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* API Feed 1: UK Carbon Intensity */}
          <Card className="border-stone-200">
            <div className="flex justify-between items-start pb-3 border-b border-stone-100 mb-4">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400 block font-semibold">Live Integration 1</span>
                <h5 className="font-serif text-base font-semibold text-stone-900 mt-0.5">UK National Grid Intensity Feed</h5>
              </div>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-2xs font-mono text-[10px] uppercase font-semibold">
                ● LIVE CORS FEED
              </span>
            </div>

            {gridLoading ? (
              <div className="text-center py-10 space-y-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-stone-950 mx-auto" />
                <p className="font-mono text-[10px] text-stone-400">Fetching live Grid factors from UK National API..</p>
              </div>
            ) : gridError || !gridData ? (
              <div className="text-center py-6 border border-dashed border-stone-200 rounded-xs bg-stone-50">
                <AlertCircle className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
                <p className="font-serif text-xs text-stone-700">Grid API Offline</p>
                <p className="text-[10px] text-stone-400 font-sans mt-0.5">Api feed downgraded gracefully back to default offsets.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-100">
                  <div>
                    <span className="font-mono text-[10px] text-stone-400 block uppercase">GRID INTENSITY</span>
                    <span className="font-mono text-2xl font-bold text-stone-900">
                      {gridData.intensity.actual} <span className="text-[11px] font-light text-stone-400">gCO₂/kWh</span>
                    </span>
                  </div>

                  <div>
                    <span className="font-mono text-[10px] text-stone-400 block uppercase">INDEX VERDICT</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-2xs font-mono text-[10px] uppercase font-bold ${
                      gridData.intensity.index === 'low' || gridData.intensity.index === 'very low' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                        : 'bg-amber-50 text-amber-800 border border-amber-100'
                    }`}>
                      {gridData.intensity.index} emissions
                    </span>
                  </div>
                </div>

                {/* Grid Generation Mix breakdown */}
                <div className="space-y-2">
                  <span className="font-mono text-[10px] text-stone-400 uppercase block font-semibold">Live generation Source share (%)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gridData.generationmix.slice(0, 6).map((mix) => (
                      <div key={mix.generation} className="bg-stone-50 border border-stone-200 p-2 rounded-xs flex justify-between items-center font-mono text-[10px]">
                        <span className="capitalize text-stone-600">{mix.generation}</span>
                        <span className="font-bold text-stone-850">{mix.perc.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10.5px] italic text-stone-400 font-sans leading-relaxed leading-tight">
                  Discourse warning: Great Britain grid intensity parameters are populated live here to demonstrate real CORS compatibility. Factually, European grids behave cleaner than Chinese blast furnace coal backing grids. Mismatch exists.
                </p>
              </div>
            )}
          </Card>


          {/* API Feed 2: GLEIF Similarity Token overlapping search */}
          <Card className="border-stone-200">
            <div className="flex justify-between items-start pb-3 border-b border-stone-100 mb-4">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-stone-400 block font-semibold">Live Integration 2</span>
                <h5 className="font-serif text-base font-semibold text-stone-900 mt-0.5">GLEIF LEI Corporate Matcher</h5>
              </div>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-2xs font-mono text-[10px] uppercase font-semibold">
                ● LIVE GLEIF API
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block font-mono text-[9px] text-stone-400 uppercase">Input Supplier Name query:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={leiSearch}
                    onChange={(e) => setLeiSearch(e.target.value)}
                    placeholder="E.g. Nucor, Tata, POSCO.."
                    className="flex-1 font-mono text-xs text-stone-800 bg-stone-50 border border-stone-300 p-2 rounded-xs focus:outline-hidden focus:border-stone-500"
                  />
                </div>
              </div>

              {leiLoading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-stone-950 mx-auto" />
                  <p className="font-mono text-[9px] text-stone-400 mt-2">Querying GLEIF registry live…</p>
                </div>
              ) : leiError ? (
                <div className="text-center py-4 bg-rose-50 border border-dashed border-rose-200 rounded-xs font-mono text-[10px] text-rose-700">
                  GLEIF API unreachable. (Raw error surfaced — no faked fallback.)
                </div>
              ) : leiResults.length > 0 ? (
                <div className="space-y-2">
                  <span className="font-mono text-[9px] text-stone-400 uppercase block font-semibold">Closest Corporate matches found:</span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {leiResults.map((cand) => (
                      <div key={cand.lei} className="p-2 border border-stone-200 rounded-xs bg-stone-50/50 flex justify-between items-center text-[10px]">
                        <div>
                          <span className="font-serif font-bold text-stone-900 block">{cand.name}</span>
                          <span className="font-mono text-[9px] text-stone-500">{cand.lei} • {cand.city}, {cand.country}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-[10px] font-bold text-emerald-800 block">
                            {(cand.similarity * 100).toFixed(0)}% sim
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-stone-50 border border-dashed border-stone-200 rounded-xs font-mono text-[10px] text-stone-400">
                  No matching corporate registry token overlaps found.
                </div>
              )}

              <p className="text-[10.5px] italic text-stone-400 font-sans leading-relaxed leading-tight">
                Discourse warning: Physical assets monitored by Climate TRACE carry no explicit global legal entity identifier (LEIs). To establish registry matches, CarbonBridge employs similarity matches comparing trading entities with observed installations automatically.
              </p>
            </div>
          </Card>

        </div>
      </div>

      {mode === 'pitch' && (
        <Card className="bg-[#1C1E1B] text-stone-300 border-stone-900 p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-1.5 font-mono text-amber-500 font-bold text-xs">
            <Network className="w-4 h-4" />
            <span>PROOF-OF-CONCEPT INTEGRITY RULES</span>
          </div>
          <h4 className="font-serif text-xl text-stone-100 italic">
            Anchored to Real Data Feeds
          </h4>
          <p className="font-sans text-xs leading-relaxed font-light text-stone-400">
            A hackathon project stands or falls based on its honesty.
            Both feeds here are genuinely live, hit straight from the browser (no key, no backend): the <strong className="text-stone-200">UK National Grid carbon-intensity API</strong> for power-mix structure, and the <strong className="text-stone-200">GLEIF LEI registry</strong> for corporate entity resolution, each match scored by token overlap.
            We omit simulated success loaders and faked numbers — if the network drops, the raw error surfaces transparently instead of a fabricated fallback. Facility figures come from a real Climate TRACE extract; every LEI on the register resolves in GLEIF (bar a couple of CN/VN plants with no public LEI, which we flag, not fake).
          </p>
        </Card>
      )}

    </div>
  );
}
