import { Bot, TrendingUp, Bitcoin, Globe, Sparkles, Users, Zap, UserCircle2, NotebookPen } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Example {
  title: string;
  desc: string;
  prompt: string;
}

interface Category {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  glowClass: string;
  examples: Example[];
}

const CATEGORIES: Category[] = [
  {
    label: "Advanced Backtesting",
    icon: <TrendingUp className="h-4 w-4" />,
    colorClass: "text-teal",
    glowClass: "hover:border-teal/50 hover:bg-teal/5 shadow-teal/10",
    examples: [
      {
        title: "Cross-Market Portfolio",
        desc: "A-shares + crypto + US equities with risk-parity optimizer",
        prompt: "Backtest a risk-parity portfolio of 000001.SZ, BTC-USDT, and AAPL for full-year 2024, compare against equal-weight baseline",
      },
      {
        title: "BTC 5-Min MACD Strategy",
        desc: "Minute-level crypto backtest with real-time data",
        prompt: "Backtest BTC-USDT 5-minute MACD strategy, fast=12 slow=26 signal=9, last 30 days",
      },
    ],
  },
  {
    label: "Neural Research",
    icon: <Zap className="h-4 w-4" />,
    colorClass: "text-blue",
    glowClass: "hover:border-blue/50 hover:bg-blue/5 shadow-blue/10",
    examples: [
      {
        title: "Multi-Factor Alpha Model",
        desc: "IC-weighted factor synthesis across 300 stocks",
        prompt: "Build a multi-factor alpha model using momentum, reversal, volatility, and turnover on CSI 300 constituents with IC-weighted factor synthesis, backtest 2023-2024",
      },
      {
        title: "Options Greeks Analysis",
        desc: "Black-Scholes pricing with Delta/Gamma/Theta/Vega",
        prompt: "Calculate option Greeks using Black-Scholes: spot=100, strike=105, risk-free rate=3%, vol=25%, expiry=90 days, analyze Delta/Gamma/Theta/Vega",
      },
    ],
  },
  {
    label: "Swarm Intelligence",
    icon: <Users className="h-4 w-4" />,
    colorClass: "text-purple",
    glowClass: "hover:border-purple/50 hover:bg-purple/5 shadow-purple/10",
    examples: [
      {
        title: "Investment Committee Review",
        desc: "Multi-agent debate: long vs short, risk review, PM decision",
        prompt: "[Swarm Team Mode] Use the investment_committee preset to evaluate whether to go long or short on NVDA given current market conditions",
      },
      {
        title: "Quant Strategy Desk",
        desc: "Screening → research → backtest → risk audit pipeline",
        prompt: "[Swarm Team Mode] Use the quant_strategy_desk preset to find and backtest the best momentum strategy on CSI 300 constituents",
      },
    ],
  },
  {
    label: "Market Analysis",
    icon: <Globe className="h-4 w-4" />,
    colorClass: "text-teal",
    glowClass: "hover:border-teal/50 hover:bg-teal/5 shadow-teal/10",
    examples: [
      {
        title: "Analyze Earnings Report",
        desc: "Summarize metrics, risks, and outlook from PDF",
        prompt: "Summarize the key financial metrics, risks, and outlook from the uploaded earnings report",
      },
      {
        title: "Macro Sentiment Audit",
        desc: "Read live web sources for macro analysis",
        prompt: "Read the latest Fed meeting minutes and summarize the key takeaways for equity and crypto markets",
      },
    ],
  },
  {
    label: "Trade Journal",
    icon: <NotebookPen className="h-4 w-4" />,
    colorClass: "text-orange-400",
    glowClass: "border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/5 shadow-orange-500/10",
    examples: [
      {
        title: "Analyze My Broker Export",
        desc: "Parse 同花顺/东财/富途/generic CSV — holding days, win rate, PnL ratio, hourly distribution",
        prompt: "Analyze the trade journal I just uploaded — full profile with holding stats, win rate, top symbols, and hourly distribution",
      },
      {
        title: "Diagnose My Behavior Biases",
        desc: "Disposition effect, overtrading, chasing momentum, anchoring — severity + numeric evidence",
        prompt: "Run the 4 behavior diagnostics on my trade journal (disposition, overtrading, chasing, anchoring) and tell me which bias hurts my PnL most",
      },
    ],
  },
  {
    label: "Shadow Account",
    icon: <UserCircle2 className="h-4 w-4" />,
    colorClass: "text-emerald-400",
    glowClass: "border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5 shadow-emerald-500/10",
    examples: [
      {
        title: "Train My Shadow from Journal",
        desc: "Extract your strategy rules from a broker CSV and persist a Shadow profile",
        prompt: "Train my shadow account from the trading journal I just uploaded — show the extracted rules and confirm they look like my behavior",
      },
      {
        title: "How Much Am I Leaving on the Table?",
        desc: "Backtest your shadow strategy and attribute delta vs. your actual PnL",
        prompt: "Run a shadow backtest for the last 90 days on the US market and break down where my PnL diverged from the shadow (rule violations, early exits, missed signals)",
      },
      {
        title: "Generate Shadow Report",
        desc: "8-section HTML/PDF — equity curve, per-market Sharpe, attribution waterfall",
        prompt: "Render the shadow report and give me the URL — lead with the you-vs-shadow delta",
      },
    ],
  },
];

