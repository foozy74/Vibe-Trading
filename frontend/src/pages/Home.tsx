import { Link } from "react-router-dom";
import { ArrowRight, Bot, BarChart3, Zap, UserCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Home() {
  const { t } = useI18n();

  const FEATURES = [
    { icon: Bot, title: t.feat1, desc: t.feat1d, color: "text-teal" },
    { icon: BarChart3, title: t.feat2, desc: t.feat2d, color: "text-blue" },
    { icon: Zap, title: t.feat3, desc: t.feat3d, color: "text-purple" },
    { icon: UserCircle2, title: t.feat4, desc: t.feat4d, color: "text-emerald-400" },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] p-8 relative">
      <div className="max-w-3xl text-center space-y-8 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal/20 bg-teal/5 text-teal text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          <Zap className="h-3 w-3" /> System Alpha v0.1.0
        </div>
        
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white leading-tight">
          {t.heroTitle.split(" ").map((word, i) => (
            <span key={i} className={word.toLowerCase().includes("trading") ? "text-teal" : ""}>
              {word}{" "}
            </span>
          ))}
        </h1>
        
        <p className="text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
          {t.heroDesc}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/agent"
            className="glow-button min-w-[220px]"
          >
            {t.startResearch} <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-[10px] font-mono text-text-faint uppercase tracking-widest">
            Institutional Grade Neural Swarms
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 max-w-6xl w-full relative z-10">
        {FEATURES.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="terminal-box group" data-title="MODULE">
            <Icon className={`h-10 w-10 ${color} mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`} />
            <h3 className="text-lg font-black tracking-tight text-white mb-2">{title}</h3>
            <p className="text-sm text-text-muted leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">{desc}</p>
          </div>
        ))}
      </div>
          </div>
        ))}
      </div>

      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal/5 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
