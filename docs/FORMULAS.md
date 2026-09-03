# BẢNG TỔNG HỢP CÔNG THỨC TÍNH TOÁN TRONG HỆ THỐNG

## (Cycle Time Studio — Calculation Formulas Reference)

Tài liệu này tổng hợp toàn bộ các công thức tính toán thời gian chu kỳ (**Cycle Time - CT**) và chi phí quy trình (**Process Cost**) được cài đặt trong hệ thống Cycle Time Studio (`services/engine.ts`).

---

## 1. Công thức cấp Tác vụ đơn lẻ (Task & Resource Cost)

Mỗi tác vụ (Task) hoặc bước công việc có thể tính theo **chi phí cố định**, **đơn giá theo giờ**, hoặc **kết hợp cả hai**.

### Các biến số đầu vào:

- **$T$ (Duration)**: Thời gian thực hiện tác vụ (tính theo giờ, ngày, phút... do người dùng chọn).
- **$R$ (Hourly/Labor Rate)**: Đơn giá nhân sự / chi phí tài nguyên trên một đơn vị thời gian (ví dụ: `$/giờ`, `VNĐ/giờ`).
- **$F$ (Fixed Cost)**: Chi phí cố định cho một lần chạy (chi phí thiết bị, vật tư, bản quyền, phí khởi tạo...).

### Công thức:

```text
Chi phí nhân công (Labor Cost) = Thời gian (T) × Đơn giá (R)
Tổng chi phí tác vụ (Task Cost) = Chi phí cố định (F) + Chi phí nhân công (Labor Cost)
```

$$\mathbf{\text{Labor Cost} = T \times R}$$
$$\mathbf{\text{Task Cost} = F + (T \times R)}$$

### Các trường hợp áp dụng:

1. **Chỉ có chi phí cố định (Fixed Cost only)**:
   - Đặt $R = 0 \implies \text{Cost} = F$.
   - _Ví dụ_: Phí cấp chứng chỉ bản quyền = 50$, không phụ thuộc thời gian làm.
2. **Chỉ có đơn giá nhân sự (Hourly Rate only)**:
   - Đặt $F = 0 \implies \text{Cost} = T \times R$.
   - _Ví dụ_: Chuyên viên làm việc 3 giờ với giá 20$/giờ $\implies \text{Cost} = 3 \times 20 = 60\$$.
3. **Mô hình kết hợp (Cả Fixed Cost và Hourly Rate)**:
   - _Ví dụ_: Phí mở server cố định 10$, lập trình viên chạy kiểm thử 2 giờ giá 25$/giờ:
     $$\text{Cost} = 10 + (2 \times 25) = 60\$$

---

## 2. Công thức cấu trúc luồng quy trình (BPM Gateway Formulas)

Hệ thống hỗ trợ 4 cấu trúc khối chuẩn theo lý thuyết quản lý quy trình nghiệp vụ (BPM):

```
                     ┌─── Sequence (Nối tiếp)
                     ├─── XOR Gateway (Rẽ nhánh theo xác suất)
Process Model ───────┼─── AND Gateway (Song song đồng thời)
                     └─── Loop (Vòng lặp làm lại)
```

---

### 2.1. Cấu trúc Nối tiếp (Sequence - `SEQ`)

Các công việc được thực hiện lần lượt từ bước đầu tiên đến bước cuối cùng.

```text
[ Bước 1: T1, C1 ] ───> [ Bước 2: T2, C2 ] ───> [ Bước 3: T3, C3 ]
```

- **Thời gian chu kỳ ($CT$)**:
  $$CT_{seq} = T_1 + T_2 + \dots + T_n = \sum_{i=1}^n T_i$$
- **Tổng chi phí ($\text{Cost}$)**:
  $$\text{Cost}_{seq} = \text{Cost}_1 + \text{Cost}_2 + \dots + \text{Cost}_n = \sum_{i=1}^n \text{Cost}_i$$

> **Ví dụ**:
>
> - Bước 1: 2 giờ, chi phí 40$.
> - Bước 2: 3 giờ, chi phí 60$.
> - $\implies CT = 2 + 3 = 5\text{ giờ}$.
> - $\implies \text{Cost} = 40 + 60 = 100\$$ (trong đó chi phí nhân công và phí cố định đều được cộng dồn).

---

### 2.2. Rẽ nhánh lựa chọn theo xác suất (Exclusive Gateway - `XOR`)

Mỗi lần chạy quy trình, hệ thống chỉ đi vào **duy nhất 1 nhánh** dựa trên xác suất $p_i$.

```text
               ┌─── Nhánh 1 (Xác suất p1) ───> [ T1, C1 ]
─── [ XOR ] ───┼─── Nhánh 2 (Xác suất p2) ───> [ T2, C2 ]
               └─── Nhánh n (Xác suất pn) ───> [ Tn, Cn ]
```

- Tổng xác suất các nhánh: $\sum p_i = p_1 + p_2 + \dots + p_n$ (thông thường bằng $100\%$).
- Trọng số nhánh thứ $i$: $w_i = \frac{p_i}{\sum p}$.

