'use client';
import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Eye, Edit2, MoreHorizontal } from 'lucide-react';
import { fetchProspectors, type ProspectorRow } from '@/lib/services/adminDashboardService';

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    active: 'bg-success/15 text-success border-success/25',
    idle: 'bg-warning/15 text-warning border-warning/25',
    offline: 'bg-danger/15 text-danger border-danger/25',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-full border ${styles[status] || styles.offline}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'active' ? 'bg-success' : status === 'idle' ? 'bg-warning' : 'bg-danger'
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default function AdminProspectorTable() {
  const [prospectors, setProspectors] = useState<ProspectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<keyof ProspectorRow>('todaySales');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchProspectors()
      .then((data) => setProspectors(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = prospectors
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase()) ||
        p.region.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  const handleSort = (col: keyof ProspectorRow) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedRows((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))
    );
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="inline-flex flex-col ml-1">
      <ChevronUp size={10} className={sortCol === col && sortDir === 'asc' ? 'text-primary' : 'text-border'} />
      <ChevronDown size={10} className={sortCol === col && sortDir === 'desc' ? 'text-primary' : 'text-border'} />
    </span>
  );

  return (
    <div className="bg-card border border-border rounded-xl card-glow overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="text-base font-600 text-foreground">Prospector Activity</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? 'Loading agents…' : `${filtered.length} agents · Today`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-input border border-border rounded-md px-3 py-2">
            <Search size={13} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-40"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-4 px-5 py-3 bg-primary/10 border-b border-primary/20 animate-slide-up">
          <span className="text-sm font-600 text-primary">{selectedRows.size} selected</span>
          <button className="text-xs font-500 text-foreground hover:text-primary transition-colors duration-150">Issue Tokens</button>
          <button className="text-xs font-500 text-foreground hover:text-primary transition-colors duration-150">Export Selected</button>
          <button className="text-xs font-500 text-danger hover:text-danger/80 transition-colors duration-150">Suspend</button>
          <button
            onClick={() => setSelectedRows(new Set())}
            className="ml-auto text-xs font-500 text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`skel-row-${i}`} className="h-10 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Search size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-500 text-foreground mb-1">No prospectors found</p>
          <p className="text-xs text-muted-foreground">
            {prospectors.length === 0
              ? 'No prospector accounts exist yet in the system.' :'Try adjusting your search or filter.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto scrollbar-gold">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="accent-primary"
                  />
                </th>
                {[
                  { key: 'code', label: 'Agent Code' },
                  { key: 'name', label: 'Name' },
                  { key: 'region', label: 'Region' },
                  { key: 'team', label: 'Team' },
                  { key: 'todaySales', label: "Today's Sales" },
                  { key: 'tokens', label: 'Tokens Used' },
                  { key: 'cashVolume', label: 'Cash Volume' },
                  { key: 'commission', label: 'Commission' },
                  { key: 'status', label: 'Status' },
                  { key: 'lastSeen', label: 'Last Seen' },
                ].map((col) => (
                  <th
                    key={`th-${col.key}`}
                    onClick={() => handleSort(col.key as keyof ProspectorRow)}
                    className="px-4 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors duration-150 whitespace-nowrap"
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const isSelected = selectedRows.has(p.id);
                const targetPct = Math.min(100, Math.round((p.todaySales / p.target) * 100));
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border/50 transition-colors duration-100 group ${
                      isSelected ? 'bg-primary/5' : idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                    } hover:bg-primary/5`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(p.id)}
                        className="accent-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-600 font-mono-data text-primary">{p.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full gold-gradient-bg flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-700 text-primary-foreground">
                            {p.name.split(' ').map((n) => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-500 text-foreground whitespace-nowrap">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.region}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.team}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-600 font-mono-data text-foreground">{p.todaySales}</span>
                        <div className="flex-1 h-1 rounded-full bg-muted min-w-[40px]">
                          <div
                            className={`h-full rounded-full ${targetPct >= 80 ? 'bg-success' : targetPct >= 50 ? 'bg-warning' : 'bg-danger'}`}
                            style={{ width: `${targetPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{targetPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono-data text-foreground">{p.tokens}</td>
                    <td className="px-4 py-3 text-sm font-600 font-mono-data text-foreground">{p.cashVolume}</td>
                    <td className="px-4 py-3 text-sm font-600 font-mono-data text-success">{p.commission}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{p.lastSeen}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button title="View profile" className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150">
                          <Eye size={14} />
                        </button>
                        <button title="Edit agent" className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150">
                          <Edit2 size={14} />
                        </button>
                        <button title="More actions" className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Showing {filtered.length} of {prospectors.length} agents
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((page) => (
              <button
                key={`page-${page}`}
                className={`w-7 h-7 rounded-md text-xs font-600 transition-all duration-150 ${
                  page === 1
                    ? 'gold-gradient-bg text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}