# ConnectHub — Frontend

> React 18 + Vite + Tailwind CSS SPA with dark/light theme toggle.
> Connects to `auth-service` (port 8081), `room-service` (port 8082),
> `message-service` (port 8083), and `websocket-handler` (port 8086).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 + CSS Variables |
| Routing | React Router v6 |
| State | Zustand (with persist) |
| HTTP | Axios (with JWT interceptor + auto-refresh) |
| Real-time | @stomp/stompjs + SockJS |
| Fonts | Syne (display) + DM Sans (body) + JetBrains Mono |
| Notifications | react-hot-toast |
| Icons | Lucide React |

---

## Quick Start

```bash
cd connecthub-frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

**Requires** auth-service running on port 8081.
Room and message features also need ports 8082 and 8083.

---

## Pages & Routes

| Route | Page | Auth |
|-------|------|------|
| `/login` | Login with email/password + Google/GitHub OAuth | Public |
| `/register` | Registration with password strength meter | Public |
| `/chat` | Chat layout with room sidebar | Protected |
| `/chat/:roomId` | Full chat room with WebSocket | Protected |
| `/chat/dm/:userId` | Direct message with a user | Protected |
| `/profile` | Edit profile, change password, update status | Protected |
| `/search` | Search users by username/name | Protected |
| `/notifications` | In-app notifications | Protected |
| `/settings` | Settings | Protected |
| `/admin` | Admin panel — user management table | Admin only |
| `/oauth2/redirect` | OAuth2 token handler | Public |

---

## Features

### Auth Service Integration
- Register with full validation + password strength indicator
- Login with email/password
- Google & GitHub OAuth2 via redirect flow
- JWT auto-refresh — transparent token renewal on 401
- Logout — clears tokens, disconnects WebSocket
- Profile editing (name, username, bio, avatar URL)
- Password change with current password verification
- Status selector: Online / Away / DND / Invisible

### Chat (Message Service + WebSocket)
- Real-time messages via STOMP over SockJS
- Infinite scroll message history (paginated REST)
- Typing indicators with auto-clear after 3s
- Message delivery status (Sent / Delivered / Read)
- Edit and soft-delete own messages
- Reply to any message with quoted preview
- Emoji reactions with per-user toggle
- Room creation (GROUP / DM) from sidebar

### Admin Panel
- Dashboard stats: total / active / suspended / admin counts
- Full user table with search filter
- Suspend / reactivate users
- Delete users with confirmation modal

### Design
- **Dark / Light theme toggle** — persisted to localStorage
- Fonts: Syne (headings) + DM Sans (body)
- CSS variables for all colors — easy theming
- Responsive sidebar + main layout
- Smooth animations on page load, modals, messages
- Accessible focus rings and keyboard navigation

---

## Project Structure

```
src/
├── api/
│   ├── authApi.js       ← Axios client for auth-service (port 8081)
│   ├── messageApi.js    ← Axios client for message-service (port 8083)
│   └── wsService.js     ← STOMP/SockJS WebSocket service (singleton)
├── components/
│   ├── chat/
│   │   ├── MessageBubble.jsx   ← Single message with reactions, edit, delete
│   │   └── MessageInput.jsx    ← Textarea with typing + send
│   ├── layout/
│   │   ├── AppLayout.jsx       ← Sidebar + Outlet + Toaster
│   │   ├── Sidebar.jsx         ← Nav, status, theme toggle, logout
│   │   └── ProtectedRoute.jsx  ← Auth guard + admin guard
│   └── ui/
│       ├── Avatar.jsx          ← User avatar with presence ring
│       └── index.jsx           ← Input, Button, Badge, Spinner, Modal, Card
├── context/
│   ├── authStore.js     ← Zustand store (register, login, logout, profile, status)
│   └── ThemeContext.jsx ← Dark/light theme provider
├── hooks/
│   └── useMessages.js   ← Message state + WebSocket event handler
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx        ← Login form + OAuth buttons
│   │   ├── RegisterPage.jsx     ← Register form + password strength
│   │   ├── ProfilePage.jsx      ← Profile / password / status tabs
│   │   └── SearchUsersPage.jsx  ← User search + message button
│   ├── chat/
│   │   ├── ChatLayout.jsx       ← Rooms sidebar + create room modal
│   │   └── ChatPage.jsx         ← Message list + input + WebSocket
│   └── admin/
│       └── AdminPage.jsx        ← User management table
├── utils/
│   └── helpers.js       ← initials, gradients, date formatting, etc.
├── App.jsx              ← Route definitions
├── main.jsx             ← React entry point
└── index.css            ← Global styles + CSS design tokens
```

---

## Environment & Proxy

The Vite dev server proxies all API calls:

```
/api/auth    → http://localhost:8081
/api/rooms   → http://localhost:8082
/api/messages→ http://localhost:8083
/ws          → http://localhost:8086 (WebSocket)
```

For production, set these up in your nginx/reverse proxy.

---

## Theme Customization

All colors are CSS variables in `src/index.css`. Toggle dark mode by adding/removing the `dark` class on `<html>`. The toggle is in the sidebar and on auth pages.

---

## Running Tests

```bash
npm run build   # type check + production build
```
