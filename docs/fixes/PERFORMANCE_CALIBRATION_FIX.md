# Feature: Phân tích thời gian chờ từ Event Log + Hiệu chỉnh mô hình từ log

> Tài liệu giao việc cho AI agent / developer. Đọc hết trước khi code.
> Tuân thủ toàn bộ `AGENTS.md` (không `any`, file < 500 dòng, i18n en + vi đồng bộ, kebab-case, barrel export,
> shadcn/ui + Tailwind, panel inline không dùng `Sheet`, `npx tsc --noEmit` và `npx eslint .` 0 lỗi 0 cảnh báo).
> Làm tiếp trên nền branch `fix/event-log-import` (đã import được BPMN + log, xem `EVENT_LOG_IMPORT_FIX.md`).

## 0. Mục tiêu & nghiệm thu

Người dùng sẽ **demo toàn bộ bài thuyết trình trên app**: BPMN gốc → log chuẩn → log có tình huống → phát hiện điểm nghẽn →
đề xuất cải tiến. App hiện thiếu 2 thứ:

1. **Không có phân tích thời gian chờ (waiting time) từ event log.** SLA chỉ đo thời gian xử lý; BPR
   (`detectBottleneckIssues`) tìm điểm nghẽn từ thời gian task **trong mô hình**, không từ log. Các phát hiện chính của
   bài (Lead chỉ review buổi sáng, AI Bot quá tải cuối sprint, chờ API backend) đều là thời gian chờ.
2. **Tham số mô hình không lấy từ log.** Sau khi import BPMN, mọi task = 1h, nhánh XOR 50/50, loop 20% ⇒ Cycle Time,
   Monte Carlo, BPR tính trên số mặc định. Ngoài ra xác suất nhánh XOR **mất khi export → import**.

Nghiệm thu:

```bash
npx tsx scripts/verify-performance-calibration.ts   # phải in "ALL REQUIRED CHECKS PASSED"
npx tsx scripts/verify-event-log-import.ts          # vẫn phải PASS (không hồi quy)
npx tsc --noEmit && npx eslint .                    # 0 lỗi, 0 cảnh báo
```

Trạng thái hiện tại: **11 check REQUIRED FAIL** (P1–P5, K1–K5, R1).

Quy tắc: **không** sửa `docs/fixes/fixtures/*` (kể cả `performance_reference.json`) và **không** nới lỏng điều kiện /
dung sai trong script. Số đích được tính độc lập bằng pandas/numpy (`docs/fixes/reference/compute_reference.py`).
Đã kiểm chứng: một cài đặt đúng định nghĩa dưới đây đạt P1–P6 ở mọi múi giờ, và engine `computeFlow` hiện tại cho
đúng 54,859 h khi điền đúng xác suất/thời gian (K4 khả thi, không cần sửa engine).

## 1. Định nghĩa (bắt buộc dùng đúng)

Đơn vị thời gian của service: **giờ** (số thực). Tính từ `startTimestamp` / `completeTimestamp`, **không** dùng field
`duration` (đã bị làm tròn 2 chữ số và kẹp tối thiểu 0,1h).

- **Thứ tự event trong case:** sắp theo `start` tăng dần, rồi `complete` tăng dần, rồi thứ tự xuất hiện trong mảng.
- **Thời gian xử lý** của event: `complete − start`.
- **Thời gian chờ** của event (trừ event đầu tiên của case): `max(0, start − max(complete của mọi event trước nó trong case))`.
  Event đầu tiên của case **không** có thời gian chờ (không tính vào thống kê waiting).
- **Thống kê** (`DurationStats`): `count, mean, median, p90, p95, max, total`. Phân vị dùng **nội suy tuyến tính**
  giữa 2 hạng gần nhất (như `numpy.quantile` mặc định / Excel `PERCENTILE.INC`): `pos = (n−1)·p`.
- **Case:** `cycleTime = max(complete) − min(start)`; `processingTime = Σ xử lý`; `waitingTime = Σ chờ`;
  `cte = processingTime / cycleTime`. **CTE tổng** `cteOverall = Σ processingTime / Σ cycleTime` (tỷ số của tổng).
- **Xếp hạng điểm nghẽn** `waitingShareRanking`: activity sắp giảm dần theo `waiting.total / Σ waiting.total`.
- **Lịch làm việc (tùy chọn)** `WorkCalendar { workDays: number[] (0 = CN … 6 = T7), blocks: {start:"HH:mm", end:"HH:mm"}[] }`:
  khi có, mọi khoảng thời gian (xử lý, chờ, cycle time) chỉ đếm phần nằm trong các block giờ làm việc của ngày làm việc,
  tính theo **giờ địa phương** (`Date#getHours` / `setHours`).

## 2. API contract (script gọi đúng tên/kiểu này)

`services/performance-analysis.ts` (export qua `services/index.ts`; type đặt ở `types/performance.ts`):

