# -*- coding: utf-8 -*-
"""Thử nghiệm Graph2Vec trên trace graph của event log -> phát hiện case bất thường.
So sánh: (A) chỉ cấu trúc, (B) cấu trúc + mức thời gian chờ. Đo AUC theo từng loại lỗi (ground truth).
"""
import hashlib, json, sys
from collections import Counter
import numpy as np
import pandas as pd
from gensim.models.doc2vec import Doc2Vec, TaggedDocument
from sklearn.metrics import roc_auc_score
from sklearn.feature_extraction.text import TfidfVectorizer

OUT = sys.argv[1] if len(sys.argv) > 1 else "output"


def load(name):
    df = pd.read_csv(f"{OUT}/{name}.csv", parse_dates=["start_timestamp", "end_timestamp"], encoding="utf-8-sig")
    df["_row"] = range(len(df))
    df = df.sort_values(["case_id", "start_timestamp", "end_timestamp", "_row"]).reset_index(drop=True)
    prev = df.groupby("case_id").end_timestamp.transform(lambda s: s.cummax().shift())
    df["wait_h"] = ((df.start_timestamp - prev).dt.total_seconds() / 3600).clip(lower=0)
    return df


def labels_for(df, time_aware, q=0.9, attribute_keys=()):
    base = labels_for_time(df, time_aware, q)
    if not attribute_keys:
        return base
    out = []
    for i, b in enumerate(base):
        for k in attribute_keys:
            v = df[k].iloc[i]
            if isinstance(v, str) and v:
                b = f"{b}|{v}"
        out.append(b)
    return out


def labels_for_time(df, time_aware, q=0.9):
    if not time_aware:
        return list(df.activity)
    thr = df.groupby("activity").wait_h.quantile(q)
    out = []
    for a, w in zip(df.activity, df.wait_h):
        slow = (not np.isnan(w)) and w > thr.get(a, np.inf) and w > 0
        out.append(f"{a}|{'SLOW' if slow else 'OK'}")
    return out


def h(s):
    return hashlib.md5(s.encode()).hexdigest()[:12]


def wl_features(nodes, edges, iterations=2, directed=True):
    """nodes: list[label]; edges: list[(u,v)]. Trả về list feature (string) = WL subtree labels mọi vòng."""
    n = len(nodes)
    outs = [[] for _ in range(n)]
    ins = [[] for _ in range(n)]
    for u, v in edges:
        outs[u].append(v)
        ins[v].append(u)
    lab = list(nodes)
    feats = list(lab)
    for _ in range(iterations):
        new = []
        for i in range(n):
            if directed:
                sig = lab[i] + "|in:" + ",".join(sorted(lab[j] for j in ins[i])) + "|out:" + ",".join(sorted(lab[j] for j in outs[i]))
            else:
                sig = lab[i] + "|" + ",".join(sorted(lab[j] for j in ins[i] + outs[i]))
            new.append(h(sig))
        lab = new
        feats += lab
    return feats


def case_graphs(df, time_aware, kind, attribute_keys=()):
    df = df.copy()
    df["lab"] = labels_for(df, time_aware, attribute_keys=attribute_keys)
    graphs = {}
    for cid, g in df.groupby("case_id", sort=True):
        seq = ["START"] + list(g.lab) + ["END"]
        if kind == "chain":          # mỗi event 1 node, cạnh nối event liên tiếp
            nodes = seq
            edges = [(i, i + 1) for i in range(len(seq) - 1)]
        else:                        # DFG của case: node = activity khác nhau, cạnh = directly-follows (tập)
            uniq = list(dict.fromkeys(seq))
            idx = {a: i for i, a in enumerate(uniq)}
            nodes = uniq
            edges = sorted({(idx[a], idx[b]) for a, b in zip(seq, seq[1:])})
        graphs[cid] = (nodes, edges)
    return graphs


def knn_score(X, k=5):
    Xn = X / np.maximum(np.linalg.norm(X, axis=1, keepdims=True), 1e-12)
    S = Xn @ Xn.T
    np.fill_diagonal(S, -np.inf)
    D = 1 - np.sort(S, axis=1)[:, ::-1][:, :k]
    return D.mean(axis=1)


def embed_doc2vec(docs, seed, dims=32, epochs=200):
    tagged = [TaggedDocument(words=d, tags=[str(i)]) for i, d in enumerate(docs)]
    m = Doc2Vec(tagged, vector_size=dims, dm=0, min_count=1, window=0, epochs=epochs, alpha=0.025,
                min_alpha=0.0001, negative=5, seed=seed, workers=1)
    return np.vstack([m.dv[str(i)] for i in range(len(docs))])


def embed_tfidf(docs):
    v = TfidfVectorizer(analyzer=lambda d: d, sublinear_tf=True)
    return v.fit_transform(docs).toarray()


def evaluate(scores, ids, gt):
    scores = [round(float(x), 9) for x in scores]   # so sánh sau khi làm tròn 9 chữ số (hoà = 0,5)
    types = sorted({t for ts in gt.values() for t in ts})
    normal = [i for i, c in enumerate(ids) if not gt[c]]
    res = {}
    for t in types:
        pos = [i for i, c in enumerate(ids) if t in gt[c]]
        y = [1] * len(pos) + [0] * len(normal)
        s = [scores[i] for i in pos] + [scores[i] for i in normal]
        res[t] = (len(pos), roc_auc_score(y, s))
    anyp = [i for i, c in enumerate(ids) if gt[c]]
    y = [1] * len(anyp) + [0] * len(normal)
    res["ANY"] = (len(anyp), roc_auc_score(y, [scores[i] for i in anyp] + [scores[i] for i in normal]))
    # precision@N với N = số case bất thường
    order = sorted(range(len(scores)), key=lambda i: (-scores[i], ids[i]))   # hoà điểm: theo case_id
    n_anom = len(anyp)
    top = set(order[:n_anom])
    res["precision@N"] = (n_anom, len(top & set(anyp)) / n_anom)
    return res


if __name__ == "__main__":
    df = load("event_log_tinh_huong")
    gt_df = pd.read_csv(f"{OUT}/ground_truth_tinh_huong.csv", encoding="utf-8-sig").fillna("")
    gt = {r.case_id: [t for t in r.anomaly_types.split(";") if t] for r in gt_df.itertuples()}
    results = {}
    for kind in ["chain", "dfg"]:
        for ta in [False, True]:
            graphs = case_graphs(df, ta, kind)
            ids = list(graphs)
            docs = [wl_features(*graphs[c]) for c in ids]
            tf = evaluate(knn_score(embed_tfidf(docs)), ids, gt)
            aucs = []
            for seed in range(5):
                aucs.append(evaluate(knn_score(embed_doc2vec(docs, seed)), ids, gt))
            g2v = {t: (aucs[0][t][0], float(np.mean([a[t][1] for a in aucs])), float(np.std([a[t][1] for a in aucs]))) for t in aucs[0]}
            key = f"{kind}/{'time' if ta else 'struct'}"
            results[key] = {"tfidf": tf, "graph2vec": g2v}
            print(f"\n=== {key}")
            print(f"{'type':22s} {'n':>3s}  WL-TFIDF  Graph2Vec(mean±sd, 5 seeds)")
            for t in g2v:
                print(f"{t:22s} {g2v[t][0]:3d}  {tf[t][1]:.3f}     {g2v[t][1]:.3f} ± {g2v[t][2]:.3f}")
    json.dump(results, open("reference/graph2vec_experiment.json", "w"), indent=1, default=float)
