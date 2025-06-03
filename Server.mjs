import { WebSocketServer } from "ws";
import { createServer } from "http";
import fs from "fs";
import { parse } from "url";
import path from "path";
import crypto from "crypto"; // Import crypto for generating unique IDs

// Define MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Create an HTTP server and WebSocket server
 */
const server = createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const { pathname } = parse(req.url);

  // Handle login requests
  if (pathname === '/login' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        
        // Read users from file
        fs.readFile('users.txt', 'utf8', (err, data) => {
          if (err) {
            console.error('Error reading users file:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Server error' }));
            return;
          }
          // Split the users.txt into lines 
          const users = data.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
              const [storedUsername, storedEmail, storedPassword] = line.split(',');
              return { username: storedUsername, email: storedEmail, password: storedPassword };
            });
            
          // Find the user with the provided email and password
          const user = users.find(u => u.email === email && u.password === password);
          
          if (user) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, username: user.username }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: "Email ou mot de passe incorrect"}));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid request format' }));
      }
    });
  }
  // Add new User to exist user;
  else if(pathname === '/register' && req.method === 'POST'){
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { username, email, password } = JSON.parse(body);
        
        // Read existing users and the type property to separete between response data 500 interanle server error and 400 user already existe and 200 the user has been saved by server
        fs.readFile('users.txt', 'utf8', (err, data) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Error reading users file:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, type: 500,message: 'Serveur erreur eassay plus tard'}));
            return;
          }
          
          const users = data ? data.split('\n').filter(line => line.trim() !== '') : [];
          
          // Check if username already exists
          if (users.some(user => user.split(',')[1] === email)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, type: 400,message: 'Cet email est déjà utilisé' }));
            return;
          }
          
          // Add new user
          const newUser = `${username},${email},${password},[]\n`;
          fs.appendFile('users.txt', newUser, (err) => {
            if (err) {
              console.error('Error writing to users file:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, type: 500,message: 'Serveur erreur eassay plus tard' }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, type: 200,message: "l'utilisateur étais enregistré avec succès" }));
            }
          });
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false,type: 400,message: 'Requete format est invalid'}));
      }
    });
  }
  // Serve static files
  else {
    // Default to index.html if the path is just "/"
    let filePath = pathname === '/' ? './index.html' : '.' + pathname;
    
    // Get the file extension
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'text/plain';
    
    // Read the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File not found
          res.writeHead(404);
          res.end('File not found');
        } else {
          // Server error
          res.writeHead(500);
          res.end(`Server Error: ${err.code}`);
        }
      } else {
        // Success
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
});

// Create WebSocket server using the HTTP server
const wss = new WebSocketServer({ server });

// Start the server on port 8080
server.listen(8080, () => {
  console.log("Server is running on port 8080");
});

// Object for storing connected users
let connectedUsers = {};

// Function to generate a unique ID
function generateUniqueId() {
  return crypto.randomBytes(16).toString('hex');
}

// Function to read users from file
function readUsersFile() {
  return new Promise((resolve, reject) => {
    fs.readFile('users.txt', 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve([]); // File doesn't exist, return empty array
        } else {
          reject(err);
        }
        return;
      }
      
      const users = data.split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
          const parts = line.split(',');
          const username = parts[0];
          const email = parts[1];
          const password = parts[2];
          let friends = [];
          
          // Check if friends list exists and parse it
          if (parts.length > 3 && parts[3]) {
            try {
              friends = JSON.parse(parts[3]);
            } catch (e) {
              console.error('Error parsing friends list for user:', username, e);
            }
          }
          
          return { username, email, password, friends };
        });
      
      resolve(users);
    });
  });
}

