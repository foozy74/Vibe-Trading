import { memo, useState, useCallback } from "react";
import { User, XCircle, RefreshCw, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { formatTimestamp } from "@/lib/formatters";
import type { AgentMessage } from "@/types/agent";
import { AgentAvatar } from "./AgentAvatar";
import { RunCompleteCard } from "./RunCompleteCard";
import { cn } from "@/lib/utils";

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-md border border-white/5"
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function getRetryHint(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Execution timed out. Try simplifying the strategy.";
  }
  return "Execution failed. Click to re-initialize.";
}

interface Props {
  msg: AgentMessage;
  onRetry?: (msg: AgentMessage) => void;
}

export const MessageBubble = memo(function MessageBubble({ msg, onRetry }: Props) {
  const ts = msg.timestamp ? formatTimestamp(msg.timestamp) : null;

  if (msg.type === "user") {
    return (
      <div className="flex justify-end gap-5 group">
        <div className="max-w-[85%] glass px-6 py-4 text-[13px] leading-relaxed whitespace-pre-wrap text-white/90 border-blue/20 bg-blue/5 shadow-2xl">
          {msg.content}
          {ts && (
            <div className="flex items-center justify-end gap-2 mt-3 opacity-30 group-hover:opacity-100 transition-opacity">
               <span className="h-px w-8 bg-blue/30" />
               <span className="text-[9px] font-mono text-blue uppercase tracking-widest font-bold">{ts} // USER_SIG</span>
            </div>
          )}
        </div>
        <div className="h-10 w-10 rounded-xl glass border-blue/30 flex items-center justify-center shrink-0 mt-0.5 bg-blue/10 shadow-lg">
          <User className="h-5 w-5 text-blue" />
        </div>
      </div>
    );
  }

  if (msg.type === "answer") {
    return (
      <div className="flex gap-5 group">
        <AgentAvatar />
        <div className="flex-1 min-w-0 relative">
          <div className="terminal-box !p-8" data-title="NEURAL RESPONSE">
            <CopyButton text={msg.content} />
            <div className="prose prose-sm prose-invert max-w-none leading-relaxed prose-table:border prose-table:border-white/5 prose-th:bg-white/5 prose-th:px-4 prose-th:py-3 prose-td:px-4 prose-td:py-3 prose-th:text-left prose-th:text-[10px] prose-th:font-black prose-th:uppercase prose-th:tracking-widest prose-th:text-purple prose-td:text-[11px] prose-td:font-mono prose-td:text-white/80 font-sans">
              <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>{msg.content}</ReactMarkdown>
            </div>
            {ts && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-30 transition-opacity">
                <span className="text-[9px] font-mono text-text-muted uppercase tracking-tighter font-bold">
                  {ts} // TRACE_ID: {msg.id.slice(0, 8)}
                </span>
                <div className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === "run_complete" && msg.runId) {
    return (
      <div className="flex gap-5 group">
        <AgentAvatar />
        <div className="flex-1 min-w-0">
          <RunCompleteCard msg={msg} />
        </div>
      </div>
    );
  }

  if (msg.type === "error") {
    const hint = getRetryHint(msg.content);
    return (
      <div className="flex gap-5">
        <AgentAvatar />
        <div className="space-y-4 flex-1">
          <div className="terminal-box border-red-500/30 bg-red-500/5 !p-6" data-title="CRITICAL FAULT">
            <div className="flex items-start gap-4">
              <XCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[13px] font-mono text-red-400/90 leading-relaxed uppercase tracking-tight font-bold">{msg.content}</p>
            </div>
          </div>
          {onRetry && (
            <button
              onClick={() => onRetry(msg)}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted hover:text-white hover:bg-white/10 border border-white/5 transition-all shadow-lg"
              title={hint}
            >
              <RefreshCw className="h-4 w-4 text-blue" />
              <span>RE-INITIALIZE NEURAL PROCESS</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
});
