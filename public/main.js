const socket = io();

const messageContainer = document.getElementById("message-container");
const nameInput = document.getElementById("name-input");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const roomList = document.getElementById("room-list");
const usersList = document.getElementById("users-list");
const privateList = document.getElementById("private-list");
const currentRoomIcon = document.getElementById("current-room-icon");
const currentRoomName = document.getElementById("current-room-name");
const onlineCount = document.getElementById("online-count");

let currentRoom = "general";
let currentUser = "anonymous";
let users = new Set();
let typingUsers = new Set();
let privateChats = new Map();
let currentChat = null;
let unreadCounts = new Map();
let messageReactions = new Map();

const messageTone = new Audio("/message-tone.mp3");

const availableEmojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉", "💯", "✨", "🤔", "😍"];

const rooms = {
  general: { icon: "🌐", name: "General", users: new Set() },
  gaming: { icon: "🎮", name: "Gaming", users: new Set() },
  music: { icon: "🎵", name: "Music", users: new Set() },
  tech: { icon: "💻", name: "Tech", users: new Set() }
};

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  joinRoom("general");
  addWelcomeMessage();
});

function setupEventListeners() {
  messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  roomList.addEventListener("click", (e) => {
    const roomItem = e.target.closest(".room-item");
    if (roomItem) {
      const roomName = roomItem.dataset.room;
      switchToRoom(roomName);
    }
  });

  privateList.addEventListener("click", (e) => {
    const privateItem = e.target.closest(".private-item");
    if (privateItem) {
      const targetUser = privateItem.dataset.user;
      switchToPrivateChat(targetUser);
    }
  });

  usersList.addEventListener("click", (e) => {
    const userItem = e.target.closest(".user-item");
    if (userItem) {
      const targetUser = userItem.dataset.user;
      if (targetUser !== currentUser) {
        startPrivateChat(targetUser);
      }
    }
  });

  nameInput.addEventListener("input", (e) => {
    currentUser = e.target.value || "anonymous";
    socket.emit("user-update", { name: currentUser, room: currentRoom });
  });

  messageInput.addEventListener("input", () => {
    if (currentChat) {
      socket.emit("typing", { 
        room: currentChat, 
        user: currentUser,
        isPrivate: true
      });
    } else {
      socket.emit("typing", { 
        room: currentRoom, 
        user: currentUser,
        isPrivate: false
      });
    }
  });

  messageInput.addEventListener("blur", () => {
    if (currentChat) {
      socket.emit("stop-typing", { 
        room: currentChat, 
        user: currentUser,
        isPrivate: true
      });
    } else {
      socket.emit("stop-typing", { 
        room: currentRoom, 
        user: currentUser,
        isPrivate: false
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          sendMessage();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          e.preventDefault();
          const roomIndex = parseInt(e.key) - 1;
          const roomNames = Object.keys(rooms);
          if (roomNames[roomIndex]) {
            switchToRoom(roomNames[roomIndex]);
          }
          break;
      }
    }
    
    if (e.key === "Escape") {
      messageInput.value = "";
      messageInput.blur();
    }
  });
}

function switchToRoom(roomName) {
  if (roomName === currentRoom && !currentChat) return;
  
  currentChat = null;
  
  if (currentRoom !== roomName) {
    socket.emit("leave-room", currentRoom);
  }
  
  document.querySelectorAll(".room-item, .private-item").forEach(item => {
    item.classList.remove("active");
  });
  document.querySelector(`[data-room="${roomName}"]`).classList.add("active");
  
  currentRoomIcon.textContent = rooms[roomName].icon;
  currentRoomName.textContent = rooms[roomName].name;
  
  messageContainer.innerHTML = "";
  
  currentRoom = roomName;
  joinRoom(roomName);
  
  addSystemMessage(`Joined ${rooms[roomName].name} room`);
}

function switchToPrivateChat(targetUser) {
  if (targetUser === currentChat) return;
  
  currentChat = targetUser;
  
  document.querySelectorAll(".room-item, .private-item").forEach(item => {
    item.classList.remove("active");
  });
  const privateItem = document.querySelector(`[data-user="${targetUser}"]`);
  if (privateItem) {
    privateItem.classList.add("active");
  }
  
  currentRoomIcon.textContent = "💌";
  currentRoomName.textContent = `Private: ${targetUser}`;
  
  messageContainer.innerHTML = "";
  
  if (privateChats.has(targetUser)) {
    const chatData = privateChats.get(targetUser);
    chatData.messages.forEach(msg => {
      const messageData = {
        name: msg.from,
        message: msg.message,
        dateTime: msg.dateTime,
        isPrivate: true,
        messageId: msg.messageId
      };
      addMessageToUI(msg.from === currentUser, messageData);
    });
  }
  
  unreadCounts.set(targetUser, 0);
  updatePrivateChatUI(targetUser);
  
  addSystemMessage(`Private chat with ${targetUser}`);
}

function startPrivateChat(targetUser) {
  if (!privateChats.has(targetUser)) {
    privateChats.set(targetUser, { messages: [], users: [currentUser, targetUser] });
  }
  
  if (!document.querySelector(`[data-user="${targetUser}"]`)) {
    addPrivateChatToList(targetUser);
  }
  
  switchToPrivateChat(targetUser);
}

function addPrivateChatToList(targetUser) {
  if (document.querySelector(`[data-user="${targetUser}"]`)) {
    return;
  }
  
  const privateDiv = document.createElement("div");
  privateDiv.className = "private-item";
  privateDiv.dataset.user = targetUser;
  
  const icon = document.createElement("span");
  icon.className = "private-icon";
  icon.textContent = "💌";
  
  const name = document.createElement("span");
  name.className = "private-name";
  name.textContent = targetUser;
  
  const unread = document.createElement("span");
  unread.className = "private-unread";
  unread.textContent = "0";
  
  privateDiv.appendChild(icon);
  privateDiv.appendChild(name);
  privateDiv.appendChild(unread);
  privateList.appendChild(privateDiv);
}

function updatePrivateChatUI(targetUser) {
  const privateItem = document.querySelector(`[data-user="${targetUser}"]`);
  if (privateItem) {
    const unreadElement = privateItem.querySelector(".private-unread");
    const unreadCount = unreadCounts.get(targetUser) || 0;
    unreadElement.textContent = unreadCount;
    unreadElement.style.display = unreadCount > 0 ? "block" : "none";
  }
}

function joinRoom(roomName) {
  socket.emit("join-room", { room: roomName, user: currentUser });
}

function sendMessage() {
  if (messageInput.value.trim() === "") return;
  
  const messageId = Date.now() + Math.random().toString(36).substr(2, 9);
  
  const data = {
    room: currentChat || currentRoom,
    name: currentUser,
    message: messageInput.value.trim(),
    dateTime: new Date(),
    isPrivate: currentChat !== null,
    messageId: messageId
  };
  
  socket.emit("message", data);
  addMessageToUI(true, data);
  messageInput.value = "";
  
  if (currentChat) {
    if (!privateChats.has(currentChat)) {
      privateChats.set(currentChat, { messages: [], users: [currentUser, currentChat] });
    }
    privateChats.get(currentChat).messages.push({
      from: currentUser,
      message: data.message,
      dateTime: data.dateTime,
      messageId: messageId
    });
    
    if (!document.querySelector(`[data-user="${currentChat}"]`)) {
      addPrivateChatToList(currentChat);
    }
  }
  
  const sendBtn = document.querySelector('.send-btn');
  sendBtn.style.transform = 'scale(0.9)';
  setTimeout(() => sendBtn.style.transform = 'scale(1)', 100);
}

function addMessageToUI(isOwnMessage, data) {
  clearTypingIndicator();
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;
  messageDiv.dataset.messageId = data.messageId;
  
  if (data.isPrivate || currentChat) {
    messageDiv.classList.add('private');
  }
  
  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = data.message;
  
  const info = document.createElement("div");
  info.className = "message-info";
  
  const author = document.createElement("span");
  author.className = "message-author";
  author.textContent = data.name;
  
  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = moment(data.dateTime).fromNow();
  
  info.appendChild(author);
  info.appendChild(time);
  messageDiv.appendChild(content);
  messageDiv.appendChild(info);
  
  const reactionBtn = document.createElement("button");
  reactionBtn.className = "reaction-btn";
  reactionBtn.innerHTML = "😀";
  reactionBtn.title = "Add reaction";
  reactionBtn.onclick = () => showReactionPicker(data.messageId);
  
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "message-actions";
  actionsDiv.appendChild(reactionBtn);
  messageDiv.appendChild(actionsDiv);
  
  const reactionsDiv = document.createElement("div");
  reactionsDiv.className = "message-reactions";
  reactionsDiv.dataset.messageId = data.messageId;
  messageDiv.appendChild(reactionsDiv);
  
  messageContainer.appendChild(messageDiv);
  scrollToBottom();
  
  if (!isOwnMessage) {
    messageTone.play();
  }
}

function showReactionPicker(messageId) {
  const existingPicker = document.querySelector('.reaction-picker');
  if (existingPicker) {
    existingPicker.remove();
  }
  
  const picker = document.createElement("div");
  picker.className = "reaction-picker";
  
  availableEmojis.forEach(emoji => {
    const emojiBtn = document.createElement("button");
    emojiBtn.className = "emoji-btn";
    emojiBtn.textContent = emoji;
    emojiBtn.onclick = () => {
      addReaction(messageId, emoji);
      picker.remove();
    };
    picker.appendChild(emojiBtn);
  });
  
  const reactionBtn = document.querySelector(`[data-message-id="${messageId}"] .reaction-btn`);
  if (reactionBtn) {
    const rect = reactionBtn.getBoundingClientRect();
    picker.style.position = "absolute";
    picker.style.left = `${rect.left}px`;
    picker.style.top = `${rect.top - 50}px`;
    picker.style.zIndex = "1000";
  }
  
  document.body.appendChild(picker);
  
  setTimeout(() => {
    document.addEventListener('click', function closePicker(e) {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', closePicker);
      }
    });
  }, 100);
}