// Function to write users to file
function writeUsersFile(users) {
  return new Promise((resolve, reject) => {
    const data = users.map(user => {
      return `${user.username},${user.email},${user.password},${JSON.stringify(user.friends)}`;
    }).join('\n') + '\n';
    
    fs.writeFile('users.txt', data, 'utf8', (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Function to get user by username
async function getUserByUsername(username) {
  const users = await readUsersFile();
  return users.find(user => user.username === username);
}

// Function to get user by email
async function getUserByEmail(email) {
  const users = await readUsersFile();
  return users.find(user => user.email === email);
}

// Function to add friend
async function addFriend(username, friendEmail) {
  try {
    const users = await readUsersFile();
    const userIndex = users.findIndex(user => user.username === username);
    const friendUser = users.find(user => user.email === friendEmail);
    
    if (userIndex === -1) {
      return { success: false, message: "Utilisateur non trouvé" };
    }
    
    if (!friendUser) {
      return { success: false, message: "Ami non trouvé" };
    }
    
    if (username === friendUser.username) {
      return { success: false, message: "Vous ne pouvez pas vous ajouter vous-même" };
    }
    
    // Check if already friends
    if (users[userIndex].friends.includes(friendUser.username)) {
      return { success: false, message: "Déjà ami avec cet utilisateur" };
    }
    
    // Add friend to user's friend list
    users[userIndex].friends.push(friendUser.username);
    
    // Add user to friend's friend list (mutual friendship)
    const friendIndex = users.findIndex(user => user.username === friendUser.username);
    users[friendIndex].friends.push(username);
    
    await writeUsersFile(users);
    
    return { 
      success: true, 
      message: "Ami ajouté avec succès",
      friends: users[userIndex].friends,
      friendUsername: friendUser.username,
      friendsFriends: users[friendIndex].friends
    };
  } catch (err) {
    console.error('Error adding friend:', err);
    return { success: false, message: "Erreur serveur" };
  }
}

// Function to remove friend
async function removeFriend(username, friendUsername) {
  try {
    const users = await readUsersFile();
    const userIndex = users.findIndex(user => user.username === username);
    const friendIndex = users.findIndex(user => user.username === friendUsername);
    
    if (userIndex === -1 || friendIndex === -1) {
      return { success: false, message: "Utilisateur non trouvé" };
    }
    
    // Remove friend from user's friend list
    users[userIndex].friends = users[userIndex].friends.filter(friend => friend !== friendUsername);
    
    // Remove user from friend's friend list
    users[friendIndex].friends = users[friendIndex].friends.filter(friend => friend !== username);
    
    await writeUsersFile(users);
    
    return { 
      success: true, 
      message: "Ami supprimé avec succès",
      friends: users[userIndex].friends
    };
  } catch (err) {
    console.error('Error removing friend:', err);
    return { success: false, message: "Erreur serveur" };
  }
}

// Replace in-memory chat history with file-based storage
let chatHistory = {};

// Function to read chat history from file
function readChatHistoryFile() {
  return new Promise((resolve, reject) => {
    fs.readFile('ChatHistory.txt', 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve({}); // File doesn't exist, return empty object
        } else {
          reject(err);
        }
        return;
      }
      
      try {
        const history = JSON.parse(data);
        resolve(history);
      } catch (e) {
        console.error('Error parsing chat history file:', e);
        resolve({});
      }
    });
  });
}

// Function to write chat history to file
function writeChatHistoryFile(history) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(history, null, 2);
    
    fs.writeFile('ChatHistory.txt', data, 'utf8', (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Function to save a message to chat history
async function saveMessage(sender, recipient, content) {
  try {
    // Read current chat history
    chatHistory = await readChatHistoryFile();
    
    const chatKey = [sender, recipient].sort().join('-');
    
    if (!chatHistory[chatKey]) {
      chatHistory[chatKey] = [];
    }
    
    const message = {
      sender,
      recipient,
      content,
      timestamp: new Date().toISOString(),
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    chatHistory[chatKey].push(message);
    
    // Limit history to last 100 messages per conversation
    if (chatHistory[chatKey].length > 100) {
      chatHistory[chatKey] = chatHistory[chatKey].slice(-100);
    }
    
    // Write updated history to file
    await writeChatHistoryFile(chatHistory);
    
    return message;
  } catch (err) {
    console.error('Error saving message:', err);
    return null;
  }
}

// Function to get chat history
async function getChatHistory(sender, recipient) {
  try {
    // Read current chat history
    chatHistory = await readChatHistoryFile();
    
    const chatKey = [sender, recipient].sort().join('-');
    return chatHistory[chatKey] || [];
  } catch (err) {
    console.error('Error getting chat history:', err);
    return [];
  }
}

// Function to delete a message from chat history
async function deleteMessage(sender, recipient, messageId) {
  try {
    // Read current chat history
    chatHistory = await readChatHistoryFile();
    
    const chatKey = [sender, recipient].sort().join('-');
    
    if (!chatHistory[chatKey]) {
      return { success: false, message: "Chat history not found" };
    }
    
    const initialLength = chatHistory[chatKey].length;
    chatHistory[chatKey] = chatHistory[chatKey].filter(msg => msg.id !== messageId);
    
    const wasDeleted = chatHistory[chatKey].length < initialLength;
    
    if (wasDeleted) {
      // Write updated history to file
      await writeChatHistoryFile(chatHistory);
    }
    
    return { 
      success: wasDeleted, 
      message: wasDeleted ? "Message deleted successfully" : "Message not found" 
    };
  } catch (err) {
    console.error('Error deleting message:', err);
    return { success: false, message: "Server error" };
  }
}

wss.on('connection', (ws) => {
  // Assign a unique connection ID immediately
  const connectionId = generateUniqueId();
  ws.id = connectionId;
  
  console.log(`New client connected with ID: ${connectionId}`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle user identification
      if (data.type === 'identify') {
        const username = data.username;
        // Store both the WebSocket and the connection ID
        connectedUsers[username] = {
          ws: ws,
          id: connectionId,
          connectionTime: new Date().toISOString()
        };
        ws.username = username;
        
        // Send confirmation to the client with their ID
        ws.send(JSON.stringify({
          type: 'identified',
          id: connectionId,
          username: username,
          timestamp: new Date().toISOString()
        }));
        
        // Immediately send the friends list after identification
        const user = await getUserByUsername(username);
        if (user) {
          ws.send(JSON.stringify({
            type: 'friendsList',
            friends: user.friends || []
          }));
        }
        
        //pour afficher à tous clients en ligne la liste àjour des utilisateurs en ligne
        broadcastOnlineUsers();
      }
 
      // Handle get friends request
      if (data.type === 'getFriends') {
        const user = await getUserByUsername(data.username);
        if (user) {
          ws.send(JSON.stringify({
            type: 'friendsList',
            friends: user.friends || []
          }));
        }
      }
      
      // Handle add friend request
      if (data.type === 'addFriend') {
        const result = await addFriend(data.username, data.friendEmail);
        
        ws.send(JSON.stringify({
          type: 'addFriendResult',
          success: result.success,
          message: result.message
        }));
        
        if (result.success) {
          // Send updated friends list to the user who initiated the request
          ws.send(JSON.stringify({
            type: 'friendsList',
            friends: result.friends
          }));
          
          // Notify the friend if they are online
          const friendUsername = result.friendUsername;
          if (friendUsername && connectedUsers[friendUsername]) {
            connectedUsers[friendUsername].ws.send(JSON.stringify({
              type: 'friendsList',
              friends: result.friendsFriends
            }));
            
            // Also send a notification to the friend
            connectedUsers[friendUsername].ws.send(JSON.stringify({
              type: 'notification',
              message: `${data.username} vous a ajouté comme ami`,
              level: 'success'
            }));
          }
        }
      }
      
      // Handle remove friend request
      if (data.type === 'removeFriend') {
        const result = await removeFriend(data.username, data.friendUsername);
        
        ws.send(JSON.stringify({
          type: 'removeFriendResult',
          success: result.success,
          message: result.message
        }));
        
        if (result.success) {
          // Send updated friends list
          ws.send(JSON.stringify({
            type: 'friendsList',
            friends: result.friends
          }));
          
          // Notify the friend if they are online
          if (connectedUsers[data.friendUsername]) {
            const friendUser = await getUserByUsername(data.friendUsername);
            connectedUsers[data.friendUsername].ws.send(JSON.stringify({
              type: 'friendsList',
              friends: friendUser.friends
            }));
          }
        }
      }
      
      // Handle get chat history request
      if (data.type === 'getChatHistory') {
        const history = await getChatHistory(data.sender, data.recipient);
        
        ws.send(JSON.stringify({
          type: 'chatHistory',
          history: history
        }));
      }
      
      // Handle chat messages
      if (data.type === 'message') {
        const { sender, recipient, content, tempId } = data;
        
        // Save message to history
        const message = await saveMessage(sender, recipient, content);
        
        if (message) {
          // Send to recipient if online
          if (connectedUsers[recipient]) {
            connectedUsers[recipient].ws.send(JSON.stringify({
              type: 'message',
              sender: sender,
              recipient: recipient,
              content: content,
              timestamp: message.timestamp,
              id: message.id
            }));
          }
          
          // Send confirmation back to sender with both IDs
          ws.send(JSON.stringify({
            type: 'message',
            sender: sender,
            recipient: recipient,
            content: content,
            timestamp: message.timestamp,
            id: message.id,
            tempId: tempId // Include the temporary ID for reference
          }));
        }
      }
      
      // Handle delete message request
      if (data.type === 'deleteMessage') {
        const { sender, recipient, messageId } = data;
        
        // Delete the message from history
        const result = await deleteMessage(sender, recipient, messageId);
        
        if (result.success) {
          // Notify the sender
          ws.send(JSON.stringify({
            type: 'messageDeleted',
            messageId: messageId,
            sender: sender,
            recipient: recipient
          }));
          
          // Notify the recipient if they are online
          if (connectedUsers[recipient]) {
            connectedUsers[recipient].ws.send(JSON.stringify({
              type: 'messageDeleted',
              messageId: messageId,
              sender: sender,
              recipient: recipient
            }));
          }
        }
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${connectionId}`);
    if (ws.username) {
      delete connectedUsers[ws.username];
      broadcastOnlineUsers();
    }
  });
});
//pour informer  tous les utilisateurs connectés de la liste des utilisateurs actuellement en ligne en envoyant un message à chaque client
function broadcastOnlineUsers() {
  const onlineUsernames = Object.keys(connectedUsers);

  const message = JSON.stringify({
    type: 'onlineUsers',
    users: onlineUsernames
  });

  onlineUsernames.forEach(username => {
    connectedUsers[username].ws.send(message);
  });
}