- **Thời gian chu kỳ kỳ vọng ($CT$)**:
  $$CT_{xor} = \sum_{i=1}^n (w_i \times T_i) = (w_1 \times T_1) + (w_2 \times T_2) + \dots + (w_n \times T_n)$$

- **Chi phí quy trình kỳ vọng ($\text{Cost}$)**:
  $$\text{Cost}_{xor} = \sum_{i=1}^n (w_i \times \text{Cost}_i) = (w_1 \times \text{Cost}_1) + (w_2 \times \text{Cost}_2) + \dots + (w_n \times \text{Cost}_n)$$

> **Ví dụ**:
>
> - Nhánh "Duyệt tự động": xác suất $80\%$, thời gian 0.5 giờ, chi phí 10$.
> - Nhánh "Kiểm tra thủ công": xác suất $20\%$, thời gian 4 giờ, chi phí 80$.
> - $\implies CT_{xor} = (0.8 \times 0.5) + (0.2 \times 4) = 0.4 + 0.8 = 1.2\text{ giờ}$.
> - $\implies \text{Cost}_{xor} = (0.8 \times 10) + (0.2 \times 80) = 8 + 16 = 24\$$.

---

### 2.3. Chạy song song đồng thời (Parallel Gateway - `AND`)

Tất cả các nhánh được kích hoạt và thực hiện cùng lúc.

```text
               ┌─── Nhánh 1 ───> [ T1, C1 ] ───┐
─── [ AND ] ───┼─── Nhánh 2 ───> [ T2, C2 ] ───┼─── [ AND Join ] ───>
               └─── Nhánh 3 ───> [ T3, C3 ] ───┘
```

> [!IMPORTANT]
> **Điểm khác biệt cốt lõi giữa Thời gian và Chi phí trong chuẩn BPM:**
>
> - **Thời gian ($CT$)**: Do các nhánh chạy cùng lúc, quy trình chỉ hoàn thành khi nhánh chậm nhất kết thúc $\implies$ Lấy giá trị lớn nhất (**$\max$**), đây là **Đường găng (Critical Path)**.
> - **Chi phí ($\text{Cost}$)**: Mặc dù chạy cùng lúc, **tất cả các nhánh đều tiêu tốn nhân công và tài nguyên riêng biệt** $\implies$ Phải tính **tổng tất cả các nhánh ($\sum$)**.

- **Thời gian chu kỳ ($CT$)**:
  $$CT_{and} = \max(T_1, T_2, \dots, T_n)$$

- **Tổng chi phí ($\text{Cost}$)**:
  $$\mathbf{\text{Cost}_{and} = \sum_{i=1}^n \text{Cost}_i = \text{Cost}_1 + \text{Cost}_2 + \dots + \text{Cost}_n}$$

> **Ví dụ**:
>
> - Nhánh A: Thẩm định hồ sơ pháp lý (mất 5 giờ, chi phí 100$).
> - Nhánh B: Thẩm định tài chính (mất 2 giờ, chi phí 50$).
> - $\implies CT_{and} = \max(5, 2) = 5\text{ giờ}$ (Thời gian hoàn thành phụ thuộc vào nhánh A).
> - $\implies \text{Cost}_{and} = 100 + 50 = 150\$$ (Phải trả cả tiền thẩm định pháp lý lẫn tài chính).

---

### 2.4. Vòng lặp làm lại (Rework Loop - `LOOP`)

Quy trình thực hiện thân vòng lặp, sau đó có xác suất $r$ bị từ chối/lỗi và phải làm lại từ đầu.

```text
               ┌───────────────────────┐
               │                       │ (Làm lại với xác suất r)
               ▼                       │
───> [ Thân vòng lặp: T_body, C_body ] ─┴──> (Xong với xác suất 1 - r)
```

- **Tỷ lệ lặp lại ($r$)**: $r = \frac{\text{loopP}}{100}$ (với điều kiện $0 \le r < 1$).
- Số lần lặp kỳ vọng theo chuỗi cấp số nhân hội tụ:
  $$M = 1 + r + r^2 + r^3 + \dots = \frac{1}{1 - r}$$

- **Thời gian chu kỳ kỳ vọng ($CT$)**:
  $$CT_{loop} = \frac{T_{body}}{1 - r}$$

- **Chi phí quy trình kỳ vọng ($\text{Cost}$)**:
  $$\text{Cost}_{loop} = \frac{\text{Cost}_{body}}{1 - r}$$

> **Lưu ý an toàn**: Nếu người dùng nhập $r \ge 100\%$ ($r \ge 1$), hệ thống trả về $\infty$ để báo lỗi vòng lặp vô hạn.

> **Ví dụ**:
>
> - Thân kiểm thử: mất 4 giờ, chi phí 80$.
> - Tỷ lệ phát hiện lỗi phải test lại: $r = 20\% = 0.2$.
> - Hệ số lặp kỳ vọng: $M = \frac{1}{1 - 0.2} = \frac{1}{0.8} = 1.25$ lần.
> - $\implies CT_{loop} = \frac{4}{0.8} = 5\text{ giờ}$.
> - $\implies \text{Cost}_{loop} = \frac{80}{0.8} = 100\$$.

