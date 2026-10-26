# -*- coding: utf-8 -*-
"""Tính số đích cho phân tích hiệu năng (thời gian chờ) và hiệu chỉnh mô hình từ event log.
Định nghĩa phải khớp với docs/fixes/PERFORMANCE_CALIBRATION_FIX.md.
Trong repo app:
    python docs/fixes/reference/compute_reference.py docs/fixes/fixtures docs/fixes/fixtures/performance_reference.json
(cần pandas + numpy)
"""
import json, sys
import numpy as np
import pandas as pd

OUT = sys.argv[1] if len(sys.argv) > 1 else "output"
DEST = sys.argv[2] if len(sys.argv) > 2 else "reference/performance_reference.json"

def stats(x):
    x = np.asarray(x, dtype=float)
    if len(x) == 0:
        return None
    return {"count": int(len(x)), "mean": float(x.mean()), "median": float(np.quantile(x, .5)),
            "p90": float(np.quantile(x, .9)), "p95": float(np.quantile(x, .95)), "max": float(x.max()),
            "total": float(x.sum())}

BLOCKS = [(8 * 60 + 30, 12 * 60), (13 * 60, 17 * 60 + 30)]   # T2-T6


def work_hours(a, b):
    """Số giờ làm việc giữa 2 thời điểm (lịch T2-T6, 8:30-12:00, 13:00-17:30)."""
    if pd.isna(a) or pd.isna(b) or b <= a:
        return 0.0
    total = 0.0
    day = a.normalize()
    while day <= b.normalize():
        if day.weekday() < 5:
            for s, e in BLOCKS:
                bs, be = day + pd.Timedelta(minutes=s), day + pd.Timedelta(minutes=e)
                lo, hi = max(a, bs), min(b, be)
                if hi > lo:
                    total += (hi - lo).total_seconds() / 3600
        day += pd.Timedelta(days=1)
    return total


def load(name):
    df = pd.read_csv(f"{OUT}/{name}.csv", parse_dates=["start_timestamp", "end_timestamp"], encoding="utf-8-sig")
    df["_row"] = range(len(df))
    df = df.sort_values(["case_id", "start_timestamp", "end_timestamp", "_row"]).reset_index(drop=True)
    df["proc_h"] = (df.end_timestamp - df.start_timestamp).dt.total_seconds() / 3600
    prev_max_end = df.groupby("case_id").end_timestamp.transform(lambda s: s.cummax().shift())
    w = (df.start_timestamp - prev_max_end).dt.total_seconds() / 3600
    df["wait_h"] = w.clip(lower=0)          # NaN cho event đầu case
    df["proc_wh"] = [work_hours(a, b) for a, b in zip(df.start_timestamp, df.end_timestamp)]
    df["wait_wh"] = [np.nan if pd.isna(p) else work_hours(p, a) for p, a in zip(prev_max_end, df.start_timestamp)]
    return df


def performance_work(df):
    acts = {a: {"processing": stats(g.proc_wh), "waiting": stats(g.wait_wh.dropna())} for a, g in df.groupby("activity")}
    c = df.groupby("case_id").agg(s=("start_timestamp", "min"), e=("end_timestamp", "max"), p=("proc_wh", "sum"))
    c["ct"] = [work_hours(a, b) for a, b in zip(c.s, c.e)]
    return {"activities": acts, "cases": {"cycleTime": stats(c.ct), "processing": stats(c.p),
            "cteOverall": float(c.p.sum() / c.ct.sum())}}

def performance(df):
    acts = {}
    for a, g in df.groupby("activity"):
        acts[a] = {"processing": stats(g.proc_h), "waiting": stats(g.wait_h.dropna())}
    res = {}
    for r, g in df.groupby("resource"):
        res[r] = {"processing": stats(g.proc_h), "waiting": stats(g.wait_h.dropna())}
    c = df.groupby("case_id").agg(s=("start_timestamp", "min"), e=("end_timestamp", "max"),
                                  p=("proc_h", "sum"), w=("wait_h", "sum"))
    c["ct"] = (c.e - c.s).dt.total_seconds() / 3600
    total_wait = float(df.wait_h.sum())
    ranking = sorted(((a, v["waiting"]["total"] / total_wait) for a, v in acts.items() if v["waiting"]),
                     key=lambda x: -x[1])
    return {"activities": acts, "resources": res,
            "cases": {"count": int(len(c)), "cycleTime": stats(c.ct), "processing": stats(c.p),
                      "waiting": stats(c.w), "cteOverall": float(c.p.sum() / c.ct.sum()),
                      "cteMeanOfCases": float((c.p / c.ct).mean())},
            "waitingShareRanking": [{"activity": a, "share": s} for a, s in ranking]}

