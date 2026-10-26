# -*- coding: utf-8 -*-
"""Node2Vec (Grover & Leskovec 2016) cài đặt trực tiếp: random walk bậc 2 (p, q) + skip-gram negative sampling.
Tìm các tính chất ổn định để làm bài kiểm tra cho bản TypeScript.
"""
import json, sys, xml.etree.ElementTree as ET
from collections import defaultdict
import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import adjusted_rand_score

NS = {"b": "http://www.omg.org/spec/BPMN/20100524/MODEL"}


def bpmn_graph(path):
    root = ET.parse(path).getroot()
    proc = root.find("b:process", NS)
    names, edges = {}, []
    for el in proc:
        tag = el.tag.split("}")[1]
        if tag in ("laneSet", "textAnnotation", "association"):
            continue
        if tag == "sequenceFlow":
            edges.append((el.get("sourceRef"), el.get("targetRef")))
        else:
            names[el.get("id")] = el.get("name") or el.get("id")
    return names, edges


def adj_undirected(nodes, edges):
    A = defaultdict(set)
    for u, v in edges:
        if u != v:
            A[u].add(v)
            A[v].add(u)
    return {n: sorted(A[n]) for n in nodes}


def walk(A, start, length, p, q, rng):
    w = [start]
    while len(w) < length:
        cur = w[-1]
        nb = A[cur]
        if not nb:
            break
        if len(w) == 1:
            w.append(nb[rng.integers(len(nb))])
            continue
        prev = w[-2]
        weights = np.array([1 / p if x == prev else (1.0 if x in A[prev] else 1 / q) for x in nb])
        w.append(nb[rng.choice(len(nb), p=weights / weights.sum())])
    return w


def sgns(walks, vocab, dims, window, negative, epochs, rng, lr0=0.025, lr_min=0.0001):
    idx = {v: i for i, v in enumerate(vocab)}
    V = len(vocab)
    W = (rng.random((V, dims)) - 0.5) / dims
    C = np.zeros((V, dims))
    cnt = np.zeros(V)
    for wk in walks:
        for x in wk:
            cnt[idx[x]] += 1
    pn = cnt ** 0.75
    pn /= pn.sum()
    pairs = []
    for wk in walks:
        ii = [idx[x] for x in wk]
        for i, c in enumerate(ii):
            for j in range(max(0, i - window), min(len(ii), i + window + 1)):
                if j != i:
                    pairs.append((c, ii[j]))
    pairs = np.array(pairs)
    total = epochs * len(pairs)
    step = 0
    sig = lambda z: 1 / (1 + np.exp(-np.clip(z, -10, 10)))
    for _ in range(epochs):
        for c, o in pairs[rng.permutation(len(pairs))]:
            lr = lr0 - (lr0 - lr_min) * step / total
            step += 1
            targets = np.concatenate(([o], rng.choice(V, size=negative, p=pn)))
            labels = np.zeros(negative + 1)
            labels[0] = 1
            g = (labels - sig(C[targets] @ W[c])) * lr
            dw = g @ C[targets]
            C[targets] += np.outer(g, W[c])
            W[c] += dw
    return {v: W[idx[v]] for v in vocab}


def node2vec(nodes, edges, seed, dims=16, walk_length=10, num_walks=100, p=1.0, q=1.0, window=5, negative=5, epochs=1):
    rng = np.random.default_rng(seed)
    A = adj_undirected(nodes, edges)
    walks = []
    for _ in range(num_walks):
        for n in rng.permutation(nodes):
            walks.append(walk(A, n, walk_length, p, q, rng))
    return sgns(walks, list(nodes), dims, window, negative, epochs, rng)


def cos(a, b):
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))


if __name__ == "__main__":
    out = {}
    # N1: xác suất chuyển của random walk bậc 2 (tính lý thuyết)
    # đồ thị: a-b, b-c, b-d, c-d ; walk đang ở b, đến từ a. p=0.5 q=2
    A = adj_undirected(list("abcd"), [("a", "b"), ("b", "c"), ("b", "d"), ("c", "d"), ("a", "c")])
    rng = np.random.default_rng(1)
    cnt = defaultdict(int)
    for _ in range(20000):
        w = ["a", "b"]
        nb = A["b"]
        weights = np.array([1 / 0.5 if x == "a" else (1.0 if x in A["a"] else 1 / 2) for x in nb])
        cnt[nb[rng.choice(len(nb), p=weights / weights.sum())]] += 1
    print("N1 empirical from b (prev a), p=0.5 q=2:", {k: v / 20000 for k, v in cnt.items()}, "neighbors", A["b"])

    # N2: 2 cộng đồng (2 clique K6 nối bằng 1 cạnh)
    nodes = [f"L{i}" for i in range(6)] + [f"R{i}" for i in range(6)]
    edges = [(f"L{i}", f"L{j}") for i in range(6) for j in range(i + 1, 6)] + \
            [(f"R{i}", f"R{j}") for i in range(6) for j in range(i + 1, 6)] + [("L0", "R0")]
    aris = []
    for seed in range(5):
        E = node2vec(nodes, edges, seed, num_walks=20, p=1, q=2)
        X = np.vstack([E[n] / np.linalg.norm(E[n]) for n in nodes])
        lab = KMeans(2, n_init=10, random_state=0).fit_predict(X)
        aris.append(adjusted_rand_score([0] * 6 + [1] * 6, lab))
    print("N2 barbell ARI per seed:", aris)
    out["N2_ari"] = aris

    # N3: BPMN fixture
    names, edges = bpmn_graph(sys.argv[1] if len(sys.argv) > 1 else "output/FE_Code_Review.bpmn")
    ids = list(names)
    byname = {v: k for k, v in names.items()}
    res = []
    for seed in range(5):
        for (p, q) in [(1, 1), (0.5, 2)]:
            E = node2vec(ids, edges, seed, p=p, q=q, num_walks=50)
            bot, fix, rec, lead, merge = (E[byname[n]] for n in ["AI Bot Code Review", "Fix Review Comments", "Receive Task on ClickUp", "FE Lead Review", "Merge Code"])
            res.append({"seed": seed, "p": p, "q": q, "bot_fix": cos(bot, fix), "bot_receive": cos(bot, rec),
                        "lead_fix": cos(lead, fix), "lead_receive": cos(lead, rec)})
    for r in res:
        print("N3", r)
    out["N3"] = res
    print(json.dumps({"N2_ari": out["N2_ari"]}))
