# Hệ thống Chat ngang hàng P2P

## Giới thiệu

Đây là project môn Hệ phân tán, xây dựng một hệ thống chat ngang hàng P2P. Mục tiêu chính là minh họa cách nhiều peer có thể tham gia mạng, khám phá nhau, thiết lập kết nối trực tiếp và trao đổi tin nhắn mà không biến server thành nơi trung chuyển nội dung chat chính.

Server trong project chỉ đóng vai trò hỗ trợ: xác thực người dùng, bootstrap, peer discovery, điều phối phòng và signaling WebRTC. Khi kết nối P2P khả dụng, tin nhắn chat và tệp được gửi trực tiếp giữa các trình duyệt bằng WebRTC DataChannel.

## Kiến trúc

### Client as Peer Node

Mỗi trình duyệt chạy React client và hoạt động như một peer node. Client có thể:

- đăng nhập bằng email, mật khẩu và OTP;
- tham gia một phòng chat;
- nhận danh sách peer online;
- tạo nhiều kết nối WebRTC tới các peer khác;
- gửi và nhận tin nhắn qua DataChannel;
- hiển thị trạng thái kết nối, peer online/offline và lỗi gửi tin.

### Server as Bootstrap/Signaling/Auth Server

Server Node.js không lưu hoặc chuyển tiếp nội dung chat. Server chịu trách nhiệm:

- đăng ký, xác thực OTP và đăng nhập;
- phát JWT cho phiên đăng nhập;
- xác thực WebSocket signaling bằng JWT;
- quản lý phòng chat;
- trả danh sách peer hiện có cho peer mới;
- chuyển tiếp WebRTC offer, answer và ICE candidate giữa các peer.

### WebRTC DataChannel cho truyền tin P2P

Sau khi hai peer nhận được thông tin của nhau qua signaling server, chúng tạo `RTCPeerConnection` và mở `RTCDataChannel`. Tin nhắn chat, phản ứng emoji và tệp được gửi qua DataChannel khi kết nối sẵn sàng.

### WebSocket cho signaling và peer discovery

WebSocket được dùng để:

- peer join room;
- server gửi danh sách peer hiện có;
- server thông báo `user-joined` và `user-left`;
- chuyển tiếp WebRTC signaling metadata.

### Room/group chat

Group chat dùng mô hình mesh hiện có: mỗi peer giữ kết nối DataChannel tới các peer khác trong cùng phòng. Khi gửi tin nhắn nhóm, client gửi bản tin tới từng peer có DataChannel sẵn sàng. Khi gửi riêng, client chọn một peer cụ thể và gửi trực tiếp tới peer đó.

## Tính năng chính

- Đăng ký tài khoản bằng email và mật khẩu.
- Xác thực OTP khi đăng ký.
- Đăng nhập, khôi phục phiên đăng nhập và đăng xuất.
- Lưu người dùng demo cục bộ trong `server/data/users.json`.
- Hash mật khẩu và OTP bằng `bcryptjs`, không lưu mật khẩu plain text.
- Danh sách peer đang online trong phòng.
- Peer discovery cho peer mới tham gia.
- Chat riêng trực tiếp tới một peer.
- Group chat trong phòng.
- Cập nhật online/offline khi peer tham gia hoặc rời phòng.
- Xử lý peer mất kết nối, DataChannel lỗi hoặc peer chưa sẵn sàng.
- WebRTC DataChannel cho truyền tin P2P.
- WebSocket server cho bootstrap, room coordination và signaling.
- Mã hóa đầu cuối bằng Web Crypto API với ECDH và AES-GCM.
- Chia sẻ tệp P2P theo chunk, có kiểm tra toàn vẹn SHA-256.
- Log rõ ràng phục vụ demo: user joined, user left, peer discovered, signaling event, P2P connection established/failed, message sent/received.

## Công nghệ sử dụng

