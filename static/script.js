const API_URL = 'http://localhost:8000';

let chatContainer;
let chatBox;
let userInput;
let sendButton;
let loadingIndicator;

document.addEventListener('DOMContentLoaded', () => {
    chatContainer = document.getElementById("chat-container");
    chatBox = document.getElementById("chat-box");
    userInput = document.getElementById("user-input");
    sendButton = document.getElementById("send-button");
    
    // Create loading indicator
    loadingIndicator = document.createElement("div");
    loadingIndicator.className = "message bot-message loading-message fade-in";
    loadingIndicator.innerHTML = `
        <div class="loading-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="loading-text">MyAyur Health Assistant is thinking...</span>
        </div>
    `;
    
    initializeChat();
    setupEventListeners();
});

function initializeChat() {
    chatContainer.style.display = "flex";
    appendMessage("Welcome to MyAyur Health! I'm your professional Ayurvedic health assistant. How may I assist you today?", "bot");
}

function setupEventListeners() {
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }
}

function appendMessage(text, sender, isStreaming = false) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);
    
    // Add fade-in animation class
    messageDiv.classList.add("fade-in");
    
    const prefix = sender === "user" ? "You: " : "MyAyur Health Assistant: ";
    
    if (sender === "bot" && isStreaming) {
        const contentSpan = document.createElement("span");
        messageDiv.appendChild(document.createTextNode(prefix));
        messageDiv.appendChild(contentSpan);
    } else {
        messageDiv.textContent = prefix + text;
    }
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return messageDiv;
}

function showLoadingIndicator() {
    // First, remove any existing loading indicator if present
    hideLoadingIndicator();

    // Remove fade-out class to reset the animation
    loadingIndicator.classList.remove("fade-out");

    // Now, append the loading indicator to the chat box
    chatBox.appendChild(loadingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function hideLoadingIndicator() {
    if (loadingIndicator.parentNode === chatBox) {
        loadingIndicator.classList.add("fade-out");
        setTimeout(() => {
            if (loadingIndicator.parentNode === chatBox) {
                chatBox.removeChild(loadingIndicator);
            }
        }, 300); // Match this with CSS transition duration
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Clear input and disable controls
    userInput.value = "";
    userInput.disabled = true;
    if (sendButton) sendButton.disabled = true;

    // Add user message with fade-in
    appendMessage(message, "user");

    // Show loading indicator before sending a new request
    showLoadingIndicator();

    try {
        const response = await fetch(`${API_URL}/ask/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Create new bot message container
        const botMessageDiv = appendMessage("", "bot", true);
        const botContent = botMessageDiv.querySelector("span") || botMessageDiv;
        let responseText = "";

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.error) {
                            throw new Error(data.error);
                        }

                        if (data.token) {
                            responseText += data.token;
                            botContent.textContent = responseText;
                            chatBox.scrollTop = chatBox.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
        appendMessage("I apologize, but I encountered an error. Please try again.", "bot");
    } finally {
        // Hide loading indicator after processing the response
        hideLoadingIndicator();

        // Re-enable controls
        userInput.disabled = false;
        if (sendButton) sendButton.disabled = false;
        userInput.focus();
    }
}

function toggleChat() {
    chatContainer.style.display = chatContainer.style.display === "none" ? "flex" : "none";
}

// Export functions for external use
window.toggleChat = toggleChat;
window.sendMessage = sendMessage;
