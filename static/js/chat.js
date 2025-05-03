document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const settingsButton = document.getElementById('settings-button');
    const modal = document.getElementById('settings-modal');
    const closeButton = document.querySelector('.close-button');
    const saveSettings = document.getElementById('save-settings');
    
    let currentAIMessage = null;

    // Function to add message to chat
    function addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${type}-message`);
        messageDiv.textContent = content;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    // Function to handle the streaming response
    function handleStream(message) {
        // Create a new EventSource for this message
        const eventSource = new EventSource('/chat');
        
        // Add temporary AI message container
        currentAIMessage = addMessage('', 'ai');
        
        let fullResponse = '';
        
        // Handle incoming message chunks
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.content) {
                    fullResponse += data.content;
                    currentAIMessage.textContent = fullResponse;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };
        
        // Handle errors
        eventSource.onerror = function(error) {
            console.error('EventSource error:', error);
            eventSource.close();
            if (!fullResponse) {
                currentAIMessage.textContent = 'Sorry, I encountered an error processing your request.';
            }
        };
        
        // Clean up
        return eventSource;
    }

    // Send message function
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessage(message, 'user');
        messageInput.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            currentAIMessage = addMessage('', 'ai');

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, {stream: true});
                
                // Process complete SSE messages
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                currentAIMessage.textContent += data.content;
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                        } catch (e) {
                            console.error('Error parsing SSE message:', e);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error:', error);
            if (currentAIMessage) {
                currentAIMessage.textContent = 'Sorry, I encountered an error processing your request.';
            }
        }
    }

    // Event Listeners
    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Settings Modal Event Listeners
    settingsButton.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Save settings
    saveSettings.addEventListener('click', () => {
        const themeSelect = document.getElementById('theme-select');
        document.body.className = themeSelect.value;
        modal.style.display = 'none';
    });
});