```ts
export interface DurationStats {
  count: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  max: number;
  total: number;
}
export interface ActivityPerformance {
  activity: string;
  processing: DurationStats;
  waiting: DurationStats | null;
}
export interface ResourcePerformance {
  resource: string;
  processing: DurationStats;
  waiting: DurationStats | null;
}
export interface CasePerformance {
  caseId: string;
  cycleTime: number;
  processingTime: number;
  waitingTime: number;
  cte: number;
}
export interface WorkCalendar {
  workDays: number[];
  blocks: { start: string; end: string }[];
}
export interface PerformanceAnalysis {
  activities: ActivityPerformance[];
  resources: ResourcePerformance[];
  cases: CasePerformance[];
  summary: {
    caseCount: number;
    cycleTime: DurationStats;
    processing: DurationStats;
    waiting: DurationStats;
    cteOverall: number;
  };
  waitingShareRanking: { activity: string; share: number }[]; // share ∈ [0,1]
}
export function analyzePerformance(
  events: EventLogItem[],
  options?: { calendar?: WorkCalendar },
): PerformanceAnalysis;
```

`services/model-calibration.ts`:

```ts
export interface CalibrationChange {
  kind: "taskTime" | "branchProbability" | "loopProbability";
  target: string;
  before: number | null;
  after: number;
}
export interface CalibrationResult {
  blocks: Block[];
  tasks: Task[];
  changes: CalibrationChange[];
  warnings: string[];
}
export function calibrateModelFromLog(
  blocks: Block[],
  tasks: Task[],
  events: EventLogItem[],
  options?: {
    timeStat?: "median" | "mean";
    unit?: string /* project unit: minutes | hours | days, mặc định hours */;
  },
): CalibrationResult;
```

Hàm **thuần** (không mutate input, trả bản sao mới).

## 3. Quy tắc hiệu chỉnh

- **Thời gian task:** `task.time` (và `time`/`t` của block/branch tham chiếu task đó) = `timeStat` (median mặc định)
  của thời gian xử lý activity cùng tên, đổi sang `unit` của project (hours ×1, minutes ×60, days ÷24). Activity
  không có trong log ⇒ giữ nguyên + thêm `warnings`.
- **Xác suất nhánh XOR** (`Branch.p`, %, tổng = 100, làm tròn 1 chữ số): tần suất quan sát tại **điểm quyết định**.
  Mỗi lần trace đi tới XOR (sau activity cuối của block đứng trước, kể cả khi XOR nằm trong nhánh/vòng lặp khác) thì
  đếm nhánh được chọn = nhánh chứa activity kế tiếp trong trace; nếu activity kế tiếp thuộc phần **sau** XOR thì đó là
  nhánh rỗng. XOR không bao giờ được đi tới ⇒ giữ nguyên + warning. Với fixture, số đích là:

  | Gateway        | Nhánh → % (log chuẩn)                                                                                  |
  | -------------- | ------------------------------------------------------------------------------------------------------ |
  | Spec clear?    | No (Ask PM…) 21,08 · Yes (rỗng) 78,92                                                                  |
  | API ready?     | No (Integrate Real API) 23,49 · Yes (rỗng) 76,51                                                       |
  | Bot passed?    | Fix Review Comments 34,45 · Yes (Important PR?…) 65,55 — _mỗi lần AI Bot review là một lần quyết định_ |
  | Important PR?  | Yes (FE Lead Review) 34,18 · No (rỗng) 65,82 — _trên các lần Bot pass_                                 |
  | Code Approved? | Fix Review Comments 44,78 · Approved (rỗng) 55,22 — _trên các lần Lead review_                         |

- **Xác suất lặp** (`loopP`, %): `100 · (1 − số lần vào vòng lặp / số lần thực hiện activity đầu thân vòng lặp)`.
  Fixture: `1 − 166 / 299 = 44,48 %`.
- Kiểm chứng: hiệu chỉnh với `timeStat: "mean"` ⇒ `computeFlow(...).total` = thời gian xử lý trung bình mỗi case
  (54,86 h) — tức mô hình tái tạo đúng log.

## 4. Sửa mất xác suất XOR khi export → import (K5)

`services/bpmn-builder.ts`: khi nhánh XOR có cả nhãn và `p`, nhãn flow phải chứa xác suất, ví dụ `Yes (72.5%)`;
importer (`services/bpmn-import/*`) đọc lại `p` qua `parseProbability`, còn nhãn hiển thị bỏ phần `(…%)` (đã có
`cleanTaskName`). Đồng thời sửa ca vòng lặp ngoài chứa XOR + vòng lặp con bị mất `loopP` (K5 kiểm tra Cycle Time
trước/sau round-trip phải bằng nhau).

## 5. BPR dùng thời gian chờ từ log (R1)