| Thành phần | Công nghệ | Vai trò |
| --- | --- | --- |
| Frontend | React, Vite | Giao diện người dùng và peer node |
| Styling | Tailwind CSS | Giao diện chat và landing page |
| Backend | Node.js, Express | Auth API và HTTP server |
| WebSocket | `ws` | Signaling, peer discovery, room coordination |
| P2P | WebRTC, RTCDataChannel | Truyền tin trực tiếp giữa peer |
| Auth | bcryptjs, JWT | Hash mật khẩu và phiên đăng nhập |
| OTP | bcryptjs, nodemailer-ready service | Xác thực đăng ký, demo OTP qua console |
| Mã hóa | Web Crypto API | ECDH key exchange, AES-GCM encryption |
| HTTPS local | mkcert | Secure context cho WebRTC/Web Crypto |

## Cài đặt

### Yêu cầu

- Node.js 18 trở lên. Vite 5 yêu cầu Node `^18.0.0` hoặc `>=20.0.0`.
- npm.
- `mkcert` để tạo HTTPS certificate local.

### Cài đặt mkcert và HTTPS local

WebRTC và Web Crypto API cần secure context. Vì vậy khi chạy local nên dùng HTTPS cho cả server và client.

1. Cài `mkcert`.

   - Windows: có thể dùng Chocolatey hoặc Scoop.
   - macOS: có thể dùng Homebrew.
   - Linux: làm theo hướng dẫn chính thức của mkcert.

2. Cài local CA:

   ```bash
   mkcert -install
   ```

3. Tạo certificate:

   ```bash
   mkcert localhost 127.0.0.1 ::1
   ```

4. Copy hai file sau vào cả thư mục `server` và `client`:

   - `localhost.pem`
   - `localhost-key.pem`

Nếu thiếu certificate ở `client`, Vite sẽ có thể fallback sang HTTP, nhưng WebRTC/Web Crypto có thể không hoạt động đúng trong một số trình duyệt. Nếu thiếu certificate ở `server`, server development sẽ báo lỗi và dừng.

## Biến môi trường

Server có file mẫu:

```bash
server/.env.example
```

Tạo file `.env` trong thư mục `server`:

```bash
cd server
cp .env.example .env
```

Trên PowerShell Windows, có thể dùng:

```powershell
Copy-Item .env.example .env
```

Các biến chính:

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` | Port server, mặc định `3001` |
| `JWT_SECRET` | Secret để ký JWT. Nên đặt chuỗi dài, khó đoán khi demo thật |
| `OTP_DEMO_MODE` | Đặt `true` để không gửi email thật và in OTP ra console |
| `SMTP_HOST` | SMTP host nếu muốn gửi OTP qua email thật |
| `SMTP_PORT` | SMTP port, thường là `587` hoặc `465` |
| `SMTP_USER` | Tài khoản SMTP |
| `SMTP_PASS` | Mật khẩu/app password SMTP |
| `SMTP_FROM` | Địa chỉ gửi email OTP |

Khuyến nghị cho demo lớp học:

```env
PORT=3001
JWT_SECRET=replace-with-a-long-random-secret-for-local-demo
OTP_DEMO_MODE=true
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Khi `OTP_DEMO_MODE=true`, server sẽ in OTP theo dạng:

```text
[DEMO OTP] Email: user@example.com | OTP: 123456
```

## Cách chạy

Mở hai terminal riêng.

### Terminal 1: chạy server

```bash
cd server
npm install
npm run dev
```

Server sẽ chạy tại:

```text
https://localhost:3001
wss://localhost:3001
```

### Terminal 2: chạy client

```bash
cd client
npm install
npm run dev
```

Client thường chạy tại:

```text
https://localhost:5173
```

Mở URL client trong trình duyệt. Nếu trình duyệt cảnh báo certificate local, chọn tiếp tục với localhost sau khi chắc chắn bạn đang chạy project local của mình.

## Kịch bản demo