const CAPABILITY_CHIPS = [
  "70 Finance Skills",
  "29 Swarm Presets",
  "32 Agent Tools",
  "3 Markets: A-Share · Crypto · HK/US",
  "Minute to Daily Timeframes",
  "4 Portfolio Optimizers",
  "15+ Risk Metrics",
  "Options & Derivatives",
  "PDF & Web Research",
  "Factor Analysis & ML",
  "Trade Journal Analyzer",
  "Shadow Account Backtest",
  "Persistent Memory",
  "Session Search",
];

interface Props {
  onExample: (s: string) => void;
}

export function WelcomeScreen({ onExample }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12 py-12">
      {/* Header */}
      <div className="space-y-6 max-w-2xl">
        <div className="relative mx-auto w-20 h-20 group">
          <div className="absolute -inset-4 bg-teal/20 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-teal/20 to-blue/20 border border-teal/30 flex items-center justify-center shadow-2xl backdrop-blur-xl">
            <Bot className="h-10 w-10 text-teal" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-white">
            Vibe<span className="text-teal">Trading</span>
          </h1>
          <p className="text-[10px] font-mono text-blue uppercase tracking-[0.4em] font-bold">
            Powered by thesolution.at
          </p>
        </div>

        <p className="text-sm text-text-muted leading-relaxed max-w-lg mx-auto">
          Deploy specialized neural agent swarms to analyze markets, backtest strategies, and optimize your portfolio in real-time.
        </p>
      </div>

      {/* Capability chips */}
      <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
        {CAPABILITY_CHIPS.map((chip) => (
          <span
            key={chip}
            className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/5 text-text-muted bg-white/[0.02] backdrop-blur-md"
          >
            {chip}
          </span>
        ))}
      </div>

      {/* Example categories grid */}
      <div className="w-full max-w-3xl text-left space-y-6">
        <div className="flex items-center gap-3 px-1">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-faint">{t.examples}</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORIES.map((cat) => (
            <div key={cat.label} className="space-y-4">
              <div className={cn("flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest px-1", cat.colorClass)}>
                {cat.icon}
                <span>{cat.label}</span>
              </div>
              <div className="grid gap-3">
                {cat.examples.map((ex) => (
                  <button
                    key={ex.title}
                    onClick={() => onExample(ex.prompt)}
                    className={cn(
                      "group block w-full text-left p-4 rounded-2xl border border-white/5 bg-white/[0.01] transition-all duration-500",
                      cat.glowClass
                    )}
                  >
                    <span className="block text-sm font-bold text-white group-hover:text-teal transition-colors">
                      {ex.title}
                    </span>
                    <span className="block text-[11px] text-text-muted mt-1 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                      {ex.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
