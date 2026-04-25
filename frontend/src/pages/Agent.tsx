import { useEffect, useRef, useState, useMemo, useCallback, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Loader2, ArrowDown, CheckCircle2, Square, Download, Plus, Paperclip, X, Users } from "lucide-react";
import { toast } from "sonner";
import { useAgentStore } from "@/stores/agent";
import { useSSE } from "@/hooks/useSSE";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { AgentMessage, ToolCallEntry } from "@/types/agent";
import { AgentAvatar } from "@/components/chat/AgentAvatar";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ThinkingTimeline } from "@/components/chat/ThinkingTimeline";
import { ConversationTimeline } from "@/components/chat/ConversationTimeline";
import { SwarmDashboard, type SwarmAgent, type SwarmDashboardProps } from "@/components/chat/SwarmDashboard";

/* ---------- Message grouping ---------- */
type MsgGroup =
  | { kind: "single"; msg: AgentMessage }
  | { kind: "timeline"; msgs: AgentMessage[] };

function groupMessages(msgs: AgentMessage[]): MsgGroup[] {
  const out: MsgGroup[] = [];
  let buf: AgentMessage[] = [];
  const flush = () => { if (buf.length) { out.push({ kind: "timeline", msgs: [...buf] }); buf = []; } };
  for (const m of msgs) {
    if (["thinking", "tool_call", "tool_result", "compact"].includes(m.type)) {
      buf.push(m);
    } else {
      flush();
      out.push({ kind: "single", msg: m });
    }
  }
  flush();
  return out;
}

const act = () => useAgentStore.getState();

