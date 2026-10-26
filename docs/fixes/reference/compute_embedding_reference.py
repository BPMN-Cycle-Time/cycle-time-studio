# -*- coding: utf-8 -*-
"""Số đích cho tab Graph Embedding (Graph2Vec / WL kernel trên trace graph của event log).
Trong repo app:  python docs/fixes/reference/compute_embedding_reference.py docs/fixes/fixtures docs/fixes/fixtures/embedding_reference.json
"""
import json, sys
import numpy as np
sys_argv = list(sys.argv)
OUT = sys_argv[1] if len(sys_argv) > 1 else "output"
DEST = sys_argv[2] if len(sys_argv) > 2 else "reference/embedding_reference.json"
sys.argv = ["x", OUT]
import os
here = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(here, "graph2vec_experiment.py"), encoding="utf-8").read().split("if __name__")[0])
import pandas as pd

df = load("event_log_tinh_huong")
gt_df = pd.read_csv(f"{OUT}/ground_truth_tinh_huong.csv", encoding="utf-8-sig").fillna("")
gt = {r.case_id: [t for t in r.anomaly_types.split(";") if t] for r in gt_df.itertuples()}
ref = {"settings": {"wlIterations": 2, "directed": True, "graph": "chain (START → events → END)",
                    "slowQuantile": 0.9, "knnK": 20, "graph2vec": {"dimensions": 32, "epochs": 200, "negative": 5,
                    "learningRate": 0.025, "minLearningRate": 0.0001}}}
MODES = {"structure": (False, ()), "timeAware": (True, ()), "timeAndAttributes": (True, ("review_result",))}
for key, (ta, attrs) in MODES.items():
    graphs = case_graphs(df, ta, "chain", attrs)
    ids = list(graphs)
    docs = [wl_features(*graphs[c]) for c in ids]
    s_tf = knn_score(embed_tfidf(docs), 20)
    ev_tf = evaluate(s_tf, ids, gt)
    g = [evaluate(knn_score(embed_doc2vec(docs, seed), 20), ids, gt) for seed in range(5)]
    ref[key] = {
        "featureCountPerCase": {c: len(d) for c, d in zip(ids, docs)},
        "distinctFeatures": len({f for d in docs for f in d}),
        "wlKernelScores": {c: float(s) for c, s in zip(ids, s_tf)},
        "wlKernelAuc": {t: {"count": v[0], "auc": float(v[1])} for t, v in ev_tf.items()},
        "graph2vecAucMean": {t: float(np.mean([x[t][1] for x in g])) for t in g[0]},
        "graph2vecAucMin": {t: float(np.min([x[t][1] for x in g])) for t in g[0]},
    }
    if ta:
        lab = labels_for(df, True, attribute_keys=attrs)
        ref[key]["slowEvents"] = int(sum(1 for x in lab if "|SLOW" in x))
json.dump(ref, open(DEST, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for key in MODES:
    r = ref[key]
    print(f"\n{key}: distinct WL features {r['distinctFeatures']}" + (f", SLOW events {r['slowEvents']}" if 'slowEvents' in r else ""))
    for t in r["wlKernelAuc"]:
        print(f"  {t:22s} n={r['wlKernelAuc'][t]['count']:3d}  WL-kernel {r['wlKernelAuc'][t]['auc']:.3f}   Graph2Vec mean {r['graph2vecAucMean'][t]:.3f} min {r['graph2vecAucMin'][t]:.3f}")
