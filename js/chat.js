document.addEventListener("DOMContentLoaded", ()=>{
    // Get all the needed elements
    const currentUsername = document.getElementById('currentUsername');
    const logoutBtn = document.getElementById('logoutBtn');
    const friendsList = document.getElementById('friendsList');
    const addFriendBtn = document.getElementById('addFriendBtn');
    const friendUsername = document.getElementById('friendUsername');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const noFriendsMessage = document.getElementById('noFriendsMessage');
    const welcomeMessage = document.getElementById('welcomeMessage');
    const activeChatArea = document.getElementById('activeChatArea');
    const currentChatFriend = document.getElementById('currentChatFriend');
    
    // Current active chat
    let activeFriend = null;

    // Put the user name in the chat page 
    let currentUser = sessionStorage.getItem("currentUser");
    currentUsername.textContent = currentUser;
    
    // Remove avatar setting code
   // cet fonction permet de recuperer l'historique des messages echangés entre les utilisateurs connecté
    function getLocalChatHistory(friend) {
        const chatKey = [currentUser, friend].sort().join('-');
        const history = localStorage.getItem(`chat_${chatKey}`);
        return history ? JSON.parse(history) : [];
    }
    //cet fonction ajoute a chaque fois un nouveau message envoyé à l'historique de la conversation entre currentUser et friend puis le sauvgarde dans le localStorage
    function saveMessageToLocal(friend, messageObj) {
        const chatKey = [currentUser, friend].sort().join('-');
        
        // Get existing history
        let history = getLocalChatHistory(friend);
        
        // Add timestamp if not present
        if (!messageObj.timestamp) {
            messageObj.timestamp = new Date().toISOString();
        }
        
        // Add message to history
        history.push(messageObj);
        
        // Limit history size (keep last 100 messages)
        if (history.length > 100) {
            history = history.slice(-100);
        }
        
        // Save to localStorage
        localStorage.setItem(`chat_${chatKey}`, JSON.stringify(history));
    }
    
    // Connect to the WebSocket server
    const socket = new WebSocket('ws://localhost:8080');

    // Add a periodic refresh for the friends list
    function setupPeriodicRefresh() {
        // Request friends list every 30 seconds to ensure it stays in sync
        setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'getFriends',
                    username: currentUser
                }));
            }
        }, 30000); // 30 seconds
    }

    // Add reconnection logic
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    socket.onclose = function(event) {
        console.log('WebSocket connection closed:', event);
        
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const timeout = Math.min(1000 * reconnectAttempts, 5000); // Exponential backoff, max 5 seconds
            
            afficherNotification(`Connexion perdue. Tentative de reconnexion dans ${timeout/1000} secondes...`, 'error');
            
            setTimeout(() => {
                console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                // Recreate the WebSocket connection
                socket = new WebSocket('ws://localhost:8080');
                
                // Re-attach all event handlers
                setupSocketHandlers(socket);
            }, timeout);
        } else {
            afficherNotification('Impossible de se reconnecter au serveur. Veuillez rafraîchir la page.', 'error');
        }
    };

    // Function to setup all socket handlers
    function setupSocketHandlers(socket) {
        socket.onopen = () => {
            console.log('WebSocket connection established');
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            
            // Identify to the server
            socket.send(JSON.stringify({
                type: 'identify',
                username: currentUser
            }));
            
            // Setup periodic refresh
            setupPeriodicRefresh();
        };
        
        socket.onmessage = (event) => {
            // Your existing message handler code
            const data = JSON.parse(event.data);
            console.log('Received from server:', data);
            
            if (data.type === 'friendsList') {
                console.log('Received friends list:', data.friends);
                updateFriendsList(data.friends);
            }
            
            if (data.type === 'chatHistory') {
                displayChatHistory(data.history);
            }
            
            if (data.type === 'message') {
                // Check if this is a message for the active chat
                if ((data.sender === activeFriend && data.recipient === currentUser) || 
                    (data.sender === currentUser && data.recipient === activeFriend)) {
                    
                    if (data.sender === currentUser) {
                        // This is a confirmation of our own message
                        // If it has a tempId, update the existing message instead of creating a new one
                        if (data.tempId) {
                            const tempMessage = document.querySelector(`[data-message-id="${data.tempId}"]`);
                            if (tempMessage) {
                                // Update the temporary message with the server-assigned ID
                                tempMessage.setAttribute('data-message-id', data.id);
                                
                                // Update in local storage too
                                updateMessageIdInLocal(activeFriend, data.tempId, data.id);
                                return; // Skip creating a new message
                            }
                        }
                        
                        // If we couldn't find the temp message, just display it normally
                        // This is a fallback and shouldn't normally happen
                        displayMessage(data.content, 'sent', null, data.timestamp, data.id);
                    } else {
                        // This is a message from the friend, display it normally
                        displayMessage(data.content, 'received', data.sender, data.timestamp, data.id);
                    }
                } else {
                    // Save to local storage for non-active chats
                    if (data.sender !== currentUser) {
                        saveMessageToLocal(data.sender, {
                            content: data.content,
                            type: 'received',
                            sender: data.sender,
                            timestamp: data.timestamp,
                            id: data.id
                        });
                        
                        // Show notification for new message
                        afficherNotification(`Nouveau message de ${data.sender}`, 'info');
                    }
                }
            }
            
            if (data.type === 'notification') {
                afficherNotification(data.message, data.level || 'info');
            }
            
            if (data.type === 'messageDeleted') {
                // Remove the message from UI if it exists
                const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
                if (messageElement) {
                    messageElement.classList.add('deleting');
                    setTimeout(() => {
                        messageElement.remove();
                    }, 300);
                    
                    // Remove from local storage
                    if (data.sender === activeFriend || data.recipient === activeFriend) {
                        removeMessageFromLocal(activeFriend, data.messageId);
                    }
                }
            }

            if (data.type === 'addFriendResult') {
                afficherNotification(data.message, data.success ? 'success' : 'error');
            }
            
            if (data.type === 'removeFriendResult') {
                afficherNotification(data.message, data.success ? 'success' : 'error');
            }
            if (data.type === 'message' && data.sender !== currentUser) {
        // Notification pour message reçu
                if (data.sender === activeFriend) {
            // Message dans le chat actif
                 afficherNotification(`Message de ${data.sender}: ${data.content}`, 'received');
                } else {
            // Message d'un autre ami (notification plus courte)
                afficherNotification(`Nouveau message de ${data.sender}`, 'received');
                }
            }
        };
        
        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    // Initial setup of the socket handlers
    setupSocketHandlers(socket);

    // Add this function to generate random colors for avatars
    function getRandomColor() {
        const colors = [
            '#f44336', '#e91e63', '#9c27b0', '#673ab7', 
            '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', 
            '#009688', '#4caf50', '#8bc34a', '#cddc39',
            '#ffc107', '#ff9800', '#ff5722', '#795548'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Add this function to create avatar elements
    function createAvatarElement(username) {
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.style.backgroundColor = getRandomColor();
        avatar.textContent = username.charAt(0).toUpperCase();
        return avatar;
    }
    
    // Add avatar to current user in header
    const userInfoDiv = document.querySelector('.user-info');
    if (userInfoDiv) {
        const avatar = createAvatarElement(currentUser);
        userInfoDiv.prepend(avatar);
    }
    
    // Update friends list
    function updateFriendsList(friends) {
        console.log('Updating friends list with:', friends); // Debug log
        
        // Clear the existing list except the noFriendsMessage
        const items = friendsList.querySelectorAll('li:not(#noFriendsMessage)');
        items.forEach(item => item.remove());
        
        if (friends && friends.length > 0) {
            // Hide the "no friends" message
            noFriendsMessage.style.display = 'none';
            
            // Add each friend to the list
            friends.forEach(friend => {
                if (!friend) return; // Skip empty friend entries
                
                // Create friend list item
                const li = document.createElement('li');
                li.className = 'friend-item';
                
                // Create avatar for friend
                const avatar = createAvatarElement(friend);
                
                // Create elements instead of using innerHTML for better event handling
                const friendNameDiv = document.createElement('div');
                friendNameDiv.className = 'friend-name';
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = friend;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-friend';
                removeBtn.setAttribute('data-username', friend);
                
                const icon = document.createElement('i');
                icon.className = 'fas fa-times';
                
                // Assemble the elements
                removeBtn.appendChild(icon);
                friendNameDiv.appendChild(avatar);
                friendNameDiv.appendChild(nameSpan);
                li.appendChild(friendNameDiv);
                li.appendChild(removeBtn);
                
                // Add click event for selecting a friend to chat with
                friendNameDiv.addEventListener('click', () => {
                    activeFriend = friend;
                    currentChatFriend.textContent = friend;
                    welcomeMessage.style.display = 'none';
                    activeChatArea.style.display = 'flex';
                    messagesContainer.innerHTML = '';
                    
                    // Load local history
                    const localHistory = getLocalChatHistory(friend);
                    displayChatHistory(localHistory);
                    
                    // Request chat history
                    socket.send(JSON.stringify({
                        type: 'getChatHistory',
                        sender: currentUser,
                        recipient: friend
                    }));
                });
                
                // Add click event for removing a friend
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showConfirmDialog(`Êtes-vous sûr de vouloir supprimer ${friend} de vos amis?`, () => {
                        socket.send(JSON.stringify({
                            type: 'removeFriend',
                            username: currentUser,
                            friendUsername: friend
                        }));
                        
                        if (activeFriend === friend) {
                            activeFriend = null;
                            welcomeMessage.style.display = 'flex';
                            activeChatArea.style.display = 'none';
                        }
                    });
                });
                
                friendsList.appendChild(li);
            });
        } else {
            // Show the "no friends" message
            noFriendsMessage.style.display = 'block';
        }
    }
    
    // Display chat history
    function displayChatHistory(history) {
        messagesContainer.innerHTML = '';
        
        history.forEach(msg => {
            const type = msg.type || (msg.sender === currentUser ? 'sent' : 'received');
            const sender = type === 'received' ? msg.sender : null;
            displayMessage(msg.content, type, sender, msg.timestamp, msg.messageId);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Display a message in the chat
    function displayMessage(content, type, sender = null, timestamp = null, messageId = null) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        
        // Generate a unique ID if not provided
        const id = messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        messageElement.setAttribute('data-message-id', id);
        
        let messageContent = content;
        let avatarHTML = '';
        
        if (type === 'received' && sender) {
            // Create avatar for sender
            const avatar = document.createElement('div');
            avatar.className = 'user-avatar';
            avatar.style.backgroundColor = getRandomColor();
            avatar.textContent = sender.charAt(0).toUpperCase();
            
            // Add avatar to message
            messageElement.prepend(avatar);
            
            messageContent = `<span class="sender-name">${sender}</span>${content}`;
        }
        
        let timeDisplay = '';
        if (timestamp) {
            const date = new Date(timestamp);
            timeDisplay = `<span class="message-time">${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}</span>`;
        } else {
            const now = new Date();
            timeDisplay = `<span class="message-time">${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}</span>`;
            timestamp = now.toISOString();
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Add delete button for sent messages
        let deleteButton = '';
        if (type === 'sent') {
            deleteButton = `<button class="delete-message" title="Delete message"><i class="fas fa-trash"></i></button>`;
        }
        
        contentDiv.innerHTML = `${messageContent}${timeDisplay}${deleteButton}`;
        messageElement.appendChild(contentDiv);
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Add event listener for delete button
        if (type === 'sent') {
            const deleteBtn = contentDiv.querySelector('.delete-message');
            deleteBtn.addEventListener('click', () => {
                showConfirmDialog('Êtes-vous sûr de vouloir supprimer ce message?', () => {
                    // Send delete request to server
                    socket.send(JSON.stringify({
                        type: 'deleteMessage',
                        messageId: id,
                        sender: currentUser,
                        recipient: activeFriend
                    }));
                    
                    // Remove message from UI
                    messageElement.classList.add('deleting');
                    setTimeout(() => {
                        messageElement.remove();
                    }, 300);
                    
                    // Remove from local storage
                    removeMessageFromLocal(activeFriend, id);
                });
            });
        }
        
        // Save message to localStorage if an activeFriend is selected
        if (activeFriend) {
            saveMessageToLocal(activeFriend, {
                content,
                type,
                sender: sender || currentUser,
                timestamp,
                id
            });
        }
        
        return id;
    }
    // Add friend functionality
    addFriendBtn.addEventListener('click', () => {
        const friendEmail = friendUsername.value.trim();
        if (friendEmail) {
            socket.send(JSON.stringify({
                type: 'addFriend',
                username: currentUser,
                friendEmail: friendEmail
            }));
            friendUsername.value = '';
        } else {
            afficherNotification("Veuillez entrer l'email de votre ami", 'error');
        }
    })
    
    // Send message functionality
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        
        if (message && activeFriend) {
            afficherNotification(`Message envoyé à ${activeFriend}`, 'sent');
            // Generate a temporary ID for the message
            const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Display the message immediately with the temporary ID
            displayMessage(message, 'sent', null, new Date().toISOString(), tempId);
            
            // Send the message via WebSocket
            socket.send(JSON.stringify({
                type: 'message',
                sender: currentUser,
                recipient: activeFriend,
                content: message,
                tempId: tempId // Include the temporary ID
            }));
            
            // Clear the input field
            messageInput.value = '';
        }
    });
    
    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
    function afficherNotification(message, type = 'info') {
        const notif = document.createElement('div');
        notif.className = `notification notification-${type}`;
 
        // Icônes différentes selon le type
        let icon = 'ℹ️'; // Par défaut
        if (type === 'received') icon = '📩';
        if (type === 'sent') icon = '📤';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
 
        notif.innerHTML = `
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
        `;
 
        const notificationsContainer = document.getElementById('notifications');
        notificationsContainer.appendChild(notif);
 
        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // Function to remove a message from local storage
    function removeMessageFromLocal(friend, messageId) {
        const chatKey = [currentUser, friend].sort().join('-');
        
        // Get existing history
        let history = getLocalChatHistory(friend);
        
        // Remove the message with the given ID
        history = history.filter(msg => msg.id !== messageId);
        
        // Save updated history to localStorage
        localStorage.setItem(`chat_${chatKey}`, JSON.stringify(history));
    }

    // Add a function to update message IDs in local storage
    function updateMessageIdInLocal(friend, tempId, permanentId) {
        const chatKey = [currentUser, friend].sort().join('-');
        
        // Get existing history
        let history = getLocalChatHistory(friend);
        
        // Find and update the message with the temporary ID
        for (let i = 0; i < history.length; i++) {
            if (history[i].id === tempId) {
                history[i].id = permanentId;
                break;
            }
        }
        
        // Save updated history to localStorage
        localStorage.setItem(`chat_${chatKey}`, JSON.stringify(history));
    }
}); // This closing bracket appears to be misplaced. It should be moved before the event listeners 
     // since it's currently closing the displayMessage function incorrectly. The code between this
     // bracket and the event listeners won't be accessible.

function showConfirmDialog(message, onConfirm) {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'dialog-overlay';
    
    const dialogBox = document.createElement('div');
    dialogBox.className = 'dialog-box';
    
    dialogBox.innerHTML = `
        <p>${message}</p>
        <div class="dialog-buttons">
            <button class="btn-cancel">Annuler</button>
            <button class="btn-confirm">Confirmer</button>
        </div>
    `;
    
    dialogOverlay.appendChild(dialogBox);
    document.body.appendChild(dialogOverlay);
    
    // Add animation
    setTimeout(() => dialogOverlay.classList.add('visible'), 10);
    
    // Handle button clicks
    dialogBox.querySelector('.btn-cancel').addEventListener('click', () => {
        closeDialog(dialogOverlay);
    });
    
    dialogBox.querySelector('.btn-confirm').addEventListener('click', () => {
        closeDialog(dialogOverlay);
        onConfirm();
    });
}

function closeDialog(dialogOverlay) {
    dialogOverlay.classList.remove('visible');
    setTimeout(() => {
        dialogOverlay.remove();
    }, 300);
}

// Add event delegation for delete buttons
messagesContainer.addEventListener('click', (e) => {
    if (e.target.closest('.delete-message')) {
        const messageElement = e.target.closest('.message');
        const messageId = messageElement.getAttribute('data-message-id');
        
        if (messageId && activeFriend) {
            // Send delete request to server
            socket.send(JSON.stringify({
                type: 'deleteMessage',
                sender: currentUser,
                recipient: activeFriend,
                messageId: messageId
            }));
            
            // Add deleting animation
            messageElement.classList.add('deleting');
        }
    }
});
function afficherNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    
    // Icônes différentes selon le type
    let icon = '📩'; // Icône par défaut pour les messages reçus
    let bgColor = '#e8f5e9'; // Couleur de fond vert clair
    
    if (type === 'sent') {
        icon = '📤';
        bgColor = '#e3f2fd'; // Bleu clair pour les messages envoyés
    }
    
    notif.innerHTML = `
        <span class="notification-icon">${icon}</span>
        <span class="notification-text">${message}</span>
    `;
    notif.style.backgroundColor = bgColor;
    
    const notificationsContainer = document.getElementById('notifications');
    notificationsContainer.appendChild(notif);
    
    // Animation d'apparition
    setTimeout(() => {
        notif.style.opacity = '1';
        notif.style.transform = 'translateY(0)';
    }, 10);
    
    // Disparaît après 3 secondes
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}