---

## 3. Công thức Phân bổ Đóng góp (Contribution Breakdown - `computeFlow`)

Để vẽ biểu đồ phân bổ ("Where the time goes") và xác định tỷ trọng của từng bước:

### 3.1. Hệ số nhân lồng nhau (Scale Multiplier):

Khi duyệt cây quy trình từ gốc xuống lá:

- Khối ngoài cùng có $\text{scale} = 1$.
- Đi vào nhánh con của khối $XOR$:
  $$\text{scale}_{con} = \text{scale}_{cha} \times \left(\frac{p_i}{\sum p}\right)$$
- Đi vào khối song song $AND$:
  - Nhánh có thời gian lớn nhất ($T_i == \max$): Giữ nguyên $\text{scale}$ (nhánh đường găng).
  - Các nhánh khác: Đánh dấu `excluded = true` (không tính dồn vào thời gian chu kỳ chính để tránh bị trùng lặp).

### 3.2. Tỷ lệ đóng góp (Share %):

$$\text{Share}_i = \frac{\text{ExpectedTime}_i}{CT_{total}} \times 100\%$$

---

## 4. Công thức Mô phỏng Ngẫu nhiên Monte Carlo (`runMonteCarlo`)

Mô phỏng Monte Carlo chạy lặp lại $N = 5{,}000$ lần độc lập để đánh giá rủi ro và độ biến thiên thực tế.

### 4.1. Thuật toán lấy mẫu (Stochastic Sampling):

- Tại cổng $XOR$: Sinh số ngẫu nhiên $u \in [0, 100)$ để chọn 1 nhánh tương ứng với dải xác suất tích lũy.
- Tại cổng $LOOP$: Chạy thân lặp, sau đó quay vòng lặp với xác suất $p = \min(0.98, \frac{\text{loopP}}{100})$. Giới hạn an toàn tối đa 500 lần lặp để tránh treo trình duyệt.

### 4.2. Các chỉ số thống kê đầu ra:

Cho tập dữ liệu mẫu sau khi chạy $N$ lần và được sắp xếp tăng dần:
$$S_1 \le S_2 \le \dots \le S_N$$

1. **Giá trị trung bình (Mean $\mu$)**:
   $$\mu = \frac{1}{N} \sum_{k=1}^N S_k$$
2. **Trung vị ($P_{50}$ - Median)**:
   $$P_{50} = S_{\lfloor 0.50 \times N \rfloor}$$
   (50% số lần chạy có thời gian nhỏ hơn hoặc bằng giá trị này).
3. **Phân vị 85 ($P_{85}$)**:
   $$P_{85} = S_{\lfloor 0.85 \times N \rfloor}$$
   (Mốc cam kết SLA thông thường trong quản trị vận hành).
4. **Phân vị 95 ($P_{95}$ - Worst-case)**:
   $$P_{95} = S_{\lfloor 0.95 \times N \rfloor}$$
   (Trường hợp xấu nhất/rủi ro cao nhất).
5. **Giá trị nhỏ nhất & lớn nhất**:
   $$\text{Min} = S_1, \quad \text{Max} = S_N$$
6. **Biểu đồ tần suất (Histogram)**:
   Chia khoảng $[\text{Min}, \text{Max}]$ thành $B = 24$ cột đều nhau:
   $$\text{Độ rộng mỗi cột (Step)} = \Delta = \frac{\text{Max} - \text{Min}}{24}$$
   Cột thứ $j$ chứa số lượng mẫu rơi vào khoảng $[\text{Min} + j\Delta, \; \text{Min} + (j+1)\Delta)$.

---

## 5. Bảng tổng hợp tra cứu nhanh (Cheat Sheet)

| Loại phần tử               | Thời gian chu kỳ ($CT$)                       | Chi phí quy trình ($\text{Cost}$)                     |
| :------------------------- | :-------------------------------------------- | :---------------------------------------------------- |
| **Task đơn lẻ**            | $T$                                           | $\text{FixedCost} + (T \times \text{HourlyRate})$     |
| **Chuỗi nối tiếp ($SEQ$)** | $\sum T_i$                                    | $\sum \text{Cost}_i$                                  |
| **Lựa chọn ($XOR$)**       | $\sum \big(\frac{p_i}{100} \times T_i\big)$   | $\sum \big(\frac{p_i}{100} \times \text{Cost}_i\big)$ |
| **Song song ($AND$)**      | $\mathbf{\max(T_1, \dots, T_n)}$              | $\mathbf{\sum \text{Cost}_i}$                         |
| **Vòng lặp ($LOOP$)**      | $\dfrac{T_{body}}{1 - r}$                     | $\dfrac{\text{Cost}_{body}}{1 - r}$                   |
| **Monte Carlo**            | Trung vị $P_{50}$, Phân vị $P_{85}$, $P_{95}$ | Phân bố ngẫu nhiên theo xác suất nhánh                |
