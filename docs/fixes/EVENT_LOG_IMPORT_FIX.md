# Fix: Import BPMN có vòng lặp + Event Log (FE Code Review case)

> Tài liệu giao việc cho AI agent / developer. Đọc hết trước khi sửa code.
> Tuân thủ toàn bộ `AGENTS.md` (không `any`, file < 500 dòng, i18n en + vi, kebab-case, barrel export,
> `npx tsc --noEmit` và `npx eslint .` phải 0 lỗi 0 cảnh báo).

## 0. Mục tiêu & cách nghiệm thu

App phải import được bộ dữ liệu trong `docs/fixes/fixtures/` và cho kết quả đúng:

```bash
npx tsx scripts/verify-event-log-import.ts   # phải in "ALL REQUIRED CHECKS PASSED" (exit 0)
npx tsc --noEmit                             # 0 lỗi
npx eslint .                                 # 0 lỗi, 0 cảnh báo
```

Trạng thái hiện tại (trước khi sửa): **8 check REQUIRED FAIL** (B1, B2, B3, B5, L1, C1, C2, X1 – xem output script).

Quy tắc khi sửa:

- **Không** sửa file trong `docs/fixes/fixtures/` và **không** nới lỏng điều kiện trong script để cho PASS.
- Mỗi lần sửa xong một nhóm lỗi, chạy lại script; commit theo từng nhóm (conventional commits như repo đang dùng).
- Nếu cần đổi hành vi engine (cycle time / cost) thì cập nhật `docs/FORMULAS.md` và `docs/ARCHITECTURE.md`.

## 1. Fixtures

| File                          | Nội dung                                                                                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FE_Code_Review.bpmn`         | BPMN 2.0: collaboration 2 pool (Devtify 4 lane: PM / BA, FE Dev, AI System, FE Lead; BE Team collapsed), message flow, `intermediateCatchEvent` (message "API ready"), `userTask`/`serviceTask`/`task`, text annotation, **vòng lặp review có 2 đường quay về gateway gộp** |
| `event_log_chuan.csv`         | 166 case (PR), 1.604 event – khớp 100% với BPMN (đã xác nhận bằng PM4Py token replay = 1.0)                                                                                                                                                                                 |
| `event_log_tinh_huong.csv`    | 159 case, 1.557 event, có tình huống lỗi được chèn                                                                                                                                                                                                                          |
| `event_log_chuan.xes`         | Bản XES của log chuẩn (xuất bằng PM4Py)                                                                                                                                                                                                                                     |
| `ground_truth_tinh_huong.csv` | Nhãn đúng: `case_id, anomaly_types (phân cách ;), is_anomaly`                                                                                                                                                                                                               |

Cột CSV: `case_id, activity, start_timestamp, end_timestamp, resource, role, review_result, review_round,
mock_api, developer, pr_size, pr_loc, is_important, is_hotfix, spec_clear, api_ready, sprint`.
`resource` = người (Dev_01, Lead_01, AI_Bot, PM_01); `role` = **tên lane** (FE Dev, AI System, FE Lead, PM / BA).
Timestamp dạng `YYYY-MM-DD HH:mm:ss` (giờ địa phương), file UTF-8 có BOM.

Luồng BPMN (tên task = tên activity trong log):

```
Start → Receive Task on ClickUp → Analyze Spec, Figma, API → ◇Spec clear?
   ├─ Yes ───────────────────────────────────────────────┐
   └─ No → Ask PM to Clarify Spec → Clarify Spec (PM) ───┴→ ◇(join)
→ Create New Branch → Write Code & Integrate → ◇API ready?
   ├─ Yes ─────────────────────────────────────────────────┐
   └─ No (mock data) → ⦿API ready (message từ BE) → Integrate Real API ─┴→ ◇(join)
→ Create Pull Request → ◇ReviewJoin ⇐──────────────────────────────┐
→ AI Bot Code Review → ◇Bot passed?                                 │
   ├─ No → Fix Review Comments ─────────────────────────────────────┤
   └─ Yes → ◇Important PR?                                           │
         ├─ No ───────────────────────────┐                          │
         └─ Yes → FE Lead Review → ◇Code Approved?                   │
               ├─ Approved ───────────────┴→ ◇MergeJoin → Merge Code → End
               └─ Request changes → Fix Review Comments ─────────────┘
