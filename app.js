const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`💙 CyberChat server running on port ${PORT}`));

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = {
  general: { users: new Set(), messages: [] },
  gaming: { users: new Set(), messages: [] },
  music: { users: new Set(), messages: [] },
  tech: { users: new Set(), messages: [] }
};

const socketData = new Map();

const privateMessages = new Map();

const messageReactions = new Map();

io.on("connection", onConnected);

function onConnected(socket) {
  console.log("🔌 Socket connected:", socket.id);
  
  socketData.set(socket.id, {
    user: "anonymous",
    currentRoom: "general"
  });

  socket.join("general");
  rooms.general.users.add("anonymous");
  
  socket.emit("room-users", {
    room: "general",
    users: Array.from(rooms.general.users)
  });

  io.emit("clients-total", io.engine.clientsCount);

  socket.on("join-room", (data) => {
    const { room, user } = data;
    
    const prevRoom = socketData.get(socket.id)?.currentRoom;
    if (prevRoom && prevRoom !== room) {
      socket.leave(prevRoom);
      rooms[prevRoom].users.delete(socketData.get(socket.id)?.user);
      
      socket.to(prevRoom).emit("user-left", {
        room: prevRoom,
        user: socketData.get(socket.id)?.user
      });
    }

    socket.join(room);
    socketData.set(socket.id, { user, currentRoom: room });
    rooms[room].users.add(user);

    socket.emit("room-users", {
      room,
      users: Array.from(rooms[room].users)
    });

    socket.to(room).emit("user-joined", { room, user });

    console.log(`👤 ${user} joined ${room} room`);
  });

  socket.on("leave-room", (room) => {
    const user = socketData.get(socket.id)?.user;
    if (user) {
      rooms[room].users.delete(user);
      socket.to(room).emit("user-left", { room, user });
    }
  });

  socket.on("message", (data) => {
    const { room, name, message, dateTime, isPrivate, messageId } = data;
    
    if (isPrivate) {
      const sender = name;
      const receiver = room;
      
      const conversationKey = [sender, receiver].sort().join('-');
      
      if (!privateMessages.has(conversationKey)) {
        privateMessages.set(conversationKey, []);
      }
      privateMessages.get(conversationKey).push({ sender, message, dateTime, messageId });
      
      if (privateMessages.get(conversationKey).length > 50) {
        privateMessages.get(conversationKey).shift();
      }
      
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      if (receiverSocket) {
        io.to(receiverSocket).emit("chat-message", {
          ...data,
          room: sender,
          isPrivate: true
        });
      }
      
      console.log(`💌 Private: ${sender} → ${receiver}: ${message}`);
    } else {
      if (rooms[room]) {
        rooms[room].messages.push({ name, message, dateTime, messageId });
        if (rooms[room].messages.length > 50) {
          rooms[room].messages.shift();
        }
      }

      socket.to(room).emit("chat-message", data);
      console.log(`💬 ${name} in ${room}: ${message}`);
    }
  });

  socket.on("reaction", (data) => {
    const { messageId, emoji, user, room, isPrivate } = data;
    
    if (!messageReactions.has(messageId)) {
      messageReactions.set(messageId, []);
    }
    
    const reactions = messageReactions.get(messageId);
    reactions.push({ emoji, user, timestamp: new Date() });
    
    if (reactions.length > 100) {
      reactions.shift();
    }
    
    if (isPrivate) {
      const sender = user;
      const receiver = room;
      
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      if (receiverSocket) {
        io.to(receiverSocket).emit("reaction", {
          messageId,
          reactions: messageReactions.get(messageId)
        });
      }
      
      socket.emit("reaction", {
        messageId,
        reactions: messageReactions.get(messageId)
      });
      
      console.log(`💌 Private Reaction: ${sender} → ${receiver}: ${emoji} on message ${messageId}`);
    } else {
      io.to(room).emit("reaction", {
        messageId,
        reactions: messageReactions.get(messageId)
      });
      
      console.log(`💬 Reaction: ${user} in ${room}: ${emoji} on message ${messageId}`);
    }
  });

  socket.on("typing", (data) => {
    const { room, user, isPrivate } = data;
    
    if (isPrivate) {
      const receiver = room;
      
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      if (receiverSocket) {
        io.to(receiverSocket).emit("typing", {
          room: user,
          user,
          isPrivate: true
        });
      }
    } else {
      socket.to(room).emit("typing", { room, user });
    }
  });

  socket.on("stop-typing", (data) => {
    const { room, user, isPrivate } = data;
    
    if (isPrivate) {
      const receiver = room;
      
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      if (receiverSocket) {
        io.to(receiverSocket).emit("stop-typing", {
          room: user,
          user,
          isPrivate: true
        });
      }
    } else {
      socket.to(room).emit("stop-typing", { room, user });
    }
  });

  socket.on("user-update", (data) => {
    const { name, room } = data;
    const oldName = socketData.get(socket.id)?.user;
    
    socketData.set(socket.id, { user: name, currentRoom: room });
    
    if (rooms[room]) {
      rooms[room].users.delete(oldName);
      rooms[room].users.add(name);
      
      socket.to(room).emit("user-left", { room, user: oldName });
      socket.to(room).emit("user-joined", { room, user: name });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected:", socket.id);
    
    const userData = socketData.get(socket.id);
    if (userData) {
      const { user, currentRoom } = userData;
      
      if (rooms[currentRoom]) {
        rooms[currentRoom].users.delete(user);
        socket.to(currentRoom).emit("user-left", { room: currentRoom, user });
      }
      
      socketData.delete(socket.id);
    }

    io.emit("clients-total", io.engine.clientsCount);
  });
}

setInterval(() => {
  Object.keys(rooms).forEach(roomName => {
    const room = rooms[roomName];
    io.to(roomName).emit("room-users", {
      room: roomName,
      users: Array.from(room.users)
    });
  });
}, 5000);
