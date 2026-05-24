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

## 12. Test store-and-forward khi peer offline

### Các bước

1. Đăng nhập user A ở cửa sổ thứ nhất.
2. Đăng nhập user B ở cửa sổ thứ hai và vào cùng phòng với user A.
3. Đợi hai peer thấy nhau trong danh sách online.
4. Đóng tab user B hoặc bấm `Đăng xuất` ở user B.
5. Ở user A, chọn `Riêng: user B (offline)` trong ô `Gửi tới`.
6. Gửi một tin nhắn trực tiếp.
7. Quan sát console server có log `Offline message stored`.
8. Đăng nhập lại user B và vào phòng.
9. Quan sát user B nhận tin nhắn có nhãn `Tin nhắn ngoại tuyến`.
10. Quan sát console server có log `Pending offline messages delivered` và `Offline messages marked delivered`.

### Kết quả mong đợi

- Khi user B offline, tin nhắn direct không được gửi qua DataChannel mà được lưu vào `server/data/offline-messages.json`.
- Khi user B reconnect/join phòng, server gửi các tin đang pending qua event `offline-message:pending`.
- Client user B hiển thị tin nhắn offline và gửi xác nhận `offline-message:delivered`.
- Server đánh dấu các tin đó là `delivered`.
- Khi cả hai peer online và DataChannel sẵn sàng, direct chat vẫn đi qua WebRTC DataChannel như trước.

## 13. Test churn simulation

### Chuẩn bị

Trong file `server/.env`, bật:

```env
CHURN_DEMO_ENABLED=true
```

Khởi động lại server sau khi đổi biến môi trường.

### Các bước

1. Đăng nhập ít nhất một user thật và vào phòng `general`.
2. Gửi request bắt đầu churn:

   ```bash
   curl -k -X POST https://localhost:3001/api/churn/start ^
     -H "Content-Type: application/json" ^
     -d "{\"peerCount\":3,\"joinIntervalMs\":1000,\"leaveIntervalMs\":2000,\"roomId\":\"general\",\"maxCycles\":3}"
   ```

3. Quan sát sidebar danh sách online.
4. Gửi request xem trạng thái:

   ```bash
   curl -k https://localhost:3001/api/churn/status
   ```

5. Dừng churn:

   ```bash
   curl -k -X POST https://localhost:3001/api/churn/stop
   ```

### Kết quả mong đợi

- Sidebar lần lượt xuất hiện và biến mất các peer giả như `Churn Peer 1`, `Churn Peer 2`, `Churn Peer 3`.
- Console server có log `[CHURN] Simulation started`, `[CHURN] Simulated peer joined`, `[CHURN] Simulated peer left`, `[CHURN] Simulation stopped`.
- Peer giả chỉ phục vụ demo online/offline và peer discovery update; không yêu cầu WebRTC DataChannel thật.
- Direct chat, group chat và file sharing giữa user thật vẫn hoạt động như trước.

## 14. Checklist nhanh trước khi demo

- Server khởi động không lỗi.
- Client khởi động không lỗi.
- `OTP_DEMO_MODE=true` in OTP trong console server.
- `CHURN_DEMO_ENABLED=true` nếu cần demo churn simulation.
- Đăng ký không tạo user thật trước OTP.
- OTP sai không tạo user.
- OTP đúng tạo user verified và xóa pending.
- Login chỉ thành công với user đã xác thực.
- Hai peer đăng nhập được và thấy nhau online.
- Direct chat hoạt động.
- Group chat với ba user hoạt động.
- Đóng tab cập nhật online/offline.
- Có thể giải thích rõ: server là Auth/Bootstrap/Signaling server, còn chat message ưu tiên đi qua WebRTC DataChannel P2P.

## 15. Test case bổ sung cho chức năng nâng cao

Các test case dưới đây dùng để kiểm tra riêng hai chức năng nâng cao và bảo đảm chúng không làm hỏng luồng P2P/WebRTC hiện có.

### TC-ADV-01: Lưu tin nhắn offline khi người nhận không online

Mục tiêu: kiểm tra server chỉ lưu tin nhắn khi peer nhận offline hoặc DataChannel không khả dụng.

Điều kiện trước:

- User A và User B đã đăng ký, xác thực OTP và đăng nhập thành công ít nhất một lần.
- Server đang chạy.
- User A đang online trong phòng chat.
- User B đang offline.

