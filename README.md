# QR Banking Studio

Một **VietQR creative workspace** chạy hoàn toàn trên GitHub Pages. Tên “Studio” không chỉ để trang trí: ứng dụng được thiết kế như một workspace để soạn nội dung, thiết kế thẻ QR, xem trước trực tiếp, lưu cấu hình và xuất thành phẩm.

## Vì sao là “Studio”?

- **Compose** — nhập ngân hàng, tài khoản, số tiền, nội dung và dùng preset số tiền nhanh.
- **Design** — chọn phong cách thẻ (Midnight, Mint, Paper, Sunset), tiêu đề, lời nhắn và kích thước QR.
- **Preview** — Live Preview tự tạo lại QR khi dữ liệu hợp lệ thay vì bắt bấm nút sau mỗi lần chỉnh.
- **Persist** — lưu draft và tối đa 6 QR gần nhất trong `localStorage` của trình duyệt.
- **Export** — xuất poster PNG, chia sẻ link QR, copy link và mở ảnh VietQR gốc.

QR thanh toán bên trong vẫn do VietQR Quick Link tạo. Studio chỉ thêm lớp trình bày xung quanh để không làm hỏng khả năng quét.

## Tính năng

- Tải danh sách ngân hàng từ VietQR `GET https://api.vietqr.io/v2/banks`.
- Cache danh sách ngân hàng 24 giờ và có fallback ngân hàng phổ biến.
- Tạo VietQR bằng Quick Link, không cần nhúng API key vào frontend.
- Hỗ trợ amount, addInfo, accountName và template `compact2`, `compact`, `qr_only`, `print`.
- Live Preview có debounce để tránh gọi ảnh liên tục khi đang gõ.
- Preset số tiền 50K, 100K, 200K, 500K, 1M.
- 4 phong cách thẻ Studio.
- Lưu draft và lịch sử cục bộ, không có backend/database riêng.
- Xuất poster PNG bằng Canvas API ngay trong trình duyệt.
- Web Share API khi thiết bị hỗ trợ; fallback sang copy link.
- Responsive desktop/mobile.

## Chạy local

```bash
python3 -m http.server 8080
```

Mở `http://localhost:8080`.

## Deploy GitHub Pages

Repo đã có `.github/workflows/pages.yml`. Trong **Settings → Pages**, chọn **GitHub Actions** làm Source. Mỗi lần push lên `main`, workflow sẽ deploy lại.

URL hiện tại:

`https://apexspace9-a11y.github.io/qr/`

## Bảo mật

- Không đặt `x-client-id`, `x-api-key` hoặc khóa bí mật trong JavaScript public.
- Draft/lịch sử nằm trong `localStorage` trên thiết bị của người dùng.
- Dự án không có tracking hoặc database mặc định.
- Nếu sau này dùng API xác thực/lookup tài khoản, hãy đặt khóa ở backend hoặc serverless function.

## License

MIT
