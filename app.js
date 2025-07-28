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

// Store room data
const rooms = {
  general: { users: new Set(), messages: [] },
  gaming: { users: new Set(), messages: [] },
  music: { users: new Set(), messages: [] },
  tech: { users: new Set(), messages: [] }
};

// Store socket data
const socketData = new Map();

// Store private messages
const privateMessages = new Map(); // Map of user pairs to their messages

// Store reactions for each message
const messageReactions = new Map(); // Map of messageId to reactions array

io.on("connection", onConnected);

function onConnected(socket) {
  console.log("🔌 Socket connected:", socket.id);
  
  // Initialize socket data
  socketData.set(socket.id, {
    user: "anonymous",
    currentRoom: "general"
  });

  // Join default room
  socket.join("general");
  rooms.general.users.add("anonymous");
  
  // Send initial room data
  socket.emit("room-users", {
    room: "general",
    users: Array.from(rooms.general.users)
  });

  // Broadcast updated user count
  io.emit("clients-total", io.engine.clientsCount);

  socket.on("join-room", (data) => {
    const { room, user } = data;
    
    // Leave previous room
    const prevRoom = socketData.get(socket.id)?.currentRoom;
    if (prevRoom && prevRoom !== room) {
      socket.leave(prevRoom);
      rooms[prevRoom].users.delete(socketData.get(socket.id)?.user);
      
      // Notify room about user leaving
      socket.to(prevRoom).emit("user-left", {
        room: prevRoom,
        user: socketData.get(socket.id)?.user
      });
    }

    // Join new room
    socket.join(room);
    socketData.set(socket.id, { user, currentRoom: room });
    rooms[room].users.add(user);

    // Send room users to the joining user
    socket.emit("room-users", {
      room,
      users: Array.from(rooms[room].users)
    });

    // Notify room about new user
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
      // Handle private message
      const sender = name;
      const receiver = room; // In private messages, 'room' is actually the target user
      
      // Create unique key for this conversation
      const conversationKey = [sender, receiver].sort().join('-');
      
      // Store private message
      if (!privateMessages.has(conversationKey)) {
        privateMessages.set(conversationKey, []);
      }
      privateMessages.get(conversationKey).push({ sender, message, dateTime, messageId });
      
      // Keep only last 50 messages per conversation
      if (privateMessages.get(conversationKey).length > 50) {
        privateMessages.get(conversationKey).shift();
      }
      
      // Find socket of the receiver
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      // Send to receiver if online
      if (receiverSocket) {
        io.to(receiverSocket).emit("chat-message", {
          ...data,
          room: sender, // Send back the sender's name as room
          isPrivate: true
        });
      }
      
      console.log(`💌 Private: ${sender} → ${receiver}: ${message}`);
    } else {
      // Handle room message
      if (rooms[room]) {
        rooms[room].messages.push({ name, message, dateTime, messageId });
        if (rooms[room].messages.length > 50) {
          rooms[room].messages.shift();
        }
      }

      // Broadcast to room
      socket.to(room).emit("chat-message", data);
      console.log(`💬 ${name} in ${room}: ${message}`);
    }
  });

  socket.on("reaction", (data) => {
    const { messageId, emoji, user, room, isPrivate } = data;
    
    // Initialize reactions for this message if not exists
    if (!messageReactions.has(messageId)) {
      messageReactions.set(messageId, []);
    }
    
    // Add reaction
    const reactions = messageReactions.get(messageId);
    reactions.push({ emoji, user, timestamp: new Date() });
    
    // Keep only last 100 reactions per message
    if (reactions.length > 100) {
      reactions.shift();
    }
    
    if (isPrivate) {
      // Handle private reaction
      const sender = user;
      const receiver = room; // room is actually the target user
      
      // Find socket of the receiver
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      // Send reaction to receiver if online
      if (receiverSocket) {
        io.to(receiverSocket).emit("reaction", {
          messageId,
          reactions: messageReactions.get(messageId)
        });
      }
      
      // Send reaction back to sender
      socket.emit("reaction", {
        messageId,
        reactions: messageReactions.get(messageId)
      });
      
      console.log(`💌 Private Reaction: ${sender} → ${receiver}: ${emoji} on message ${messageId}`);
    } else {
      // Handle room reaction
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
      // Handle private typing indicator
      const receiver = room; // room is actually the target user
      
      // Find socket of the receiver
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      // Send typing indicator to receiver
      if (receiverSocket) {
        io.to(receiverSocket).emit("typing", {
          room: user, // Send back the sender's name
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
      // Handle private typing indicator
      const receiver = room; // room is actually the target user
      
      // Find socket of the receiver
      let receiverSocket = null;
      for (const [socketId, userData] of socketData.entries()) {
        if (userData.user === receiver) {
          receiverSocket = socketId;
          break;
        }
      }
      
      // Send stop typing indicator to receiver
      if (receiverSocket) {
        io.to(receiverSocket).emit("stop-typing", {
          room: user, // Send back the sender's name
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
    
    // Update socket data
    socketData.set(socket.id, { user: name, currentRoom: room });
    
    // Update room users
    if (rooms[room]) {
      rooms[room].users.delete(oldName);
      rooms[room].users.add(name);
      
      // Notify room about name change
      socket.to(room).emit("user-left", { room, user: oldName });
      socket.to(room).emit("user-joined", { room, user: name });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected:", socket.id);
    
    const userData = socketData.get(socket.id);
    if (userData) {
      const { user, currentRoom } = userData;
      
      // Remove user from room
      if (rooms[currentRoom]) {
        rooms[currentRoom].users.delete(user);
        socket.to(currentRoom).emit("user-left", { room: currentRoom, user });
      }
      
      // Clean up socket data
      socketData.delete(socket.id);
    }

    // Update total count
    io.emit("clients-total", io.engine.clientsCount);
  });
}

// Periodic room stats update
setInterval(() => {
  Object.keys(rooms).forEach(roomName => {
    const room = rooms[roomName];
    io.to(roomName).emit("room-users", {
      room: roomName,
      users: Array.from(room.users)
    });
  });
}, 5000);