```

## 2. Các lỗi cần sửa

### B1 + B2 — `bpmnXmlToBlocks` đệ quy vô hạn khi vòng lặp quay về **gateway** (REQUIRED)

- **Triệu chứng:** `RangeError: Maximum call stack size exceeded`. Trong UI: bpmn-js vẫn vẽ được sơ đồ nhưng
  `handleImportFile` báo `status.loadFileFailed`, blocks không được đồng bộ → Conformance / Cycle Time dùng model cũ.
  Lỗi xảy ra cả với **BPMN do chính app xuất ra** (`blocksToSemanticXml` của LOOP composite → `LoopMerge` / `LoopDecision`),
  và khi "Apply" model khám phá có vòng lặp.
- **Nguyên nhân:** `services/bpmn.ts` – `walkChain` chỉ ghi `localPath` cho task (không ghi gateway), và `localPath` là
  cục bộ cho mỗi lần gọi đệ quy. Back-edge trỏ tới merge gateway không được nhận ra → coi là XOR split → `findJoin` →
  `walkChain` lồng nhau vô hạn.
- **Hướng sửa gợi ý:** tiền xử lý đồ thị trước khi walk: DFS từ start để tìm **back-edge** (cạnh tới node đang ở trên
  stack DFS) / SCC; xác định loop entry (đích back-edge), các cạnh thoát (ra khỏi SCC) và đường redo. Dựng `LOOP`
  block từ đó; thêm guard độ sâu đệ quy + visited toàn cục để không bao giờ crash (trả warning thay vì throw).
- Có thể tách thành module mới, ví dụ `services/bpmn-import/` (`graph-analysis.ts`, `walk-chain.ts`…) để giữ < 500 dòng.

### B3 — Model import sai: mất task, nhãn nhánh / event bị biến thành task (REQUIRED)

1. **Nhánh rỗng nuốt task kế tiếp:** khi một nhánh XOR đi thẳng vào join gateway (nhánh "Yes" của _Spec clear?_ và
   _API ready?_), `findJoin` loại `branchStartIds` khỏi ứng viên join → chọn **node sau join** làm join → task đó
   (_Create New Branch_, _Create Pull Request_) bị bỏ qua.
2. **Nhánh rỗng bị đặt tên = nhãn flow** ("Yes", "No", "Approved") và về sau được coi như activity.
3. **`intermediateCatchEvent` ("API ready") bị coi là task.** Mọi event (`*Event`) không phải activity, phải được bỏ
   qua như Start/End (giữ đường đi).

- **Quy ước nhánh rỗng** (đã có sẵn trong app, xem template `p2p` nhánh "Rejected"): `Branch` có `mode: SIMPLE`,
  **không** `taskId`, **không** `subBlocks`, `t: 0`. Cần thống nhất ở cả 4 nơi:
  - import (`bpmn.ts`): flow split → join trực tiếp ⇒ tạo nhánh rỗng (`t: 0`, label = tên flow chỉ để hiển thị);
  - export (`bpmn-builder.ts`): nhánh rỗng ⇒ vẽ flow thẳng split → join (**không** tạo task), giữ nhãn flow;
  - conformance: nhánh rỗng **không** phải activity (xem C1);
  - engine: nhánh rỗng cộng 0 thời gian / chi phí.
- Check **B5** (template round-trip) đang FAIL vì `p2p` export nhánh "Rejected" thành task giả → sửa cùng lúc.

Model mong muốn sau khi import fixture (cấu trúc gợi ý, không bắt buộc y hệt nếu check vẫn PASS):

```
SEQ  Receive Task on ClickUp
SEQ  Analyze Spec, Figma, API
XOR  Spec clear?        { Yes: (rỗng) | No: [Ask PM to Clarify Spec, Clarify Spec] }
SEQ  Create New Branch
SEQ  Write Code & Integrate
XOR  API ready?         { Yes: (rỗng) | No (mock data): [Integrate Real API] }
SEQ  Create Pull Request
LOOP Review loop (composite):
       SEQ AI Bot Code Review
       XOR Important PR? { No: (rỗng) | Yes: [FE Lead Review] }
       XOR Rework?       { Passed: (rỗng) | Changes: [Fix Review Comments] }   ← đường redo
