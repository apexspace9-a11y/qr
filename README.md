# QR Banking Studio

Web app tĩnh để tạo mã chuyển khoản VietQR, thiết kế để chạy trực tiếp trên GitHub Pages.

## Tính năng

- Tải danh sách ngân hàng từ VietQR `GET https://api.vietqr.io/v2/banks`.
- Cache danh sách ngân hàng 24 giờ trên trình duyệt và có fallback cho một số ngân hàng phổ biến.
- Tạo VietQR bằng Quick Link, không cần nhúng `client-id` hoặc `api-key` vào frontend.
- Hỗ trợ số tiền, nội dung chuyển khoản, tên người nhận và các template `compact2`, `compact`, `qr_only`, `print`.
- Responsive cho desktop/mobile.
- Copy link QR và mở ảnh QR gốc.
- Không có backend, database hoặc tracking trong mã nguồn mặc định.

## Chạy local

Bạn có thể mở `index.html` trực tiếp, nhưng để `fetch()` hoạt động ổn định nên chạy qua HTTP server:

```bash
python3 -m http.server 8080
```

Sau đó mở `http://localhost:8080`.

## Deploy lên GitHub Pages

### Cách 1 - GitHub Actions (đã có sẵn workflow)

1. Push toàn bộ source vào nhánh `main`.
2. Vào **Settings → Pages**.
3. Ở **Build and deployment → Source**, chọn **GitHub Actions**.
4. Workflow `.github/workflows/pages.yml` sẽ publish trang sau mỗi lần push lên `main`.

URL của repo này thường là:

`https://apexspace9-a11y.github.io/qr/`

### Cách 2 - Deploy from a branch

Vì dự án chỉ là HTML/CSS/JS tĩnh, bạn cũng có thể chọn **Deploy from a branch**, nhánh `main`, thư mục `/(root)`.

## Bảo mật

Dự án dùng VietQR Quick Link thay vì API Generate có xác thực. Nếu sau này bạn dùng API `POST /v2/generate` hoặc API lookup tài khoản, **không đặt `x-client-id` và `x-api-key` trong JavaScript frontend**. Hãy đặt chúng ở backend/serverless function.

## Dữ liệu và giới hạn

- `amount`: số dương, tối đa 13 chữ số.
- `addInfo`: dự án chuẩn hóa về ký tự chữ/số/space, tối đa 50 ký tự.
- `accountName`: chỉ phục vụ hiển thị trên ảnh QR; không phải trường nằm trong tiêu chuẩn QR chuyển khoản.
- Danh sách ngân hàng có thể thay đổi, nên ứng dụng làm mới cache sau 24 giờ.

## Nguồn tham khảo

- VietQR Quick Link: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/
- VietQR Bank API: https://vietqr.io/danh-sach-api/api-danh-sach-ma-ngan-hang/
- GitHub Pages: https://docs.github.com/en/pages/

## License

MIT
