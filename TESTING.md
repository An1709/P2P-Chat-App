# Kiểm thử thủ công hệ thống Chat ngang hàng P2P

Tài liệu này hướng dẫn kiểm thử thủ công flow xác thực email/mật khẩu/OTP và demo chat P2P cho môn Hệ phân tán.

## 1. Chuẩn bị môi trường

### Server

Mở terminal 1:

```bash
cd server
npm install
npm run dev
```

Khi demo OTP, nên đặt trong `.env`:

```env
OTP_DEMO_MODE=true
JWT_SECRET=local-demo-secret
```

Khi `OTP_DEMO_MODE=true`, mã OTP sẽ được in trong console server theo dạng:

```text
[DEMO OTP] Email: user@example.com | OTP: 123456
```

### Client

Mở terminal 2:

```bash
cd client
npm install
npm run dev
```

Mở URL mà Vite hiển thị, thường là `https://localhost:5173`.

### File dữ liệu cần quan sát

- `server/data/users.json`: chỉ chứa tài khoản đã xác thực OTP.
- `server/data/pending-users.json`: chứa đăng ký đang chờ OTP.
- Không file nào được chứa mật khẩu hoặc OTP dạng plain text. Chỉ được lưu `passwordHash` và `otpHash`.

## 2. Test đăng ký email mới

### Các bước

1. Mở app trên trình duyệt.
2. Mở màn hình `Đăng ký`.
3. Nhập:
   - tên hiển thị,
   - email mới,
   - mật khẩu,
   - xác nhận mật khẩu.
4. Bấm `Đăng ký`.

### Kết quả mong đợi

- App chuyển sang màn hình `Xác thực OTP`.
- App hiển thị: `Mã OTP đã được gửi. Vui lòng nhập mã OTP để hoàn tất đăng ký.`
- App chưa hiển thị: `Đăng ký thành công. Bạn có thể đăng nhập.`
- Email trên màn OTP bị khóa hoặc chỉ hiển thị dạng text, không chỉnh sửa được.
- Console server hiển thị OTP nếu `OTP_DEMO_MODE=true`.
- `server/data/users.json` chưa có email vừa đăng ký.
- `server/data/pending-users.json` có pending registration của email vừa đăng ký.

## 3. Test đóng tab trước khi nhập OTP

### Các bước

1. Đăng ký một email mới.
2. Khi app chuyển sang màn OTP, không nhập OTP.
3. Đóng tab trình duyệt.
4. Mở lại app.
5. Vào màn hình `Đăng ký`.

### Kết quả mong đợi

- Form đăng ký rỗng.
- Tên hiển thị, email, mật khẩu cũ không được tự điền lại.
- `server/data/users.json` không chứa email chưa xác thực.
- Email này chỉ có thể còn nằm trong `server/data/pending-users.json` trong thời gian pending chưa hết hạn.

## 4. Test nhập sai OTP

### Các bước

1. Đăng ký một email mới.
2. Ở màn `Xác thực OTP`, nhập mã sai, ví dụ `000000`.
3. Bấm `Xác thực OTP`.

### Kết quả mong đợi

- App hiển thị lỗi tiếng Việt rõ ràng, ví dụ: `Mã OTP không đúng. Vui lòng kiểm tra lại.`
- App vẫn ở màn OTP.
- Email vẫn bị khóa, không chỉnh sửa được.
- `server/data/users.json` không có user mới.
- Pending registration vẫn còn trong `server/data/pending-users.json` nếu OTP chưa hết hạn.

## 5. Test nhập đúng OTP

### Các bước

1. Đăng ký một email mới.
2. Copy OTP từ console server.
3. Nhập OTP đúng vào màn `Xác thực OTP`.
4. Bấm `Xác thực OTP`.

### Kết quả mong đợi

- App hiển thị: `Đăng ký thành công. Bạn có thể đăng nhập.`
- App chuyển về màn `Đăng nhập`.
- `server/data/users.json` có user mới với:
  - `id`,
  - `displayName`,
  - `email`,
  - `passwordHash`,
  - `isVerified: true`,
  - `createdAt`,
  - `verifiedAt`.
- User trong `users.json` không có `otpHash` hoặc `otpExpiresAt`.
- Pending registration của email đó bị xóa khỏi `server/data/pending-users.json`.

## 6. Test đăng nhập trước khi xác thực OTP

### Các bước

1. Đăng ký một email mới.
2. Không nhập OTP.
3. Chuyển sang màn `Đăng nhập`.
4. Nhập email và mật khẩu vừa đăng ký.
5. Bấm `Đăng nhập`.