Các bước:

1. Ở User A, chọn chế độ gửi riêng đến User B.
2. Gửi một tin nhắn trực tiếp đến User B.
3. Quan sát thông báo trên UI của User A.
4. Mở file `server/data/offline-messages.json`.
5. Quan sát console server.

Kết quả mong đợi:

- Tin nhắn không được gửi qua DataChannel bình thường vì User B offline.
- UI hiển thị một trong các thông báo: `Đã lưu để gửi khi người nhận online` hoặc `Tin nhắn sẽ được chuyển khi người nhận trực tuyến`.
- Console server có log `Offline message stored`.
- File `server/data/offline-messages.json` có bản ghi mới với:
  - `fromUserId` là User A,
  - `toUserId` là User B,
  - `type: "direct"`,
  - `status: "pending"`,
  - `deliveredAt: null`.
- Không có mật khẩu, OTP hoặc secret nào được ghi vào file offline message.

### TC-ADV-02: Giao tin nhắn offline khi người nhận reconnect

Mục tiêu: kiểm tra server giao tin nhắn pending cho đúng người nhận khi user reconnect/join room.

Điều kiện trước:

- Đã thực hiện TC-ADV-01.
- Trong `server/data/offline-messages.json` có ít nhất một tin nhắn pending gửi đến User B.
- User B vẫn đang offline trước khi bắt đầu test.

Các bước:

1. Đăng nhập bằng User B.
2. Cho User B vào cùng phòng chat.
3. Quan sát vùng chat của User B.
4. Quan sát console server.
5. Mở lại `server/data/offline-messages.json`.

Kết quả mong đợi:

- User B nhận được sự kiện `offline-message:pending` từ server.
- UI của User B hiển thị tin nhắn với nhãn `Tin nhắn ngoại tuyến`.
- UI có thông báo `Bạn có tin nhắn ngoại tuyến mới.` hoặc `Đã nhận tin nhắn ngoại tuyến.`
- Client gửi xác nhận `offline-message:delivered` về server.
- Console server có log `Pending offline messages delivered` và `Offline messages marked delivered`.
- Tin nhắn trong `server/data/offline-messages.json` được cập nhật:
  - `status: "delivered"`,
  - `deliveredAt` có giá trị thời gian.

### TC-ADV-03: Start/stop churn simulation

Mục tiêu: kiểm tra chức năng mô phỏng churn có thể bật/tắt và cập nhật danh sách peer online.

Điều kiện trước:

- Trong `server/.env` có:

  ```env
  CHURN_DEMO_ENABLED=true
  ```

- Server đã được restart sau khi đổi biến môi trường.
- Có ít nhất một user thật đã đăng nhập và đang ở phòng `general` hoặc phòng được chọn trong panel churn.

Các bước:

1. Trong giao diện chat, tìm panel `Mô phỏng churn`.
2. Chọn số peer mô phỏng, ví dụ `3`.
3. Chọn `Join ms` và `Leave ms`, ví dụ `1000` và `2000`.
4. Bấm `Bắt đầu mô phỏng churn`.
5. Quan sát sidebar danh sách online trong vài chu kỳ.
6. Quan sát console server.
7. Bấm `Dừng mô phỏng churn`.
8. Quan sát lại sidebar.

Kết quả mong đợi:

- UI hiển thị trạng thái `Đang mô phỏng` sau khi start.
- Sidebar xuất hiện peer mô phỏng như `Churn Peer 1`, `Churn Peer 2`, `Churn Peer 3`.
- Peer mô phỏng có nhãn `peer mô phỏng` hoặc tên rõ ràng để không nhầm với user thật.
- Peer mô phỏng join/leave nhiều lần, làm danh sách online thay đổi.
- Console server có log:
  - `[CHURN] Simulation started`,
  - `[CHURN] Simulated peer joined`,
  - `[CHURN] Simulated peer left`,
  - `[CHURN] Simulation stopped`.
- Sau khi stop, UI hiển thị `Đã dừng`.
- Các peer mô phỏng biến mất khỏi danh sách online hoặc không còn được đánh dấu online.
- User thật không bị logout, không mất kết nối chat và không bị lưu vào dữ liệu churn.

### TC-ADV-04: Churn bị tắt bằng biến môi trường

