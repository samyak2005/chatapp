# 💙 CyberChat

A real-time chat application with cyberpunk aesthetics, featuring room-based messaging, private conversations, and emoji reactions.

## ✨ Features

- **Real-time messaging** with Socket.IO
- **Multiple chat rooms** (General, Gaming, Music, Tech)
- **Private messaging** between users
- **Emoji reactions** on messages
- **Typing indicators**
- **Online user tracking**
- **Cyberpunk neon blue UI**
- **Mobile responsive design**
- **Unread message counters**

## 🚀 Quick Start

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd cyberchat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:4000`

## 🌐 Deployment Options

### 1. Render (Recommended)

**Free hosting with automatic deployments**

1. **Create a Render account** at [render.com](https://render.com)

2. **Connect your GitHub repository**

3. **Create a new Web Service**
   - **Name**: `cyberchat`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Deploy!** Your app will be available at `https://your-app-name.onrender.com`

### 2. Railway

**Simple deployment with GitHub integration**

1. **Visit [railway.app](https://railway.app)**
2. **Connect your GitHub account**
3. **Select your repository**
4. **Deploy automatically**

### 3. Heroku

**Classic deployment option**

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku app**
   ```bash
   heroku create your-cyberchat-app
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### 4. Vercel

**Great for static sites (requires backend separation)**

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

## 📁 Project Structure

```
cyberchat/
├── app.js              # Backend server (Express + Socket.IO)
├── package.json        # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML file
│   ├── index.css      # Cyberpunk styling
│   └── main.js        # Frontend JavaScript
└── README.md          # This file
```

## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development/production)

### Customization

- **Change colors**: Edit CSS variables in `public/index.css`
- **Add rooms**: Modify the `rooms` object in `app.js`
- **Add emojis**: Update `availableEmojis` array in `public/main.js`

## 🎨 Features in Detail

### Chat Rooms
- **General**: Default room for general discussion
- **Gaming**: For gaming-related conversations
- **Music**: Music lovers unite
- **Tech**: Technology discussions

### Private Messaging
- Click on any user in the sidebar
- Start private conversations
- Unread message counters
- Persistent chat history (session-based)

### Emoji Reactions
- 12 different emojis available
- Real-time reaction updates
- Grouped reaction display
- Hover to see who reacted

### UI Features
- **Neon blue cyberpunk theme**
- **Glassmorphism effects**
- **Smooth animations**
- **Mobile responsive**
- **Custom scrollbars**
- **Typing indicators**

## 🛠️ Development

### Available Scripts

- `npm start`: Start production server
- `npm run dev`: Start development server with nodemon

### Adding New Features

1. **Backend changes**: Modify `app.js`
2. **Frontend changes**: Edit files in `public/`
3. **Styling**: Update `public/index.css`

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for your own purposes!

## 🆘 Support

If you encounter any issues:

1. Check the browser console for errors
2. Ensure all dependencies are installed
3. Verify your Node.js version (14+)
4. Check your internet connection

---

**Built with ❤️ and 💙 using Node.js, Express, Socket.IO, and vanilla JavaScript** 