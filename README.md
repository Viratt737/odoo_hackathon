# AssetFlow

AssetFlow is a full-stack MERN application for managing organizational assets and shared resources.

## Features

- User Authentication & Role-Based Access
- Department Management
- Asset Category Management
- Employee Directory
- Asset Registration & Tracking
- Asset Allocation
- Resource Booking
- Maintenance Management
- Audit Management
- Dashboard & Reports
- Notifications

## Tech Stack

- React
- Node.js
- Express.js
- MongoDB
- Tailwind CSS
- JWT Authentication
- Socket.io

## Installation

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in the backend folder:

```
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
PORT=5000
```

## Project Structure

```
AssetFlow
├── backend
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── seeders
│   ├── utils
│   ├── server.js
│   └── package.json
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── context
│   │   ├── hooks
│   │   ├── pages
│   │   ├── services
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public
│   ├── index.html
│   └── package.json
│
└── README.md
```

## License

This project was developed for the Odoo Hackathon.