1. Mở terminal server và chạy `npm run dev`.
2. Mở terminal client và chạy `npm run dev`.
3. Mở cửa sổ trình duyệt đầu tiên tại `https://localhost:5173`.
4. Đăng ký user 1 với display name, email và mật khẩu.
5. Xem OTP trong console của server tại dòng `[DEMO OTP]`.
6. Nhập OTP ở màn hình xác thực.
7. Đăng nhập user 1.
8. Mở cửa sổ trình duyệt thứ hai hoặc incognito.
9. Đăng ký, xác thực OTP và đăng nhập user 2.
10. Quan sát danh sách peer online ở sidebar.
11. Gửi tin nhắn riêng bằng cách chọn `Gửi tới` một peer cụ thể.
12. Mở cửa sổ trình duyệt thứ ba, đăng ký/đăng nhập user 3.
13. Chọn `Cả phòng` và gửi tin nhắn nhóm.
14. Kiểm tra user 2 và user 3 đều nhận tin nhắn nhóm.
15. Đóng một tab hoặc đăng xuất một user.
16. Quan sát online/offline update và log `user-left`/P2P disconnected.

Điểm cần nhấn mạnh khi thuyết trình: server chỉ hỗ trợ xác thực, bootstrap, peer discovery, room coordination và signaling. Nội dung chat được gửi qua WebRTC DataChannel giữa các peer khi kết nối P2P sẵn sàng.

## Mapping yêu cầu bài tập

| Requirement | Implementation in this project | How to demo |
| --- | --- | --- |
| Peer can join the P2P network | Client đăng nhập, mở WebSocket đã xác thực và gửi `join` vào room | Đăng nhập một user và quan sát log join room |
| The system shows online peers | Server gửi `user-list`, client hiển thị danh sách trong sidebar | Mở hai trình duyệt và xem mục `Người đang online` |
| Users can send direct messages to another peer | Ô chat có lựa chọn `Gửi tới` từng peer; client gọi `sendMessageToPeer` | Chọn một peer thay vì `Cả phòng`, gửi tin nhắn |
| Messages are transmitted directly between peers when P2P connection is available | Tin nhắn được mã hóa rồi gửi qua WebRTC DataChannel | Mở console, xem log message sent/received via DataChannel |
| The system supports group chat | Room chat dùng mesh topology; mỗi peer kết nối tới các peer khác | Mở 3 trình duyệt cùng phòng |
| Group messages are delivered to all peers in the group | Khi chọn `Cả phòng`, client gửi tới tất cả DataChannel sẵn sàng | Gửi một tin từ user 1, kiểm tra user 2 và user 3 nhận được |
| New peers can discover existing peers | Server trả `existingUsers` trong message `room-joined` | Cho user 2 vào sau user 1, xem log peer discovered |
| Online/offline state updates when peers join or leave | Server broadcast `user-joined`, `user-left`, `user-list` | Đóng một tab và xem sidebar cập nhật |
| The system handles peer disconnection or unavailable peers | Client đóng peer connection, xử lý DataChannel close/error và báo lỗi nếu peer chưa sẵn sàng | Đóng tab peer hoặc gửi khi chưa có peer |
| Uses WebSocket/WebRTC or equivalent | WebSocket dùng cho signaling; WebRTC dùng cho P2P DataChannel | Xem log server signaling và log client DataChannel |
| Each peer can send and receive messages concurrently | Mỗi peer có handler DataChannel riêng và có thể gửi/nhận bất đồng bộ | Hai trình duyệt gửi tin gần cùng lúc |
| Handles multiple connections | Client dùng `Map` cho nhiều peer connection, crypto instance và file manager | Mở 3 trình duyệt, kiểm tra mỗi peer thấy các peer còn lại |
| Has Bootstrap/Tracker/Signaling server for peer discovery | `server/server.js` quản lý room, user list và chuyển tiếp signaling | Xem server log `Peer discovery` và `Signaling event sent` |

## API xác thực

Các endpoint auth local:

- `POST /api/auth/register`
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`
- `POST /api/auth/login`
- `GET /api/auth/me`

Ví dụ register:

```json
{
  "displayName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "secret123"
}
```

Sau login, frontend nhận:

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "displayName": "Nguyen Van A",
    "email": "a@example.com"
  }
}
```

## Ghi chú về lưu trữ demo

User đã xác thực được lưu trong:

```text
server/data/users.json
```

Đăng ký đang chờ OTP được lưu tạm trong:

```text
server/data/pending-users.json
```

File `users.json` chỉ chứa tài khoản đã xác thực OTP. Khi người dùng đăng ký, server tạo pending registration kèm `passwordHash`, `otpHash`, `otpExpiresAt` và `createdAt`; tài khoản thật chỉ được ghi vào `users.json` sau khi OTP đúng. File này phù hợp cho demo local và bài tập môn học. Không dùng cách lưu này cho production thật.

