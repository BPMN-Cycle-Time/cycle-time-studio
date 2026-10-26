# Feature: Tab "Graph Embedding" — Node2Vec + Graph2Vec cho BPMN và Event Log

> Tài liệu giao việc cho AI agent / developer. Đọc hết trước khi code.
> Tuân thủ toàn bộ `AGENTS.md` (không `any`, file < 500 dòng, i18n en + vi đồng bộ, kebab-case, barrel export,
> shadcn/ui + Tailwind, panel inline không dùng `Sheet`, `npx tsc --noEmit` và `npx eslint .` 0 lỗi 0 cảnh báo).
> Làm tiếp trên branch hiện tại (đã có import BPMN/log, tab Hiệu năng, hiệu chỉnh từ log).

## 0. Mục tiêu & nghiệm thu

Phần cuối của bài thuyết trình ("Bài 6 + 7 mở rộng cho event log") phải demo được **trong app**:

1. **Node2Vec** trên đồ thị quy trình (BP2Graph của tab Graph) và trên mạng bàn giao (handover) — làm lại Phần VI
   của report ngay trong app: vector nút, phân cụm, nút tương tự.
2. **Graph2Vec trên event log**: mỗi case → một _trace graph_ → vector → điểm bất thường → xếp hạng case; nạp
   `ground_truth_tinh_huong.csv` để đo AUC / precision@N theo từng loại lỗi và so với Conformance.
   **Kết quả nghiên cứu cần thể hiện được**: chỉ dùng cấu trúc thì bắt tốt lỗi luồng nhưng gần như mù lỗi thời gian;
   gắn mức chờ (SLOW/OK) vào nhãn nút thì bắt được bot quá tải / chờ API / Lead vắng; gắn thêm thuộc tính
   `review_result` thì bắt được "merge khi bot yêu cầu sửa" — loại mà conformance theo luồng bỏ sót.
3. **So sánh mô hình** (AS-IS vs TO-BE) bằng WL kernel.

```bash
npx tsx scripts/verify-graph-embedding.ts           # phải in "ALL REQUIRED CHECKS PASSED"
npx tsx scripts/verify-performance-calibration.ts   # vẫn PASS
npx tsx scripts/verify-event-log-import.ts          # vẫn PASS
npx tsc --noEmit && npx eslint .                    # 0 lỗi, 0 cảnh báo
```

Trạng thái hiện tại: **toàn bộ check REQUIRED FAIL** (G0 + module chưa tồn tại).

Quy tắc: **không** sửa `docs/fixes/fixtures/*` (kể cả `embedding_reference.json`) và **không** nới ngưỡng trong
script. Số đích tính độc lập bằng numpy / scikit-learn / gensim (`docs/fixes/reference/*.py`). Đã kiểm chứng: một
cài đặt TypeScript đúng định nghĩa dưới đây đạt **mọi check trừ G0** (G0 cần sửa `buildProcessGraph`), Graph2Vec
159 case chạy ~1,5 s trong Node.

## 1. Lỗi cần sửa trước: G0 — BP2Graph vẽ nhánh rỗng thành task giả

`services/graph/graph-builder.ts` – `buildProcessGraph`: nhánh XOR rỗng (quy ước `mode: SIMPLE`, không `taskId`,
không `subBlocks`, `t: 0` – xem `EVENT_LOG_IMPORT_FIX.md`) đang thành node `task` tên "Yes" / "No" / "Approved"
(template `p2p`: "Rejected"). Phải là **cạnh thẳng split → join** (giữ nhãn cạnh). Fixture sau khi sửa:
**25 node, 30 cạnh**. Ảnh hưởng: thống kê |V|, |E| của tab Graph, cyclomatic, và Node2Vec.

## 2. Định nghĩa thuật toán (bắt buộc)

Mọi ngẫu nhiên dùng **PRNG có seed** (ví dụ mulberry32), **không** dùng `Math.random`. Cùng seed ⇒ cùng kết quả.

### 2.1 Đồ thị chung

`LabeledGraph { nodes: {id, label}[]; edges: {source, target, weight?}[] }` (có hướng).

- `processGraphToLabeledGraph(pg)`: node = `ProcessGraphNode` (label = `name`), cạnh = `ProcessGraphEdge` (`s → t`,
  kể cả cạnh quay lui `back`).
- `socialNetworkToLabeledGraph(sn)`: node = resource, cạnh = handover, `weight` = số lần bàn giao.

