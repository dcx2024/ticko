# 🎟️ Ticko – Event Management Platform

Ticko is a fullstack event management platform designed to simplify the process of creating, managing, and attending events. Inspired by platforms like Tix, Ticko allows organizers to create events and sell tickets, while giving users a seamless way to browse and book events online.

---

## 🚀 Features

### 🧑‍💻 For Organizers
- Create and manage events
- Set ticket pricing, availability, and event details
- Real-time analytics on ticket sales
- Dashboard for managing bookings

### 🎟️ For Attendees
- Browse upcoming events
- Filter by date, location, or category
- Securely book and download tickets
- Receive event reminders and updates

---

## ⚙️ Tech Stack

### Frontend
- HTML, CSS, JavaScript
- [React (in progress)] – for building dynamic UI components
- Responsive design using CSS Grid & Flexbox

### Backend
- **Node.js** with **Express** – RESTful API development
- **PostgreSQL** – Relational database for storing users, events, and ticket info
- **Redis** – Caching layer to improve performance
- JWT-based authentication and role-based access control





---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js
- PostgreSQL
- Redis

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ticko.git
cd ticko
```
### 2.Install Dependencies
```bash
cd backend
npm install
```

### 3. Create a .env file
``` bash
PORT=5000
DATABASE_URL=YOURDATABASEURL
REDIS_URL=YOURREDISURL
JWT_SECRET=your_jwt_secret
```

### 4.Start the server
``` bash
cd backend
node server.js
```

### 5. Visit: http://localhost:5000