`analyzeBpr(blocks, tasks, unit, uploadedEvents)`: khi có `uploadedEvents`, gọi `analyzePerformance` và sinh issue
`type: "longWaitTime"` (type đã có trong `types/bpr.ts`, đã có mapping kỹ thuật nhưng chưa có detector) cho các
activity có share thời gian chờ ≥ 15 % (severity: ≥ 30 % high, ≥ 15 % medium), `evidence` ghi median/p95 chờ và share.

## 6. Giao diện (để demo)

1. **Tab mới "Performance / Hiệu năng"** theo đúng pattern của `docs/FEATURE_TABS_PLAN.md`
   (`DiagramTab`, `NAV_ITEMS`, `diagram-panel.tsx`, `components/diagram/performance/…`, i18n `diagram.json`):
   - KPI: số case, cycle time trung vị, CTE tổng, tổng thời gian chờ.
   - Bảng activity: số lần, xử lý (median/mean), chờ (median/p95/max), share chờ; tô nổi top 3 điểm nghẽn.
   - Biểu đồ cột share thời gian chờ theo activity (recharts có sẵn); bảng theo resource.
   - Danh sách case sắp theo thời gian chờ (dùng `data-table` + pagination sẵn có).
   - Bộ lọc khoảng ngày theo ngày bắt đầu case (để so cuối sprint vs bình thường).
   - Công tắc "Giờ lịch / Giờ làm việc" + cấu hình lịch (lưu trong project: `Project.workCalendar?: WorkCalendar`).
2. **Nút "Hiệu chỉnh từ event log"** (cạnh các hành động của Process Model / BPMN, chỉ bật khi có log):
   dialog hiển thị bảng thay đổi (trước → sau) cho thời gian task, xác suất nhánh, xác suất lặp; chọn median/mean;
   nút Áp dụng (undo được qua store zundo hiện có).
3. Tab BPR hiển thị issue `longWaitTime`.
4. Toàn bộ chữ qua `useTranslations`, cập nhật **cả** `en` và `vi`; component dùng shadcn/ui; mỗi file < 500 dòng.

## 7. Phase 2 (khuyến nghị)

- **P6 – lịch làm việc** trong `analyzePerformance` (script đã có check PHASE-2, số đích có sẵn).
- Heatmap thời gian chờ theo giờ trong ngày / ngày trong tuần cho một activity (thấy rõ AI Bot quá tải 13:00–17:30
  hai ngày cuối sprint, Lead chỉ review đầu buổi sáng).
- Luật nghiệp vụ trên `EventLogItem.attributes` (vd. `is_important = True` ⇒ phải có FE Lead Review; không merge khi
  lần review cuối `review_result = changes_requested`) → violation mới trong conformance.
- Heuristics Miner: BPMN sinh ra thiếu start event ⇒ "Apply" ra 0 block.

## 8. Số đích để đối chiếu khi demo

| Chỉ số                                        | Log chuẩn                                                                                                                           | Log tình huống                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Chờ trước FE Lead Review – trung vị           | 22,44 h (giờ làm việc: 4,72 h)                                                                                                      | 22,33 h (4,90 h)                                                      |
| Chờ trước FE Lead Review – max                | 89,6 h                                                                                                                              | 450,5 h (Lead đi onsite 3 tuần)                                       |
| Chờ trước AI Bot Code Review – p95 / max      | 4,0 / 8,2 phút                                                                                                                      | 29,3 / 98 phút (bot quá tải)                                          |
| Chờ trước Integrate Real API – trung vị / p95 | 29,9 / 92,4 h                                                                                                                       | 26,5 / 179,8 h (API trễ)                                              |
| Top điểm nghẽn (share chờ)                    | FE Lead Review 31,8 % · Merge Code 27,2 % · Integrate Real API 21,3 %                                                               | FE Lead Review 33,6 % · Integrate Real API 25,0 % · Merge Code 21,2 % |
| CTE tổng                                      | 56,9 % (giờ làm việc 59,1 %)                                                                                                        | 53,4 % (55,7 %)                                                       |
| Cycle time trung vị                           | 74,5 h                                                                                                                              | 89,9 h                                                                |
| Hiệu chỉnh (log chuẩn)                        | Spec No 21,1 % · API No 23,5 % · Bot fail 34,4 % · Important 34,2 % · Lead reject 44,8 % · loopP 44,5 % · Cycle Time (mean) 54,86 h | —                                                                     |

Kiểm tra thủ công sau khi script PASS: import BPMN + log chuẩn → Hiệu chỉnh từ log → Cycle Time ≈ 54,9 h (mean) →
tab Hiệu năng: FE Lead Review đứng đầu → upload log tình huống: p95 chờ AI Bot tăng từ ~4 lên ~29 phút, max chờ Lead
~450 h → tab BPR có issue `longWaitTime` cho FE Lead Review.