### Kết quả mong đợi

- Đăng nhập bị chặn.
- App hiển thị thông báo lỗi tiếng Việt hoặc yêu cầu hoàn tất xác thực OTP.
- User chưa xuất hiện trong `server/data/users.json`.
- User pending không được nhận token đăng nhập.

## 7. Test đăng nhập sau khi xác thực OTP

### Các bước

1. Đăng ký email mới.
2. Nhập OTP đúng.
3. Sau khi app chuyển về màn `Đăng nhập`, nhập email và mật khẩu.
4. Bấm `Đăng nhập`.

### Kết quả mong đợi

- Đăng nhập thành công.
- User vào được trang chat.
- Local storage có token đăng nhập cho phiên hiện tại.
- WebSocket signaling kết nối bằng user đã xác thực.
- Console server có log user đăng nhập và socket đã xác thực.

## 8. Test gửi lại OTP

### Các bước

1. Đăng ký một email mới.
2. Ở màn OTP, bấm `Gửi lại mã OTP`.

### Kết quả mong đợi

- App gửi lại OTP bằng email đang bị khóa trên màn OTP.
- Người dùng không thể đổi email trước khi gửi lại OTP.
- Console server in OTP mới nếu `OTP_DEMO_MODE=true`.
- `server/data/pending-users.json` cập nhật `otpHash` và `otpExpiresAt`.
- Không tạo user thật trong `server/data/users.json` trước khi OTP đúng.

## 9. Test chat P2P với hai user

### Các bước

1. Mở cửa sổ trình duyệt thứ nhất.
2. Đăng nhập bằng user đã xác thực OTP.
3. Vào phòng chat.
4. Mở cửa sổ trình duyệt thứ hai hoặc cửa sổ ẩn danh.
5. Đăng nhập bằng user đã xác thực OTP khác.
6. Vào cùng phòng chat.
7. Quan sát danh sách người online.
8. Gửi tin nhắn trực tiếp hoặc tin nhắn trong phòng.

### Kết quả mong đợi

- Cả hai user xuất hiện online.
- Peer mới phát hiện peer đang online.
- Kết nối P2P/WebRTC được thiết lập khi có thể.
- Tin nhắn chat được gửi qua WebRTC DataChannel khi kết nối P2P sẵn sàng.
- Server chỉ dùng cho xác thực, bootstrap, peer discovery, room coordination và signaling.
- Không gửi chat message qua REST API.

## 10. Test group chat với ba user

### Các bước

1. Mở ba cửa sổ trình duyệt hoặc kết hợp trình duyệt thường và ẩn danh.
2. Đăng nhập ba user đã xác thực OTP khác nhau.
3. Cho cả ba user vào cùng phòng.
4. Từ user thứ nhất, gửi tin nhắn nhóm.
5. Từ user thứ hai, gửi tin nhắn nhóm khác.

### Kết quả mong đợi

- Cả ba user thấy nhau trong danh sách online.
- Tin nhắn nhóm được gửi đến các peer trong phòng.
- Các peer có thể gửi và nhận tin nhắn đồng thời.
- Hệ thống xử lý nhiều kết nối peer cùng lúc.

## 11. Test trạng thái online/offline

### Các bước

1. Đăng nhập ít nhất hai user trong hai cửa sổ.
2. Xác nhận cả hai đang online.
3. Đóng một tab hoặc bấm `Đăng xuất`.
4. Quan sát cửa sổ còn lại.

### Kết quả mong đợi

- User vừa rời phòng biến mất khỏi danh sách online hoặc được cập nhật trạng thái offline.
- Peer còn lại không bị crash.
- Console server có log user rời phòng hoặc disconnect.
- Nếu gửi tin nhắn đến peer đã rời đi, UI/log nên thể hiện trạng thái gửi thất bại hoặc peer không khả dụng.

## 12. Checklist nhanh trước khi demo

- Server khởi động không lỗi.
- Client khởi động không lỗi.
- `OTP_DEMO_MODE=true` in OTP trong console server.
- Đăng ký không tạo user thật trước OTP.
- OTP sai không tạo user.
- OTP đúng tạo user verified và xóa pending.
- Login chỉ thành công với user đã xác thực.
- Hai peer đăng nhập được và thấy nhau online.
- Direct chat hoạt động.
- Group chat với ba user hoạt động.
- Đóng tab cập nhật online/offline.
- Có thể giải thích rõ: server là Auth/Bootstrap/Signaling server, còn chat message ưu tiên đi qua WebRTC DataChannel P2P.
