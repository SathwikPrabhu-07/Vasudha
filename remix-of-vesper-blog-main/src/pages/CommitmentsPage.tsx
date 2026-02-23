import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FileCheck,
    Clock,
    CheckCircle,
    IndianRupee,
    Loader2,
    Handshake,
    XCircle,
} from "lucide-react";
import SummaryCard from "@/components/SummaryCard";
import {
    getCommitmentsForBuyer,
    getCommitmentsForFarmer,
    type CommitmentDocument,
} from "@/services/commitmentService";
import { auth } from "@/firebase";

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCurrency(n: number) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
}

function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function getRole(): string {
    try {
        const s = sessionStorage.getItem("vasudha_user");
        if (s) return JSON.parse(s).role || "buyer";
    } catch { /* ignore */ }
    return "buyer";
}

const CommitmentsPage = () => {
    const { t } = useTranslation();
    const [commitments, setCommitments] = useState<CommitmentDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const role = getRole();

    useEffect(() => {
        async function fetch() {
            try {
                const data = role === "farmer"
                    ? await getCommitmentsForFarmer()
                    : await getCommitmentsForBuyer();
                setCommitments(data);
            } catch (err) {
                console.error("[CommitmentsPage] Failed:", err);
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, []);

    const active = commitments.filter((c) => c.status === "pending" || c.status === "accepted");
    const past = commitments.filter((c) => c.status === "rejected" || c.status === "completed");
    const totalValue = active.reduce((sum, c) => sum + c.agreedPrice * c.quantity, 0);
    const pendingCount = commitments.filter((c) => c.status === "pending").length;
    const acceptedCount = commitments.filter((c) => c.status === "accepted").length;

    const statusColor = (status: string) => {
        switch (status) {
            case "accepted": return "bg-status-success/10 text-status-success";
            case "pending": return "bg-yellow-100 text-yellow-700";
            case "rejected": return "bg-red-100 text-red-600";
            case "completed": return "bg-blue-100 text-blue-600";
            default: return "bg-muted text-muted-foreground";
        }
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case "accepted": return <CheckCircle className="w-3 h-3 inline mr-1" />;
            case "rejected": return <XCircle className="w-3 h-3 inline mr-1" />;
            case "pending": return <Clock className="w-3 h-3 inline mr-1" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("commitments.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {role === "farmer" ? t("commitments.subtitleFarmer") : t("commitments.subtitleBuyer")}
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryCard
                    title={t("commitments.activeCommitments")}
                    value={loading ? "..." : String(active.length)}
                    subtitle={pendingCount > 0 ? `${pendingCount} ${t("commitments.pendingApproval")}` : active.length > 0 ? t("commitments.allApproved") : t("commitments.noActiveCommitments")}
                    icon={FileCheck}
                    trend={pendingCount > 0 ? { value: `${pendingCount} ${t("commitments.pendingApproval")}`, positive: false } : undefined}
                />
                <SummaryCard
                    title={t("commitments.totalValue")}
                    value={loading ? "..." : formatCurrency(totalValue)}
                    subtitle={t("commitments.activeContracts")}
                    icon={IndianRupee}
                    trend={totalValue > 0 ? { value: `${active.length} contract${active.length !== 1 ? "s" : ""}`, positive: true } : undefined}
                />
                <SummaryCard
                    title={t("commitments.accepted")}
                    value={loading ? "..." : String(acceptedCount)}
                    subtitle={acceptedCount > 0 ? t("commitments.confirmedContracts") : t("commitments.noAcceptedYet")}
                    icon={CheckCircle}
                />
                <SummaryCard
                    title={t("commitments.totalHistory")}
                    value={loading ? "..." : String(commitments.length)}
                    subtitle={t("commitments.allTimeCommitments")}
                    icon={Clock}
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">{t("commitments.loadingCommitments")}</span>
                </div>
            ) : commitments.length === 0 ? (
                <div className="summary-card text-center py-16">
                    <Handshake className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">{t("commitments.noCommitmentsYet")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {role === "farmer"
                            ? t("commitments.buyerRequestsAppear")
                            : t("commitments.commitOnCrop")}
                    </p>
                </div>
            ) : (
                <>
                    {/* Active Commitments */}
                    {active.length > 0 && (
                        <div className="summary-card">
                            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <FileCheck className="w-5 h-5 text-primary" />
                                {t("commitments.activeCommitments")}
                            </h2>
                            <div className="space-y-3">
                                {active.map((c) => (
                                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-semibold text-sm">{capitalize(c.cropName)}</p>
                                                <span className="text-[10px] text-muted-foreground">#{c.id.slice(0, 7)}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {c.quantity} kg @ {formatCurrency(c.agreedPrice)}/kg
                                                {c.createdAt ? ` · ${formatDate(c.createdAt.toISOString())}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-sm font-bold">{formatCurrency(c.agreedPrice * c.quantity)}</p>
                                            </div>
                                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusColor(c.status)}`}>
                                                {statusIcon(c.status)}
                                                {c.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Past Commitments */}
                    {past.length > 0 && (
                        <div className="summary-card">
                            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-status-success" />
                                {t("commitments.pastCommitments")}
                            </h2>
                            <div className="space-y-3">
                                {past.map((c) => (
                                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/50 rounded-xl">
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm">{capitalize(c.cropName)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {c.quantity} kg · {formatCurrency(c.agreedPrice * c.quantity)}
                                                {c.updatedAt ? ` · ${formatDate(c.updatedAt.toISOString())}` : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-bold">{formatCurrency(c.agreedPrice * c.quantity)}</p>
                                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusColor(c.status)}`}>
                                                {statusIcon(c.status)}
                                                {c.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CommitmentsPage;