### 2.2 Node2Vec (Grover & Leskovec 2016)

- Đồ thị **vô hướng hóa** (cộng trọng số hai chiều, bỏ self-loop).
- Bước đầu của walk: chọn hàng xóm tỉ lệ theo trọng số cạnh. Các bước sau, đang ở `cur` và đến từ `prev`, trọng số
  hàng xóm `x` = `w(cur,x) · α`, với `α = 1/p` nếu `x = prev`; `α = 1` nếu `x` kề `prev`; `α = 1/q` còn lại.
  `node2vecTransitionProbabilities(g, prev | null, cur, p, q)` trả xác suất đã chuẩn hóa.
- `numWalks` vòng; mỗi vòng xáo trộn thứ tự node (seed) rồi đi 1 walk dài `walkLength` **node** từ mỗi node.
- Skip-gram negative sampling: cửa sổ `window`, `negative` mẫu âm lấy theo phân phối unigram^0.75, sigmoid kẹp
  [−10, 10], learning rate giảm tuyến tính `learningRate → minLearningRate` trên tổng số cập nhật, khởi tạo vector
  đầu vào uniform(−0,5/d, 0,5/d), vector ngữ cảnh = 0, xáo trộn cặp (center, context) mỗi epoch.
- Mặc định: `dimensions 16, walkLength 10, numWalks 100, p 1, q 1, window 5, negative 5, epochs 1, lr 0.025 → 0.0001,
seed 42` (giống cấu hình Phần VI của report). Trả `Record<nodeId, number[]>`.
- `kMeans(vectors, k, {seed, nInit = 10, maxIter = 100})`: khởi tạo k-means++, Lloyd, lấy lần chạy inertia nhỏ nhất.
- `pca2d(vectors)`: trừ trung bình, 2 thành phần chính (power iteration), dấu chuẩn hóa (thành phần |lớn nhất| dương).
- `cosineSimilarity(a, b)`.

### 2.3 Trace graph của event log

`buildTraceGraphs(events, { timeAware?, slowQuantile = 0.9, attributeKeys? })` → `{ caseId, graph }[]` **sắp theo
`caseId` tăng dần**.

- Thứ tự event trong case **giống hệt** `analyzePerformance` (start ↑, complete ↑, thứ tự gốc).
- Graph dạng **chuỗi**: `START → e1 → e2 → … → en → END` (n + 2 node, n + 1 cạnh). id node: `${caseId}#${i}`.
- Nhãn: `START`, `END`; event = `activity`.
  - `timeAware`: thêm `|SLOW` nếu thời gian chờ của event (định nghĩa ở `PERFORMANCE_CALIBRATION_FIX.md`) **> 0 và >
    phân vị `slowQuantile`** (nội suy tuyến tính) của thời gian chờ của cùng activity trong toàn log; ngược lại `|OK`.
    Event đầu case (không có chờ) luôn `|OK`.
  - `attributeKeys`: với mỗi key theo thứ tự, nếu `event.attributes[key]` khác rỗng thì thêm `|${value}`.
  - Ví dụ: `AI Bot Code Review|SLOW|changes_requested`.

### 2.4 Weisfeiler–Lehman features & WL kernel

- `wlSubtreeFeatures(graph, iterations = 2)`: vòng 0 nhãn = label của node; vòng i nhãn mới = hàm **đơn ánh** của
  (nhãn cũ, multiset nhãn hàng xóm **vào** đã sắp xếp, multiset nhãn hàng xóm **ra** đã sắp xếp). Trả multiset nhãn của
  mọi node ở mọi vòng 0..h (⇒ 3 · |V| feature với h = 2). Nhãn ở các vòng khác nhau không được trùng nhau; cùng cấu trúc
  ⇒ cùng nhãn trên toàn bộ tập graph (dùng chuỗi chữ ký hoặc từ điển chung, không hash có va chạm).
- `wlKernelVectors(docs)`: TF-IDF **giống scikit-learn `TfidfVectorizer(sublinear_tf=True)`**:
  `tf = 1 + ln(count)`, `idf = ln((1 + n) / (1 + df)) + 1`, chuẩn hóa L2 theo hàng.
- `wlKernelSimilarity(a, b, iterations = 2)`: cosine giữa vector **đếm thô** WL feature của hai graph.

### 2.5 Graph2Vec (Narayanan et al. 2017)