function addReaction(messageId, emoji) {
  socket.emit("reaction", {
    messageId: messageId,
    emoji: emoji,
    user: currentUser,
    room: currentChat || currentRoom,
    isPrivate: currentChat !== null
  });
}

function updateReactions(messageId, reactions) {
  const reactionsDiv = document.querySelector(`[data-message-id="${messageId}"] .message-reactions`);
  if (reactionsDiv) {
    reactionsDiv.innerHTML = "";
    
    const groupedReactions = {};
    reactions.forEach(reaction => {
      if (!groupedReactions[reaction.emoji]) {
        groupedReactions[reaction.emoji] = [];
      }
      groupedReactions[reaction.emoji].push(reaction.user);
    });
    
    Object.entries(groupedReactions).forEach(([emoji, users]) => {
      const reactionSpan = document.createElement("span");
      reactionSpan.className = "reaction";
      reactionSpan.innerHTML = `${emoji} ${users.length}`;
      reactionSpan.title = `${users.join(', ')}`;
      reactionsDiv.appendChild(reactionSpan);
    });
  }
}

function addSystemMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message system";
  messageDiv.style.alignSelf = "center";
  messageDiv.style.maxWidth = "60%";
  
  const content = document.createElement("div");
  content.className = "message-content";
  content.style.background = "rgba(0, 212, 255, 0.1)";
  content.style.border = "1px solid rgba(0, 212, 255, 0.3)";
  content.style.textAlign = "center";
  content.style.fontSize = "12px";
  content.style.color = "#00d4ff";
  content.textContent = message;
  
  messageDiv.appendChild(content);
  messageContainer.appendChild(messageDiv);
  scrollToBottom();
}

