import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
}

const SummaryCard = ({ title, value, subtitle, icon: Icon, trend, accentColor = "bg-primary" }: SummaryCardProps) => (
  <div className="summary-card flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      {trend && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend.positive ? "bg-status-success/10 text-status-success" : "bg-status-error/10 text-status-error"
          }`}>
          {trend.positive ? "↑" : "↓"} {trend.value}
        </span>
      )}
    </div>
    <div>
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  </div>
);

export default SummaryCard;