`graph2vec(docs, options)`: **PV-DBOW** (doc2vec `dm = 0`) — mỗi graph là một "tài liệu" có vector riêng, học dự
đoán các WL feature của nó bằng negative sampling (như 2.2, không có cửa sổ). Mặc định `dimensions 32, epochs 200,
negative 5, lr 0.025 → 0.0001, seed 42`. Trả `number[][]` cùng thứ tự `docs`.

### 2.6 Điểm bất thường & đánh giá

- `knnAnomalyScores(vectors, k = 20)`: chuẩn hóa L2, cosine; điểm = trung bình `(1 − sim)` với `min(k, n − 1)` hàng
  xóm gần nhất (không tính chính nó). Điểm cao = bất thường. (k = 20 để nhóm case lỗi giống nhau — 8 hotfix — không
  che lẫn nhau; với k = 5 `skip_bot` chỉ đạt AUC ≈ 0,02.)
- `parseGroundTruthCsv(text)` → `Record<caseId, anomalyTypes[]>` (cột `case_id, anomaly_types` phân cách `;`, bỏ BOM).
- `evaluateAnomalyScores(caseIds, scores, groundTruth)`: **làm tròn điểm tới 9 chữ số thập phân** rồi:
  - AUC từng loại = Mann–Whitney giữa case có loại đó và case **không có nhãn nào** (hòa = 0,5); `any` = mọi case có
    nhãn vs case không nhãn.
  - `precisionAtN`: N = số case có nhãn; sắp điểm giảm dần, hòa thì `caseId` tăng dần; tỉ lệ case có nhãn trong top N.

## 3. API contract (script gọi đúng tên/kiểu)

Module `services/graph-embedding/` (barrel `index.ts`, chia file < 500 dòng, ví dụ `node2vec.ts`, `sgns.ts`,
`clustering.ts`, `trace-graphs.ts`, `wl.ts`, `graph2vec.ts`, `anomaly.ts`, `random.ts`); type ở `types/graph-embedding.ts`.

```ts
export interface LabeledGraph { nodes: { id: string; label: string }[]; edges: { source: string; target: string; weight?: number }[] }
export interface Node2VecOptions { dimensions?; walkLength?; numWalks?; p?; q?; window?; negative?; epochs?; learningRate?; minLearningRate?; seed? } // number
export interface Graph2VecOptions { dimensions?; epochs?; negative?; learningRate?; minLearningRate?; seed? } // number
export interface AnomalyEvaluation { byType: Record<string, { count: number; auc: number }>; any: { count: number; auc: number }; precisionAtN: number }

node2vecTransitionProbabilities(graph, previous: string | null, current: string, p: number, q: number): Record<string, number>
node2vec(graph, options?): Record<string, number[]>
processGraphToLabeledGraph(pg: ProcessGraph): LabeledGraph
socialNetworkToLabeledGraph(sn: SocialNetworkData): LabeledGraph
kMeans(vectors, k, { seed?, nInit?, maxIter? }?): { labels: number[]; centroids: number[][]; inertia: number }
pca2d(vectors): [number, number][]
cosineSimilarity(a, b): number
buildTraceGraphs(events, { timeAware?, slowQuantile?, attributeKeys? }?): { caseId: string; graph: LabeledGraph }[]
wlSubtreeFeatures(graph, iterations?): string[]
wlKernelVectors(docs: string[][]): number[][]
wlKernelSimilarity(a, b, iterations?): number
graph2vec(docs: string[][], options?): number[][]
knnAnomalyScores(vectors, k?): number[]
parseGroundTruthCsv(text): Record<string, string[]>
evaluateAnomalyScores(caseIds, scores, groundTruth): AnomalyEvaluation
```

Các hàm là **thuần, đồng bộ** (script gọi trực tiếp). UI chạy chúng trong **Web Worker** (Next.js:
`new Worker(new URL("./graph-embedding.worker.ts", import.meta.url))`) để không đơ giao diện, có trạng thái đang chạy
và nút hủy.

## 4. Giao diện (để demo)

Tab mới `DiagramTab = "embedding"` — nhãn "Graph Embedding" / "Nhúng đồ thị" — theo pattern
`docs/FEATURE_TABS_PLAN.md`, trong `components/diagram/embedding/…`, chia 3 tab con (shadcn `Tabs`):