Mục tiêu: kiểm tra API churn không hoạt động khi chưa bật demo mode.

Điều kiện trước:

- Trong `server/.env` đặt:

  ```env
  CHURN_DEMO_ENABLED=false
  ```

- Restart server.

Các bước:

1. Đăng nhập vào giao diện chat.
2. Bấm `Bắt đầu mô phỏng churn`.
3. Hoặc gọi API:

   ```bash
   curl -k -X POST https://localhost:3001/api/churn/start ^
     -H "Content-Type: application/json" ^
     -d "{\"peerCount\":3,\"joinIntervalMs\":1000,\"leaveIntervalMs\":2000,\"roomId\":\"general\"}"
   ```

Kết quả mong đợi:

- Server từ chối yêu cầu churn.
- UI hoặc API trả về thông báo tiếng Việt cho biết churn demo đang bị tắt và cần đặt `CHURN_DEMO_ENABLED=true`.
- Danh sách peer online không xuất hiện peer mô phỏng.
- Chat thật không bị ảnh hưởng.

### TC-REG-01: Direct P2P chat vẫn hoạt động khi cả hai peer online

Mục tiêu: kiểm tra store-and-forward không biến hệ thống thành chat client-server tập trung.

Điều kiện trước:

- User A và User B đều online trong cùng phòng.
- Hai peer đã thấy nhau trong sidebar.
- Chờ DataChannel sẵn sàng nếu trình duyệt cần vài giây để thiết lập WebRTC.

Các bước:

1. Ở User A, chọn gửi riêng đến User B.
2. Gửi một tin nhắn trực tiếp.
3. Quan sát User B nhận tin.
4. Quan sát server log và file `server/data/offline-messages.json`.

Kết quả mong đợi:

- User B nhận tin nhắn trực tiếp.
- Tin nhắn online không được lưu như offline message mới trong `server/data/offline-messages.json`.
- Không xuất hiện nhãn `Tin nhắn ngoại tuyến` cho tin nhắn này.
- Có thể giải thích rằng đường truyền chính vẫn là WebRTC DataChannel.

### TC-REG-02: Group chat vẫn hoạt động sau khi thêm offline message và churn

Mục tiêu: kiểm tra churn simulation và offline fallback không làm hỏng chat nhóm.

Điều kiện trước:

- Có ít nhất ba user thật online trong cùng một phòng.
- Nếu đang bật churn, có thể để churn chạy hoặc đã stop; cả hai trường hợp đều nên kiểm tra được.

Các bước:

1. User A chọn gửi đến `Cả phòng`.
2. User A gửi một tin nhắn nhóm.
3. User B và User C quan sát vùng chat.
4. User B gửi lại một tin nhắn nhóm.
5. Nếu churn đang chạy, quan sát peer mô phỏng trong sidebar nhưng không chọn để gửi tin trực tiếp.

Kết quả mong đợi:

- User B và User C đều nhận tin nhắn nhóm từ User A.
- User A và User C đều nhận tin nhắn nhóm từ User B.
- Peer mô phỏng không nhận chat thật và không tạo DataChannel.
- Chat nhóm vẫn dùng các DataChannel giữa user thật.
- Server không lưu group message vào `offline-messages.json`.

### TC-REG-03: Không gửi tin nhắn thật đến peer mô phỏng

Mục tiêu: kiểm tra UI phân biệt peer mô phỏng và user thật.

Điều kiện trước:

- `CHURN_DEMO_ENABLED=true`.
- Churn simulation đang chạy.
- Sidebar đang hiển thị ít nhất một peer mô phỏng.

Các bước:

1. Quan sát peer mô phỏng trong sidebar.
2. Kiểm tra danh sách chọn người nhận trực tiếp trong ô chat.
3. Nếu có cách chọn peer mô phỏng, thử gửi tin đến peer đó.

Kết quả mong đợi:

- Peer mô phỏng được ghi nhãn rõ ràng là `peer mô phỏng`.
- Peer mô phỏng không nên xuất hiện như một người nhận direct chat thật.
- Nếu người dùng vẫn cố gửi tin đến peer mô phỏng, UI hiển thị: `Đây là peer mô phỏng, không hỗ trợ nhắn tin trực tiếp.`
- App không crash và các user thật vẫn chat bình thường.