def calibration(df):
    seqs = [list(g.activity) for _, g in df.groupby("case_id", sort=False)]
    n = len(seqs)
    def after(a):
        return [s[i + 1] for s in seqs for i, x in enumerate(s) if x == a and i + 1 < len(s)]
    nxt_an = after("Analyze Spec, Figma, API")
    nxt_code = after("Write Code & Integrate")
    nxt_bot = after("AI Bot Code Review")
    nxt_lead = after("FE Lead Review")
    bot_pass = [x for x in nxt_bot if x != "Fix Review Comments"]
    bot_count = sum(s.count("AI Bot Code Review") for s in seqs)
    p = lambda xs, v: 100 * sum(1 for x in xs if x == v) / len(xs)
    gw = {
        "Spec clear?": {"No": p(nxt_an, "Ask PM to Clarify Spec"), "Yes": p(nxt_an, "Create New Branch")},
        "API ready?": {"No": p(nxt_code, "Integrate Real API"), "Yes": p(nxt_code, "Create Pull Request")},
        "Bot passed?": {"Fix Review Comments": p(nxt_bot, "Fix Review Comments"),
                        "Yes": 100 - p(nxt_bot, "Fix Review Comments")},
        "Important PR?": {"Yes": p(bot_pass, "FE Lead Review"), "No": 100 - p(bot_pass, "FE Lead Review")},
        "Code Approved?": {"Fix Review Comments": p(nxt_lead, "Fix Review Comments"),
                           "Approved": 100 - p(nxt_lead, "Fix Review Comments")},
    }
    loop_p = 100 * (1 - n / bot_count)
    med = df.groupby("activity").proc_h.median().to_dict()
    mean = df.groupby("activity").proc_h.mean().to_dict()
    occ = df.groupby("activity").size() / n
    expected_proc_mean = float(sum(mean[a] * occ[a] for a in mean))
    return {"cases": n, "gatewayProbabilities": gw, "reworkLoopP": loop_p,
            "taskTimeMedianHours": med, "taskTimeMeanHours": mean,
            "occurrencesPerCase": occ.to_dict(),
            "expectedProcessingPerCaseHours_meanTimes": expected_proc_mean,
            "observedMeanCaseProcessingHours": float(df.groupby("case_id").proc_h.sum().mean())}

ref = {}
for name in ["event_log_chuan", "event_log_tinh_huong"]:
    d = load(name)
    ref[name] = {"performance": performance(d), "performanceWorkingHours": performance_work(d)}
    if name == "event_log_chuan":
        ref[name]["calibration"] = calibration(d)
json.dump(ref, open(DEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# tóm tắt
for name in ref:
    P = ref[name]["performance"]
    A = P["activities"]
    print(f"\n== {name}")
    for a in ["AI Bot Code Review", "FE Lead Review", "Integrate Real API", "Merge Code", "Clarify Spec"]:
        w = A[a]["waiting"]
        print(f"  wait {a:22s} n={w['count']:4d} median={w['median']:.3f}h p95={w['p95']:.3f}h max={w['max']:.2f}h")
    print("  ranking:", [(r['activity'], round(r['share'], 3)) for r in P["waitingShareRanking"][:5]])
    print("  CTE overall", round(P["cases"]["cteOverall"], 4), "cycle median", round(P["cases"]["cycleTime"]["median"], 2))
for name in ref:
    W = ref[name]["performanceWorkingHours"]
    print(f"WORKING HOURS {name}: Lead wait median {W['activities']['FE Lead Review']['waiting']['median']:.3f}h,"
          f" Bot wait p95 {W['activities']['AI Bot Code Review']['waiting']['p95']:.3f}h, CTE {W['cases']['cteOverall']:.4f},"
          f" Write Code proc median {W['activities']['Write Code & Integrate']['processing']['median']:.2f}h")
C = ref["event_log_chuan"]["calibration"]
print("\ncalibration:", json.dumps(C["gatewayProbabilities"], indent=0)[:600])
print("loopP", C["reworkLoopP"], "expected", C["expectedProcessingPerCaseHours_meanTimes"], "observed", C["observedMeanCaseProcessingHours"])