1. **Node2Vec**
   - Nguồn: _Đồ thị quy trình_ (BP2Graph hiện tại) hoặc _Mạng bàn giao_ (từ event log đã nạp).
   - Tham số: dimensions, walk length, num walks, p, q, window, epochs, seed, K (k-means). Nút Chạy.
   - Biểu đồ phân tán 2D (PCA, recharts `ScatterChart`) tô màu theo cụm, có nhãn node.
   - Chọn một node ⇒ bảng top-5 node tương tự nhất (cosine). Bảng thành viên từng cụm.
2. **Bất thường trong log (Graph2Vec)**
   - Phương pháp: Graph2Vec / WL kernel. Nhãn nút: _Cấu trúc_ / _+ Thời gian chờ_ / _+ Thuộc tính_ (chọn key từ
     `attributes` có trong log, mặc định `review_result`). Tham số: k, dimensions, epochs, seed, slow quantile.
   - Bảng case xếp theo điểm (hạng, điểm, số event, số event SLOW, chuỗi activity rút gọn); biểu đồ 2D các case.
   - Nút "Nạp ground truth" (CSV) ⇒ bảng chỉ số theo loại lỗi: số case, AUC, kèm cột **"Conformance phát hiện"**
     (% case của loại đó bị `analyzeConformance` đánh dấu không tuân thủ trên mô hình hiện tại).
   - Nút **"So sánh 3 chế độ nhãn"**: chạy cả 3 chế độ và hiện bảng AUC 3 cột (đây là slide kết quả nghiên cứu).
3. **So sánh mô hình**
   - So BP2Graph của project hiện tại với một project khác (chọn từ danh sách) hoặc file `.bpmn` tải lên (TO-BE):
     WL kernel similarity tổng và theo từng vòng 0..2, số node / cạnh / cyclomatic của mỗi bên.

Toàn bộ chữ qua `useTranslations`, cập nhật **cả** `en` và `vi`; component shadcn/ui; mỗi file < 500 dòng; cập nhật
`docs/ARCHITECTURE.md` và `docs/FORMULAS.md` (công thức Node2Vec / WL / TF-IDF / AUC).

## 5. Số đích để đối chiếu khi demo (log tình huống, k = 20)

AUC theo loại lỗi — **WL kernel** (tất định) / **Graph2Vec** (trung bình 5 seed):

| Loại lỗi (số case)       | Cấu trúc        | + Thời gian chờ | + Thuộc tính `review_result` | Conformance theo luồng       |
| ------------------------ | --------------- | --------------- | ---------------------------- | ---------------------------- |
| merge_before_approve (4) | 0,99 / 1,00     | 0,91 / 0,95     | 0,89 / 0,92                  | bắt 100 %                    |
| spec_pingpong (8)        | 0,94 / 0,97     | 0,90 / 0,93     | 0,90 / 0,92                  | không                        |
| excessive_rework (10)    | 0,86 / 0,87     | 0,81 / 0,92     | 0,79 / 0,92                  | không                        |
| skip_bot (8)             | 0,97 / 0,88     | 0,79 / 0,70     | 0,78 / 0,66                  | bắt 100 %                    |
| bot_overload (19)        | **0,53 / 0,54** | **0,92 / 0,89** | 0,93 / 0,91                  | không                        |
| api_long_wait (5)        | 0,70 / 0,68     | 0,90 / 0,87     | 0,91 / 0,85                  | không                        |
| lead_absent (3)          | 0,94 / 0,91     | 0,95 / 0,96     | 0,91 / 0,94                  | không                        |
| ignore_bot (8)           | 0,32 / 0,34     | **0,56 / 0,53** | **0,92 / 0,91**              | không                        |
| skip_lead (4)            | 0,57 / 0,58     | 0,75 / 0,74     | 0,75 / 0,73                  | không                        |
| wrong_role (3)           | 0,94 / 0,97     | 0,80 / 0,89     | 0,80 / 0,89                  | bắt 100 % (kiểm tra vai trò) |
| **Tất cả (59)**          | 0,72 / 0,72     | 0,82 / 0,82     | **0,87 / 0,86**              | —                            |

Node2Vec trên BP2Graph của fixture (p = q = 1): cos(AI Bot Code Review, Fix Review Comments) ≈ 0,86–0,93;
cos(AI Bot Code Review, Receive Task on ClickUp) ≈ −0,6 (các bước trong vòng review nằm gần nhau).

## 6. Ngoài phạm vi / Phase 2

- Xuất vector ra CSV; t-SNE; LOF / Isolation Forest; giải thích feature WL đóng góp nhiều nhất cho một case bất thường.