SEQ  Merge Code
```

### L1 — CSV không nhận cột `end_timestamp` (REQUIRED)

- `services/event-log-helpers.ts` – `ALIAS_GROUPS.end` thiếu `endtimestamp` (cũng nên thêm `finishtimestamp`,
  `completetime`, `endtimestamp`, `timecomplete`). Hậu quả: `completeTimestamp = startTimestamp`, mọi duration = 1h.
- `normalizeColName` nên bỏ BOM `﻿` (an toàn cho file đọc không qua `File.text()`).
- Lưu ý: `start` alias có `timestamp` — giữ nguyên nhưng đảm bảo `end` được ưu tiên đúng.

### C1 + C2 — Conformance sai với vòng lặp & nhánh rỗng (REQUIRED)

- `services/conformance.ts` – `inspectModel`:
  - Nhánh rỗng đang thành activity (`leafAnalysis(br.label)`) ⇒ báo `skipped_activity` giả ("Yes", "No", "Approved").
    Nhánh rỗng phải đóng góp tập activity rỗng; XOR có nhánh rỗng ⇒ các activity trong XOR là **tùy chọn**.
  - Bên trong LOOP, `analyzeBlocks` vẫn thêm precedence giữa các activity của thân vòng lặp ⇒ trace
    `Bot → Fix → Bot → Lead → Fix → Bot → Lead → Merge` bị báo `out_of_order` cho _Fix Review Comments_.
    Trong LOOP, precedence nội bộ chỉ áp dụng trong cùng một vòng (hoặc bỏ), nhưng giữ precedence
    _trước loop → loop → sau loop_.
- Kết quả cần đạt: log chuẩn **166/166 conformant**; log tình huống: mọi case có nhãn `skip_bot`,
  `merge_before_approve` phải bị flag, và **không** flag case nào ngoài các nhãn
  `skip_bot, merge_before_approve, spec_pingpong, wrong_role, skip_lead, ignore_bot`.
- `services/conformance.ts` đã 542 dòng (> 500) ⇒ tách `inspectModel` sang file riêng (ví dụ
  `services/conformance-model.ts`) và export qua `services/index.ts`.

### X1 — Parser XES (REQUIRED)

`services/event-log-parser.ts` – `parseEventLogXes`:

1. `attrRegex` có cờ `g` được dùng lại giữa trace header và event; vòng trace header `break` sớm ⇒ `lastIndex` không
   reset ⇒ event đầu mỗi trace mất thuộc tính ⇒ "Unknown Activity". Reset `lastIndex` (hoặc tạo regex mới / dùng
   `DOMParser`/`bpmn-moddle`-style XML parse thay regex).
2. Không giải mã entity XML: `Write Code &amp; Integrate`. Cần decode `&amp; &lt; &gt; &quot; &apos;`.
3. Chỉ đọc `time:timestamp`; cần đọc thêm `start_timestamp` (thuộc tính PM4Py) và cặp `lifecycle:transition`
   start/complete nếu có ⇒ tính `duration`.
4. Hỗ trợ `<boolean>`; giữ thứ tự event.

## 3. Phase 2 (khuyến nghị, không bắt buộc để PASS)

- **B4 – Lane → resource:** khi import, gán `resource` của task = tên lane chứa nó (`laneSet.lanes[].flowNodeRef`).
- **C3 – wrong_role:** parser đọc cột `role` vào field mới tùy chọn `EventLogItem.role?: string`; conformance so sánh
  lane với `event.role` **khi có**, không so lane với tên người (`resource`). ⚠️ Nếu làm B4 mà không làm phần này,
  mọi event sẽ bị báo `wrong_resource` và C1 FAIL.
- Giữ các cột thừa vào `EventLogItem.attributes?: Record<string, string>` để sau này kiểm tra luật dữ liệu
  (PR quan trọng phải có Lead review; không merge khi `review_result = changes_requested`).
- Hiển thị warning (i18n) khi import BPMN có pool phụ / message flow / event trung gian thay vì im lặng.

## 4. Ngoài phạm vi

- Không đổi UI ngoài thông báo lỗi/warning cần thiết.
- Không đổi thuật toán Heuristics Miner / Process Discovery (đã biết: với log nhiều vòng lặp, model khám phá bị cụt và
  BPMN của Heuristics Miner thiếu start event → ghi thành issue riêng).

## 5. Kiểm tra thủ công trên UI (sau khi script PASS)

1. `pnpm dev` → tạo project mới → tab BPMN → import `docs/fixes/fixtures/FE_Code_Review.bpmn` ⇒ không báo lỗi, tab
   Process Model hiển thị đủ 12 task và vòng lặp review.
2. Tab Event Log → upload `event_log_chuan.csv` ⇒ duration thực (AI Bot vài phút, không phải 1h).
3. Conformance ⇒ 166/166 conformant. Upload `event_log_tinh_huong.csv` ⇒ có case vi phạm (skip AI Bot, merge trước
   Lead review).
4. Upload `event_log_chuan.xes` ⇒ cùng số event, không có "Unknown Activity".
5. Mở lại 3 template (P2P, O2C, ITSM) ⇒ không xuất hiện task giả "Rejected".
