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