## Chức năng nâng cao

### Store-and-forward khi peer offline

Chức năng store-and-forward được dùng cho trường hợp gửi tin nhắn trực tiếp đến một peer đang offline hoặc không có WebRTC DataChannel sẵn sàng. Luồng bình thường của hệ thống vẫn là P2P: khi cả hai peer online và DataChannel mở, client gửi tin nhắn trực tiếp qua WebRTC DataChannel, không gửi nội dung chat qua server.

Khi peer nhận không online hoặc DataChannel chưa mở, client gửi sự kiện `offline-message:store` đến signaling server. Server xác thực danh tính người gửi từ WebSocket đã đăng nhập, kiểm tra người nhận là user đã xác thực, rồi lưu tạm tin nhắn vào:

```text
server/data/offline-messages.json
```

Khi người nhận đăng nhập lại và join room, server kiểm tra tin nhắn pending theo user id và gửi về client bằng sự kiện `offline-message:pending`. Sau khi client hiển thị tin nhắn ngoại tuyến, client gửi xác nhận `offline-message:delivered`; server đánh dấu tin nhắn là `delivered` và ghi `deliveredAt`.

Điểm cần nhấn mạnh khi báo cáo: server chỉ lưu tin trong trường hợp fallback khi peer offline hoặc không thể gửi qua DataChannel. Server không trở thành kênh truyền chính cho tin nhắn online.

### Churn simulation

Churn simulation là chức năng demo/kiểm thử dùng để mô phỏng các peer tham gia, rời mạng và tham gia lại nhiều lần. Mục tiêu là minh họa đặc trưng của hệ phân tán khi thành viên trong mạng thay đổi liên tục, đồng thời kiểm tra peer discovery, danh sách online/offline và xử lý rời phòng.

Các peer mô phỏng có tên rõ ràng như:

```text
Churn Peer 1
Churn Peer 2
Churn Peer 3
```

Các peer này không phải user thật, không được lưu vào `server/data/users.json`, không cần OTP/login và không thiết lập WebRTC DataChannel thật. Chúng chỉ được đưa vào danh sách online/offline để phục vụ demo trạng thái mạng thay đổi liên tục.

### Biến môi trường liên quan

| Biến | Giá trị gợi ý | Ý nghĩa |
| --- | --- | --- |
| `CHURN_DEMO_ENABLED` | `true` hoặc `false` | Bật/tắt API điều khiển churn simulation. Nếu là `false`, các API churn trả về thông báo rằng demo churn đang bị tắt. |
| Cấu hình offline message | Không có biến riêng | Tin nhắn offline được lưu local trong `server/data/offline-messages.json` để dễ demo. |

Ví dụ cấu hình demo trong `server/.env`:

```env
OTP_DEMO_MODE=true
JWT_SECRET=replace-with-a-long-random-secret-for-local-demo
CHURN_DEMO_ENABLED=true
```

### Demo store-and-forward

1. Đăng nhập bằng User A.
2. Đảm bảo User B đã đăng ký, xác thực OTP và đang offline.
3. Ở User A, chọn User B trong chế độ gửi tin nhắn riêng.
4. Gửi tin nhắn đến User B.
5. Quan sát UI của User A hiển thị trạng thái tin nhắn đã được lưu để chuyển sau.
6. Quan sát server log có dòng `Offline message stored`.
7. Đăng nhập lại bằng User B và join room.
8. Quan sát User B nhận tin nhắn có nhãn `Tin nhắn ngoại tuyến`.
9. Quan sát server log có `Pending offline messages delivered` và `Offline messages marked delivered`.

### Demo churn simulation

1. Đặt `CHURN_DEMO_ENABLED=true` trong `server/.env` và khởi động lại server.
2. Đăng nhập vào giao diện chat bằng một user thật.
3. Trong panel `Mô phỏng churn`, bấm `Bắt đầu mô phỏng churn`.
4. Quan sát danh sách peer online thay đổi khi `Churn Peer 1`, `Churn Peer 2`, ... lần lượt join/leave.
5. Quan sát server log có các dòng `[CHURN] Simulation started`, `[CHURN] Simulated peer joined`, `[CHURN] Simulated peer left`.
6. Bấm `Dừng mô phỏng churn`.
7. Quan sát các peer mô phỏng được loại khỏi danh sách online, trong khi user thật vẫn không bị ảnh hưởng.