/* ---------- Component ---------- */
export function Agent() {
  const [input, setInput] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sseSessionRef = useRef<string | null>(null);
  const prevSseStatusRef = useRef<string>("disconnected");
  const genRef = useRef(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const lastEventRef = useRef(0);

  const [attachment, setAttachment] = useState<{ filename: string; filePath: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [swarmPreset, setSwarmPreset] = useState<{ name: string; title: string } | null>(null);
  const swarmCancelRef = useRef(false);
  const [swarmDash, setSwarmDash] = useState<SwarmDashboardProps | null>(null);
  const swarmDashRef = useRef<SwarmDashboardProps | null>(null);

  const messages = useAgentStore(s => s.messages);
  const streamingText = useAgentStore(s => s.streamingText);
  const status = useAgentStore(s => s.status);
  const sessionId = useAgentStore(s => s.sessionId);
  const toolCalls = useAgentStore(s => s.toolCalls);
  const sessionLoading = useAgentStore(s => s.sessionLoading);

  const { connect, disconnect, onStatusChange } = useSSE();
  const { t } = useI18n();

  const urlSessionId = searchParams.get("session");

  /* Smart scroll — only auto-scroll when near bottom */
  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const rafRef = useRef(0);
  const scrollToBottom = useCallback(() => {
    if (!isNearBottom()) {
      setShowScrollBtn(true);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, [isNearBottom]);

  const forceScrollToBottom = useCallback(() => {
    setShowScrollBtn(false);
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  /* Track scroll position to show/hide scroll button */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isNearBottom()) setShowScrollBtn(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom]);

  useEffect(() => {
    onStatusChange((s) => {
      act().setSseStatus(s);
      if (s === "reconnecting" && prevSseStatusRef.current === "connected") toast.warning(t.reconnecting);
      else if (s === "connected" && prevSseStatusRef.current === "reconnecting") toast.success(t.connected);
      prevSseStatusRef.current = s;
    });
  }, [onStatusChange, t]);

  const doDisconnect = useCallback(() => {
    disconnect();
    sseSessionRef.current = null;
  }, [disconnect]);

  const loadSessionMessages = useCallback(async (sid: string, gen: number) => {
    try {
      const msgs = await api.getSessionMessages(sid);
      if (genRef.current !== gen) return;
      const agentMsgs: AgentMessage[] = [];
      for (const m of msgs) {
        const meta = m.metadata as Record<string, unknown> | undefined;
        const runId = meta?.run_id as string | undefined;
        const metrics = meta?.metrics as Record<string, number> | undefined;
        const ts = new Date(m.created_at).getTime();
        if (m.role === "user") {
          agentMsgs.push({ id: m.message_id, type: "user", content: m.content, timestamp: ts });
        } else if (runId) {
          // Show text answer first (if non-empty), then chart card
          if (m.content && m.content !== "Strategy execution completed.") {
            agentMsgs.push({ id: m.message_id + "_ans", type: "answer", content: m.content, timestamp: ts });
          }
          agentMsgs.push({ id: m.message_id, type: "run_complete", content: "", runId, metrics, timestamp: ts + 1 });
        } else {
          agentMsgs.push({ id: m.message_id, type: "answer", content: m.content, timestamp: ts });
        }
      }
      if (genRef.current !== gen) return;
      act().loadHistory(agentMsgs);
      act().setSessionLoading(false);
      act().cacheSession(sid, agentMsgs);
      setTimeout(() => forceScrollToBottom(), 50);
    } catch {
      act().setSessionLoading(false);
    }
  }, [forceScrollToBottom]);

  const setupSSE = useCallback((sid: string) => {
    if (sseSessionRef.current === sid) return;
    disconnect();
    sseSessionRef.current = sid;

    const touch = () => { lastEventRef.current = Date.now(); };

    connect(api.sseUrl(sid), {
      text_delta: (d) => { touch(); act().appendDelta(String(d.delta || "")); scrollToBottom(); },
      thinking_done: () => { touch(); /* don't flush — keep streaming text visible */ },

      tool_call: (d) => {
        touch();
        const toolName = String(d.tool || "");
        // Only update toolCalls tracker (no message creation during streaming)
        act().addToolCall({
          id: toolName, tool: toolName,
          arguments: (d.arguments as Record<string, string>) ?? {},
          status: "running", timestamp: Date.now(),
        });
        scrollToBottom();
      },

      tool_result: (d) => {
        touch();
        // Only update tracker (no message creation during streaming)
        act().updateToolCall(String(d.tool || ""), {
          status: d.status === "ok" ? "ok" : "error",
          preview: String(d.preview || ""),
          elapsed_ms: Number(d.elapsed_ms || 0),
        });
      },

      compact: () => { touch(); },

      "attempt.completed": async (d) => {
        touch();
        const s = act();
        // Build ThinkingTimeline summary from accumulated toolCalls
        const completedTools = s.toolCalls;
        if (completedTools.length > 0) {
          const totalMs = completedTools.reduce((a, tc) => a + (tc.elapsed_ms || 0), 0);
          for (const tc of completedTools) {
            s.addMessage({ id: tc.id + "_call", type: "tool_call", content: "", tool: tc.tool, args: tc.arguments, status: tc.status || "ok", timestamp: tc.timestamp });
            if (tc.elapsed_ms != null) {
              s.addMessage({ id: "", type: "tool_result", content: tc.preview || "", tool: tc.tool, status: tc.status || "ok", elapsed_ms: tc.elapsed_ms, timestamp: tc.timestamp + 1 });
            }
          }
        }

        // Clear streaming text (don't create thinking message)
        s.clearStreaming();

        // Add final answer
        const runDir = String(d.run_dir || "");
        const runId = runDir ? runDir.split(/[/\\]/).pop() : undefined;
        const summary = String(d.summary || "");
        if (summary) s.addMessage({ id: "", type: "answer", content: summary, timestamp: Date.now() });

        // Detect Shadow Account id if render_shadow_report fired successfully this turn
        const shadowCall = completedTools.find(
          (tc) => tc.tool === "render_shadow_report" && (tc.status || "ok") === "ok",
        );
        const shadowMatch = shadowCall?.preview?.match(/"shadow_id"\s*:\s*"(shadow_[A-Za-z0-9_]+)"/);
        const shadowId = shadowMatch?.[1];

        // Show RunCompleteCard when the turn produced backtest metrics or a shadow report
        if (runId) {
          try {
            const runData = await api.getRun(runId);
            const hasMetrics = runData.metrics && Object.keys(runData.metrics).length > 0;
            if (hasMetrics || shadowId) {
              s.addMessage({
                id: "", type: "run_complete", content: "", runId,
                metrics: hasMetrics ? runData.metrics : undefined,
                equityCurve: runData.equity_curve?.map(e => ({ time: e.time, equity: e.equity })),
                shadowId,
                timestamp: Date.now(),
              });
            }
          } catch { /* ignore */ }
        } else if (shadowId) {
          s.addMessage({ id: "", type: "run_complete", content: "", shadowId, timestamp: Date.now() });
        }

        // Reset
        s.setStatus("idle");
        useAgentStore.setState({ toolCalls: [] });
        scrollToBottom();
      },

      "attempt.failed": (d) => {
        touch();
        act().clearStreaming();
        act().addMessage({ id: "", type: "error", content: String(d.error || "Execution failed"), timestamp: Date.now() });
        act().setStatus("idle");
        scrollToBottom();
      },

      heartbeat: () => {},
      reconnect: (d) => { act().setSseStatus("reconnecting", Number(d.attempt ?? 0)); },
    });
  }, [connect, disconnect, scrollToBottom]);

  useEffect(() => {
    const gen = ++genRef.current;
    const { sessionId: curSid, messages: curMsgs, cacheSession, reset, getCachedSession, switchSession } = act();

    if (urlSessionId && urlSessionId !== curSid) {
      doDisconnect();
      if (curSid && curMsgs.length > 0) cacheSession(curSid, curMsgs);

      // Atomic switch: cache hit = instant, cache miss = show loading skeleton
      const cached = getCachedSession(urlSessionId);
      switchSession(urlSessionId, cached);
      if (cached) {
        setTimeout(() => forceScrollToBottom(), 50);
      } else {
        loadSessionMessages(urlSessionId, gen);
      }
      setupSSE(urlSessionId);
    } else if (!urlSessionId && curSid) {
      doDisconnect();
      if (curMsgs.length > 0) cacheSession(curSid, curMsgs);
      reset();
    }
  }, [urlSessionId, doDisconnect, loadSessionMessages, setupSSE, forceScrollToBottom]);

  useEffect(() => () => doDisconnect(), [doDisconnect]);

  /* Safety timeout: if streaming but no SSE event for 90s, reset to idle */
  useEffect(() => {
    if (status !== "streaming") return;
    const timer = setInterval(() => {
      if (lastEventRef.current && Date.now() - lastEventRef.current > 90_000 && act().status === "streaming") {
        act().setStatus("idle");
        toast.warning("Execution timed out, automatically stopped");
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, [status]);

  const runSwarm = async (presetName: string, presetTitle: string, prompt: string) => {
    let sid = act().sessionId;
    if (!sid) {
      try {
        const session = await api.createSession(`[Swarm] ${presetTitle}: ${prompt.slice(0, 30)}`);
        sid = session.session_id;
        act().setSessionId(sid);
        setSearchParams({ session: sid }, { replace: true });
      } catch { /* continue without session */ }
    }

    act().addMessage({ id: "", type: "user", content: `[${presetTitle}] ${prompt}`, timestamp: Date.now() });
    act().setStatus("streaming");
    // Add a placeholder swarm-progress message (rendered as SwarmDashboard)
    act().addMessage({ id: "swarm-progress", type: "answer", content: "", timestamp: Date.now() });
    forceScrollToBottom();
    swarmCancelRef.current = false;

    // Initialize dashboard state
    const dash: SwarmDashboardProps = {
      preset: presetTitle,
      agents: {},
      agentOrder: [],
      currentLayer: 0,
      finished: false,
      finalStatus: "",
      startTime: Date.now(),
      completedSummaries: [],
      finalReport: "",
    };
    swarmDashRef.current = dash;
    setSwarmDash({ ...dash });

    const ensureAgent = (agentId: string): SwarmAgent => {
      if (!dash.agents[agentId]) {
        dash.agents[agentId] = {
          id: agentId, status: "waiting", tool: "", iters: 0,
          startedAt: 0, elapsed: 0, lastText: "", summary: "",
        };
        dash.agentOrder.push(agentId);
      }
      return dash.agents[agentId];
    };

    const flush = () => { lastEventRef.current = Date.now(); swarmDashRef.current = dash; setSwarmDash({ ...dash }); scrollToBottom(); };

    try {
      const result = await api.createSwarmRun(presetName, { goal: prompt });
      const runId = result.id;
      const sseUrl = `/swarm/runs/${runId}/events`;
      const evtSource = new EventSource(sseUrl);
      let sseFinished = false;

      evtSource.addEventListener("layer_started", (e) => {
        try {
          const d = JSON.parse(e.data);
          dash.currentLayer = d.data?.layer ?? 0;
          flush();
        } catch {}
      });

      evtSource.addEventListener("task_started", (e) => {
        try {
          const d = JSON.parse(e.data);
          const agentId = d.agent_id || "";
          if (agentId) {
            const a = ensureAgent(agentId);
            a.status = "running";
            a.startedAt = Date.now();
            flush();
          }
        } catch {}
      });

      evtSource.addEventListener("worker_text", (e) => {
        try {
          const d = JSON.parse(e.data);
          const agentId = d.agent_id || "";
          const content = (d.data?.content || "").trim();
          if (agentId && content) {
            const a = ensureAgent(agentId);
            const lastLine = content.split("\n").pop()?.trim() || "";
            if (lastLine) a.lastText = lastLine.slice(0, 60);
            flush();
          }
        } catch {}
      });

      evtSource.addEventListener("tool_call", (e) => {
        try {
          const d = JSON.parse(e.data);
          const agentId = d.agent_id || "";
          const tool = d.data?.tool || "";
          if (agentId && tool) {
            const a = ensureAgent(agentId);
            a.tool = tool;
            a.iters++;
            flush();
          }
        } catch {}
      });

      evtSource.addEventListener("tool_result", (e) => {
        try {
          const d = JSON.parse(e.data);
          const agentId = d.agent_id || "";
          if (agentId) {
            const a = ensureAgent(agentId);
            const ok = (d.data?.status || "ok") === "ok";
            a.tool = `${a.tool} ${ok ? "\u2713" : "\u2717"}`;
            a.elapsed = a.startedAt ? Date.now() - a.startedAt : 0;
            flush();
          }
        } catch {}
      });

      evtSource.addEventListener("task_completed", (e) => {
        try {
          const d = JSON.parse(e.data);
          const agentId = d.agent_id || "";
          if (agentId) {
            const a = ensureAgent(agentId);
            a.status = "done";
            a.elapsed = a.startedAt ? Date.now() - a.startedAt : 0;
            a.iters = d.data?.iterations ?? a.iters;
            const summary = d.data?.summary || "";
            if (summary) {
              a.summary = summary;
              dash.completedSummaries.push({ agentId, summary });
            }
            flush();
          }
        } catch {}
      });

      evtSource.addEventListener("task_failed", (e) => {
        try {
          const d = JSON.parse(e.data);
          const agentId = d.agent_id || "";
          if (agentId) {
            const a = ensureAgent(agentId);
            a.status = "failed";
            a.elapsed = a.startedAt ? Date.now() - a.startedAt : 0;
            const error = (d.data?.error || "").slice(0, 80);
            dash.completedSummaries.push({ agentId, summary: `FAILED: ${error}` });
            flush();
          }
        } catch {}
      });

      evtSource.addEventListener("task_retry", (e) => {
        try {
          const d = JSON.parse(e.data);
          const agentId = d.agent_id || "";
          if (agentId) { ensureAgent(agentId).status = "retry"; flush(); }
        } catch {}
      });

      evtSource.addEventListener("done", () => { sseFinished = true; evtSource.close(); });
      evtSource.onerror = () => { if (!sseFinished) evtSource.close(); };

      // Poll for completion
      for (let i = 0; i < 720; i++) {
        await new Promise(r => setTimeout(r, 2500));
        if (swarmCancelRef.current) { evtSource.close(); break; }
        try {
          const run = await api.getSwarmRun(runId);
          const rs = String(run.status || "");
          if (["completed", "failed", "cancelled"].includes(rs)) {
            evtSource.close();
            dash.finished = true;
            dash.finalStatus = rs;
            const report = String(run.final_report || "");
            if (!report) {
              const tasks = (run.tasks || []) as Array<{ agent_id: string; summary?: string }>;
              dash.finalReport = tasks
                .filter(t => t.summary && !t.summary.startsWith("Worker hit iteration limit"))
                .map(t => `### ${t.agent_id}\n${t.summary}`)
                .join("\n\n") || "Swarm completed.";
            } else {
              dash.finalReport = report;
            }
            flush();
            act().setStatus("idle");
            return;
          }
        } catch {}
      }
      evtSource.close();
      act().addMessage({ id: "", type: "error", content: "Swarm timed out", timestamp: Date.now() });
      act().setStatus("idle");
    } catch (err) {
      act().setStatus("error");
      act().addMessage({ id: "", type: "error", content: `Swarm failed: ${err instanceof Error ? err.message : "Unknown"}`, timestamp: Date.now() });
    }
  };

  const runPrompt = async (prompt: string) => {
    if (!prompt.trim() || status === "streaming") return;

    let finalPrompt = prompt;

    // Swarm mode: let agent auto-select the right preset
    if (swarmPreset) {
      setSwarmPreset(null);
      finalPrompt = `[Swarm Team Mode] Use the swarm tool to assemble the best specialist team for this task. Auto-select the most appropriate preset.\n\n${prompt}`;
    }

    if (attachment) {
      finalPrompt = `[Uploaded file: ${attachment.filename}, path: ${attachment.filePath}]\n\n${finalPrompt}`;
      setAttachment(null);
    }
    setInput("");
    act().addMessage({ id: "", type: "user", content: finalPrompt, timestamp: Date.now() });
    act().setStatus("streaming");
    forceScrollToBottom();
    inputRef.current?.focus();

    try {
      let sid = act().sessionId;
      if (!sid) {
        const session = await api.createSession(prompt.slice(0, 50));
        sid = session.session_id;
        act().setSessionId(sid);
        setSearchParams({ session: sid }, { replace: true });
      }
      setupSSE(sid);
      await api.sendMessage(sid, finalPrompt);
    } catch {
      act().setStatus("error");
      toast.error(t.sendFailed);
      act().addMessage({ id: "", type: "error", content: t.sendFailed, timestamp: Date.now() });
    }
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); runPrompt(input.trim()); };

  const handleCancel = async () => {
    swarmCancelRef.current = true;
    if (!sessionId) {
      act().setStatus("idle");
      return;
    }
    try {
      await api.cancelSession(sessionId);
      act().setStatus("idle");
      act().clearStreaming();
      useAgentStore.setState({ toolCalls: [] });
      toast.info("Cancel request sent");
    } catch {
      toast.error("Cancel failed");
    }
  };

  const handleRetry = useCallback((errorMsg: AgentMessage) => {
    if (status === "streaming") return;
    const msgs = act().messages;
    const errorIdx = msgs.findIndex(m => m.id === errorMsg.id);
    if (errorIdx === -1) return;
    // Find the most recent user message before this error
    let userContent: string | null = null;
    for (let i = errorIdx - 1; i >= 0; i--) {
      if (msgs[i].type === "user") {
        userContent = msgs[i].content;
        break;
      }
    }
    if (!userContent) return;
    runPrompt(userContent);
  }, [status]);

  const handleExport = () => {
    if (messages.length === 0) return;
    const lines: string[] = [`# Chat Export`, ``, `Export time: ${new Date().toLocaleString()}`, ``];
    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleString();
      if (msg.type === "user") {
        lines.push(`## User (${time})`, ``, msg.content, ``);
      } else if (msg.type === "answer") {
        lines.push(`## Assistant (${time})`, ``, msg.content, ``);
      } else if (msg.type === "error") {
        lines.push(`## Error (${time})`, ``, msg.content, ``);
      } else if (msg.type === "tool_call") {
        lines.push(`> Tool call: ${msg.tool || "unknown"}`, ``);
      } else if (msg.type === "run_complete") {
        lines.push(`> Backtest complete: ${msg.runId || ""}`, ``);
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const blockedExts = [
      ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".app", ".dmg",
      ".so", ".dll", ".dylib",
      ".zip", ".rar", ".7z", ".tar", ".gz", ".tgz", ".bz2", ".xz",
    ];
    const lowered = file.name.toLowerCase();
    if (blockedExts.some((ext) => lowered.endsWith(ext))) {
      toast.error("Executables and archives are not allowed");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50 MB limit");
      return;
    }
    setUploading(true);
    setShowUploadMenu(false);
    try {
      const result = await api.uploadFile(file);
      setAttachment({ filename: result.filename, filePath: result.file_path });
      toast.success(`Uploaded: ${result.filename}`);
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false);
      }
    };
    if (showUploadMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUploadMenu]);

  const groups = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden h-full relative">
      <div ref={listRef} className="flex-1 overflow-auto p-8 scroll-smooth relative z-0 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          {sessionLoading && (
            <div className="space-y-6 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-lg bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!sessionLoading && messages.length === 0 && <WelcomeScreen onExample={runPrompt} />}

          {groups.map((g, i) => {
            if (g.kind === "timeline") {
              return (
                <ThinkingTimeline
                  key={g.msgs[0].id || g.msgs[0].timestamp}
                  messages={g.msgs}
                  isLatest={i === groups.length - 1 && status === "streaming"}
                />
              );
            }
            const msgIdx = messages.indexOf(g.msg);
            // Render swarm-progress as SwarmDashboard
            if (g.msg.id === "swarm-progress" && swarmDash) {
              return (
                <div key="swarm-dash" className="flex gap-4">
                  <AgentAvatar />
                  <div className="flex-1 min-w-0">
                    <div className="terminal-box" data-title="SWARM INTELLIGENCE MONITOR">
                      <SwarmDashboard {...swarmDash} />
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={g.msg.id || g.msg.timestamp} data-msg-idx={msgIdx}>
                <MessageBubble msg={g.msg} onRetry={g.msg.type === "error" ? handleRetry : undefined} />
              </div>
            );
          })}

          {/* Live streaming area: text + tool status */}
          {(streamingText || (status === "streaming" && toolCalls.length > 0)) && (
            <div className="flex gap-4">
              <AgentAvatar />
              <div className="flex-1 min-w-0 space-y-3">
                <div className="terminal-box" data-title="REAL-TIME STREAM">
                  {streamingText && (
                    <div className="prose prose-sm prose-invert max-w-none leading-relaxed font-sans text-white/90">
                      {streamingText}
                      <span className="inline-block w-1.5 h-4 bg-accent-teal ml-1.5 animate-pulse align-middle shadow-[0_0_8px_rgba(125,211,192,0.8)]" />
                    </div>
                  )}
                  {status === "streaming" && toolCalls.length > 0 && (() => {
                    const latest = toolCalls[toolCalls.length - 1];
                    const running = latest.status === "running";
                    return (
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5 text-[10px] font-mono tracking-widest uppercase">
                        {running
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-blue shrink-0" />
                          : <CheckCircle2 className="h-3.5 w-3.5 text-accent-teal shrink-0" />}
                        <span className={running ? "text-accent-blue animate-pulse" : "text-accent-teal"}>
                          STEP {toolCalls.length} // {latest.tool}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={forceScrollToBottom}
            className="sticky bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-accent-blue text-bg-dark text-[10px] font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(91,155,213,0.4)] hover:scale-105 transition-all z-10"
          >
            <ArrowDown className="h-3.5 w-3.5" /> Synchronize Stream
          </button>
        )}
        <ConversationTimeline messages={messages} containerRef={listRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-6 bg-black/20 backdrop-blur-xl border-t border-glass-border">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-3 flex-wrap">
            {/* Swarm preset badge */}
            {swarmPreset && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-[10px] font-bold uppercase tracking-wider">
                <Users className="h-3 w-3" />
                {swarmPreset.title}
                <button type="button" onClick={() => setSwarmPreset(null)} className="hover:text-white transition-colors ml-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {/* Attachment badge */}
            {attachment && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-[10px] font-bold uppercase tracking-wider">
                <Paperclip className="h-3 w-3" />
                {attachment.filename}
                <button type="button" onClick={() => setAttachment(null)} className="hover:text-white transition-colors ml-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 items-end">
            <div className="relative" ref={uploadMenuRef}>
              <button
                type="button"
                onClick={() => setShowUploadMenu(prev => !prev)}
                disabled={status === "streaming" || uploading}
                className="w-11 h-11 rounded-xl glass flex items-center justify-center text-text-dim hover:text-accent-teal hover:border-accent-teal/50 transition-all disabled:opacity-40 shrink-0"
                title="System Functions"
              >
                <Plus className="h-5 w-5" />
              </button>
              {showUploadMenu && (
                <div className="absolute bottom-full left-0 mb-3 w-64 rounded-xl glass border-glass-border bg-bg-dark/95 shadow-2xl py-2 z-50 p-1">
                  <button
                    type="button"
                    onClick={() => { fileInputRef.current?.click(); setShowUploadMenu(false); }}
                    className="w-full px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider hover:bg-white/5 text-text-dim hover:text-white transition-all flex items-center gap-3 rounded-lg"
                  >
                    <Paperclip className="h-4 w-4 text-accent-blue" />
                    Upload Dataset (PDF)
                  </button>
                  <div className="h-px bg-white/5 my-1 mx-2" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadMenu(false);
                      setSwarmPreset({ name: "auto", title: "Agent Swarm" });
                      inputRef.current?.focus();
                    }}
                    className="w-full px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider hover:bg-white/5 text-text-dim hover:text-white transition-all flex items-center gap-3 rounded-lg"
                  >
                    <Users className="h-4 w-4 text-accent-purple" />
                    Initialize Swarm Team
                  </button>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.pptx,.csv,.tsv,.txt,.md,.log,.json,.yaml,.yml,.toml,.html,.xml,.rst,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex-1 relative group">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(e) => setInput(e.target.value)}
                onInput={(e) => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    runPrompt(input.trim());
                  }
                }}
                placeholder="EXECUTE COMMAND..."
                className="w-full px-5 py-3.5 rounded-xl border border-glass-border bg-black/40 text-sm font-mono text-white focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all resize-none max-h-48 overflow-y-auto placeholder:text-white/20"
                disabled={status === "streaming"}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {uploading && <Loader2 className="h-4 w-4 animate-spin text-accent-teal" />}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="p-1.5 text-text-dim hover:text-white transition-colors"
                    title="Export Logs"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {status === "streaming" ? (
              <button
                type="button"
                onClick={handleCancel}
                className="w-11 h-11 rounded-xl bg-danger/20 border border-danger/30 text-danger flex items-center justify-center hover:bg-danger/30 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                title="TERMINATE EXECUTION"
              >
                <Square className="h-5 w-5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && !attachment}
                className="glow-button h-11 !w-28 text-[11px] font-black tracking-widest disabled:opacity-30 disabled:grayscale"
              >
                <Send className="h-4 w-4" />
                EXEC
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