function addWelcomeMessage() {
  setTimeout(() => {
    addSystemMessage("🚀 Welcome to CyberChat! Click on users to start private chats!");
  }, 1000);
}

function updateUserList() {
  usersList.innerHTML = "";
  users.forEach(user => {
    if (user !== currentUser) {
      const userDiv = document.createElement("div");
      userDiv.className = "user-item";
      userDiv.dataset.user = user;
      
      const status = document.createElement("div");
      status.className = "user-status";
      
      const name = document.createElement("span");
      name.textContent = user;
      
      userDiv.appendChild(status);
      userDiv.appendChild(name);
      usersList.appendChild(userDiv);
    }
  });
}

function updateRoomCounts() {
  Object.keys(rooms).forEach(roomName => {
    const roomItem = document.querySelector(`[data-room="${roomName}"]`);
    const countElement = roomItem.querySelector(".room-count");
    countElement.textContent = rooms[roomName].users.size;
  });
}

function showTypingIndicator(user) {
  clearTypingIndicator();
  
  if (user === currentUser) return;
  
  const typingDiv = document.createElement("div");
  typingDiv.className = "typing-indicator";
  typingDiv.id = "typing-indicator";
  
  const dots = document.createElement("div");
  dots.className = "typing-dots";
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("div");
    dot.className = "typing-dot";
    dots.appendChild(dot);
  }
  
  const text = document.createElement("span");
  text.textContent = `${user} is typing...`;
  text.style.marginLeft = "8px";
  text.style.fontSize = "12px";
  text.style.color = "#00d4ff";
  
  typingDiv.appendChild(dots);
  typingDiv.appendChild(text);
  messageContainer.appendChild(typingDiv);
  scrollToBottom();
}

function clearTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) {
    indicator.remove();
  }
}

function scrollToBottom() {
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

socket.on("clients-total", (data) => {
  onlineCount.textContent = `${data} online`;
});

socket.on("chat-message", (data) => {
  if (data.isPrivate) {
    const sender = data.name;
    if (sender !== currentUser) {
      if (!privateChats.has(sender)) {
        privateChats.set(sender, { messages: [], users: [currentUser, sender] });
        addPrivateChatToList(sender);
      }
      
      privateChats.get(sender).messages.push({
        from: sender,
        message: data.message,
        dateTime: data.dateTime,
        messageId: data.messageId
      });
      
      if (currentChat !== sender) {
        const currentUnread = unreadCounts.get(sender) || 0;
        unreadCounts.set(sender, currentUnread + 1);
        updatePrivateChatUI(sender);
      }
      
      if (currentChat === sender) {
        addMessageToUI(false, data);
      }
    }
  } else if (data.room === currentRoom && !currentChat) {
    addMessageToUI(false, data);
  }
});

socket.on("reaction", (data) => {
  const { messageId, reactions } = data;
  updateReactions(messageId, reactions);
});

socket.on("user-joined", (data) => {
  if (data.room === currentRoom && !currentChat) {
    users.add(data.user);
    rooms[data.room].users.add(data.user);
    updateUserList();
    updateRoomCounts();
    addSystemMessage(`${data.user} joined the room`);
  }
});

socket.on("user-left", (data) => {
  if (data.room === currentRoom && !currentChat) {
    users.delete(data.user);
    rooms[data.room].users.delete(data.user);
    updateUserList();
    updateRoomCounts();
    addSystemMessage(`${data.user} left the room`);
  }
});

socket.on("typing", (data) => {
  if ((data.room === currentRoom && !currentChat) || (data.room === currentChat && currentChat)) {
    if (data.user !== currentUser) {
      typingUsers.add(data.user);
      showTypingIndicator(data.user);
    }
  }
});

socket.on("stop-typing", (data) => {
  if ((data.room === currentRoom && !currentChat) || (data.room === currentChat && currentChat)) {
    typingUsers.delete(data.user);
    if (typingUsers.size === 0) {
      clearTypingIndicator();
    }
  }
});

socket.on("room-users", (data) => {
  if (data.room === currentRoom && !currentChat) {
    users = new Set(data.users);
    rooms[data.room].users = new Set(data.users);
    updateUserList();
    updateRoomCounts();
  }
});

function addGlowEffect(element) {
  element.style.boxShadow = "0 0 20px rgba(0, 212, 255, 0.5)";
  setTimeout(() => {
    element.style.boxShadow = "";
  }, 1000);
}

const cyberpunkMessages = [
  "🔥 System online and ready for action!",
  "💙 Neon lights are glowing tonight!",
  "⚡ Power levels at maximum!",
  "🎮 Ready to hack the mainframe!",
  "🚀 Launch sequence initiated!"
];

setInterval(() => {
  if (Math.random() < 0.1) {
    const randomMessage = cyberpunkMessages[Math.floor(Math.random() * cyberpunkMessages.length)];
    addSystemMessage(randomMessage);
  }
}, 30000);