### Mapping với yêu cầu bài tập

| Yêu cầu/chức năng nâng cao | Cách project đáp ứng | Ghi chú demo |
| --- | --- | --- |
| Store-and-forward messaging khi peer offline | Server lưu tạm tin nhắn direct trong `server/data/offline-messages.json` khi peer nhận offline hoặc DataChannel không mở | Chỉ là fallback; tin nhắn online vẫn đi qua WebRTC DataChannel |
| Churn simulation | Server tạo peer mô phỏng join/leave/rejoin và phát sự kiện tương thích với danh sách online | Peer mô phỏng không phải user thật và không có WebRTC DataChannel |
| Peer discovery dưới churn | Khi churn peer join/leave, server cập nhật `user-list` cho client trong room | Dùng để minh họa online/offline state thay đổi liên tục |
| Không biến hệ thống thành client-server chat | Direct/group chat online vẫn dùng P2P DataChannel; server chỉ xử lý signaling và fallback offline | Cần nhấn mạnh trong thuyết trình |

## Troubleshooting

### `npm install` bị lỗi

- Kiểm tra Node.js version:

  ```bash
  node -v
  npm -v
  ```

- Dùng Node.js 18 trở lên.
- Xóa `node_modules` và `package-lock.json` trong thư mục bị lỗi rồi chạy lại `npm install` nếu cần.
- Chạy riêng trong từng thư mục: `server` và `client`.

### Port đã được sử dụng

Nếu port `3001` hoặc `5173` đang bị chiếm:

- Dừng terminal cũ đang chạy project.
- Hoặc đổi `PORT` trong `server/.env`.
- Với client, Vite có thể tự nhảy sang port khác, ví dụ `5174`. Hãy mở đúng URL Vite in ra.

### Lỗi HTTPS certificate

Triệu chứng:

- Server báo thiếu `localhost.pem` hoặc `localhost-key.pem`.
- Trình duyệt báo connection not private.
- WebRTC hoặc Web Crypto không hoạt động.

Cách xử lý:

```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

Copy `localhost.pem` và `localhost-key.pem` vào cả:

```text
server/
client/
```

Sau đó restart cả server và client.

### Không nhận được OTP

- Nếu demo trong lớp, đặt `OTP_DEMO_MODE=true`.
- Xem OTP trong console terminal đang chạy server.
- Nếu muốn gửi email thật, điền đủ `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Nếu SMTP chưa cấu hình đủ, hệ thống sẽ fallback về demo OTP log.

### Peer không kết nối được

- Đảm bảo cả hai user đã login thành công và đang ở cùng phòng.
- Mở devtools console để xem log `peer discovered`, `Signaling event sent`, `P2P connection established` hoặc `P2P connection failed`.
- Đảm bảo đang dùng HTTPS local.
- Thử refresh cả hai tab sau khi server/client đã chạy ổn định.
- Một số mạng chặn WebRTC hoặc STUN có thể làm peer không kết nối được. Với demo local trên cùng máy, nên dùng hai cửa sổ trình duyệt hoặc incognito trước.

### Không gửi được tin nhắn

- Kiểm tra sidebar có peer online hay không.
- Chờ trạng thái P2P/DataChannel sẵn sàng.
- Nếu UI báo chưa có DataChannel sẵn sàng, hãy refresh tab hoặc cho peer rời vào lại phòng.
- Tin nhắn không được gửi qua REST API; hệ thống cố ý yêu cầu DataChannel P2P để đúng mục tiêu môn Hệ phân tán.

## Kết luận

Project này tập trung chứng minh mô hình chat phân tán: server giúp các peer tìm thấy nhau và thiết lập kết nối, còn dữ liệu chat được truyền trực tiếp giữa các peer khi có thể. Đây là điểm khác biệt chính so với mô hình chat client-server tập trung truyền thống.
