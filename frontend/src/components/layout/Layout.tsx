import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";
import { BarChart3, Bot, Moon, Sun, Plus, Trash2, Pencil, MessageSquare, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useDarkMode } from "@/hooks/useDarkMode";
import { api, type SessionItem } from "@/lib/api";
import { useAgentStore } from "@/stores/agent";
import { ConnectionBanner } from "@/components/layout/ConnectionBanner";

const NAV = [
  { to: "/", icon: BarChart3, key: "home" as const },
  { to: "/agent", icon: Bot, key: "agent" as const },
];

export function Layout() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const { dark, toggle } = useDarkMode();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const sseStatus = useAgentStore(s => s.sseStatus);
  const sseRetryAttempt = useAgentStore(s => s.sseRetryAttempt);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("qa-sidebar") === "collapsed");

  const activeSessionId = searchParams.get("session");

  useEffect(() => {
    localStorage.setItem("qa-sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  const loadSessions = () => {
    api.listSessions()
      .then((list) => setSessions(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  };

  // Load sessions on mount. Also refresh when navigating TO /agent or when
  // the active session changes (covers new session creation from Agent).
  const isAgentPage = pathname.startsWith("/agent");
  useEffect(() => { loadSessions(); }, [isAgentPage, activeSessionId]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const deleteSession = async (sid: string) => {
    try {
      await api.deleteSession(sid);
      setSessions((prev) => prev.filter((s) => s.session_id !== sid));
    } catch { /* ignore */ }
    setDeleteTarget(null);
  };

  const renameSession = async (sid: string) => {
    if (!renameValue.trim()) { setRenameTarget(null); return; }
    try {
      await api.renameSession(sid, renameValue.trim());
      setSessions((prev) => prev.map((s) => s.session_id === sid ? { ...s, title: renameValue.trim() } : s));
    } catch { /* ignore */ }
    setRenameTarget(null);
  };

  return (
    <div className="flex h-screen bg-transparent relative overflow-hidden font-sans">
      <div className="grid-bg" />
      
      {/* Sidebar */}
      <aside className={cn(
        "glass border-r flex flex-col shrink-0 transition-all duration-300 z-10",
        collapsed ? "w-16" : "w-72"
      )}>
        {/* Brand */}
        <div className={cn("border-b border-glass-border py-10 px-6", collapsed ? "flex justify-center" : "header-flex")}>
          <Link to="/" className={cn("flex items-center gap-6 transition-all group", collapsed ? "justify-center" : "")}>
            <div className="relative group">
              <div className="absolute -inset-2 bg-teal/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-1 rounded-full bg-blue/10 border border-blue/20 group-hover:border-blue/50 transition-all duration-300 overflow-hidden w-12 h-12 flex items-center justify-center">
                <img src="/logo_product.svg" alt="Vibe-Trading" className="h-7 w-7 shrink-0 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-display text-2xl font-black tracking-tighter text-white leading-none uppercase">
                  THESOLUTION<span className="text-teal">.AT</span> // VIBE_TRADING
                </span>
                <span className="text-[10px] font-bold text-text-faint uppercase tracking-[0.3em] flex items-center gap-2 mt-2">
                  <span className="text-white/20">—</span> DER SMARTE WEG ZU DEINEN TRADES
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className={cn("space-y-1.5 mt-6", collapsed ? "px-2" : "px-4")}>
          {NAV.map(({ to, icon: Icon, key }) => {
            const isActive = (to === "/" ? pathname === "/" : pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center rounded-xl text-sm transition-all duration-500 group relative overflow-hidden",
                  collapsed ? "justify-center p-3" : "gap-4 px-6 py-3.5",
                  isActive
                    ? "bg-teal/10 text-teal font-bold shadow-[inset_0_0_20px_rgba(125,211,192,0.05)] border border-teal/20"
                    : "text-text-muted hover:bg-white/5 hover:text-white border border-transparent"
                )}
                title={collapsed ? t[key] : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-teal shadow-[0_0_15px_rgba(125,211,192,0.8)]" />
                )}
                <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-500 group-hover:scale-110", isActive ? "text-teal" : "text-text-muted")} />
                {!collapsed && (
                  <span className="font-display tracking-widest uppercase text-[10px] font-black">{t[key]}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sessions — hidden when collapsed */}
        {!collapsed && (
          <div className="flex-1 overflow-auto border-t border-glass-border mt-8 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <span className="flex items-center gap-2 text-[10px] font-bold text-accent-purple uppercase tracking-widest opacity-80">
                <MessageSquare className="h-3.5 w-3.5" />
                {t.sessions}
              </span>
              <Link
                to="/agent"
                className="p-1.5 rounded-full bg-white/5 text-text-dim hover:bg-accent-teal hover:text-bg-dark transition-all duration-300"
                title={t.newChat}
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="px-4 pb-4 space-y-1 overflow-auto flex-1">
              {sessionsLoading ? (
                <div className="space-y-2 px-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <p className="px-4 py-4 text-[11px] text-text-dim/40 font-mono italic text-center">-- NO ACTIVE SESSIONS --</p>
              ) : null}
              {sessions.map((s) => {
                const isActive = s.session_id === activeSessionId;
                const isDeleting = deleteTarget === s.session_id;
                const isRenaming = renameTarget === s.session_id;
                return (
                  <div key={s.session_id} className="group relative flex items-center">
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") renameSession(s.session_id); if (e.key === "Escape") setRenameTarget(null); }}
                        onBlur={() => renameSession(s.session_id)}
                        className="flex-1 min-w-0 px-4 py-2 rounded-lg text-[11px] border border-accent-blue bg-black/40 outline-none font-mono"
                      />
                    ) : (
                      <Link
                        to={`/agent?session=${s.session_id}`}
                        className={cn(
                          "flex-1 min-w-0 px-4 py-2.5 rounded-lg text-[11px] transition-all duration-300 truncate block font-mono border border-transparent",
                          isActive
                            ? "bg-accent-blue/10 text-accent-blue border-accent-blue/30 font-bold"
                            : "text-text-dim hover:bg-white/5 hover:text-white"
                        )}
                        title={s.title || s.session_id}
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0 shadow-[0_0_5px_currentColor]",
                            s.status === "failed" ? "text-danger bg-danger" : isActive ? "text-warning bg-warning" : "text-accent-teal bg-accent-teal"
                          )} />
                          {s.title || s.session_id.slice(0, 16)}
                        </span>
                      </Link>
                    )}
                    {!isRenaming && isDeleting ? (
                      <div className="absolute right-1 flex items-center gap-1 bg-bg-dark/95 p-1 rounded-lg border border-danger/50 backdrop-blur-md shadow-lg z-20">
                        <button onClick={() => deleteSession(s.session_id)} className="px-2.5 py-1.5 bg-danger text-white hover:bg-danger/80 rounded text-[9px] font-black uppercase tracking-tighter transition-colors">{t.confirmDelete}</button>
                        <button onClick={() => setDeleteTarget(null)} className="px-2.5 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded text-[9px] font-black uppercase tracking-tighter transition-colors">{t.cancelDelete}</button>
                      </div>
                    ) : !isRenaming ? (
                      <div className="absolute right-2 opacity-30 group-hover:opacity-100 flex items-center gap-1 transition-all duration-300">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenameTarget(s.session_id); setRenameValue(s.title || ""); }}
                          className="p-1.5 text-text-dim hover:text-accent-blue hover:bg-accent-blue/15 rounded-lg border border-transparent hover:border-accent-blue/20 transition-all"
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(s.session_id); }}
                          className="p-1.5 text-text-dim hover:text-danger hover:bg-danger/15 rounded-lg border border-transparent hover:border-danger/20 transition-all"
                          title={t.deleteConfirm}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Spacer when collapsed */}
        {collapsed && <div className="flex-1" />}

        {/* Footer */}
        <div className={cn("border-t border-glass-border bg-white/2", collapsed ? "p-2 flex flex-col items-center gap-3" : "p-4 space-y-3")}>
          {collapsed ? (
            <>
              <button onClick={toggle} className="p-2.5 text-text-dim hover:text-accent-teal hover:bg-white/5 rounded-lg transition-all" title={dark ? t.lightMode : t.darkMode}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button onClick={() => setCollapsed(false)} className="p-2.5 text-text-dim hover:text-accent-blue hover:bg-white/5 rounded-lg transition-all" title="Expand">
                <ChevronsRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button
                  onClick={toggle}
                  className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider text-text-dim hover:text-accent-teal transition-all"
                >
                  {dark ? <Sun className="h-4 w-4 text-accent-teal" /> : <Moon className="h-4 w-4 text-accent-blue" />}
                  {dark ? t.lightMode : t.darkMode}
                </button>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-2 text-text-dim hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  title="Collapse"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] font-mono text-text-dim/40 tracking-widest uppercase">Version 0.1.0-ALPHA</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent-teal animate-pulse shadow-[0_0_5px_rgba(125,211,192,0.8)]" />
                  <span className="text-[9px] font-bold text-accent-teal uppercase tracking-tight">System Online</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/60">v0.1.5</p>
            </>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-0">
        <ConnectionBanner status={sseStatus} retryAttempt={sseRetryAttempt} />
        <main className="flex-1 overflow-auto custom-scrollbar relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

