
/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

/* Additional elements */
const sendBtn = document.getElementById("sendBtn");
const latestQuestion = document.getElementById("latestQuestion");
const questionText = document.getElementById("questionText");

/*
  Cloudflare Worker URL

  Replace this placeholder with your deployed
  Cloudflare Worker URL.
*/
const WORKER_URL =
  "https://loreal-beauty-assistant.ssorrells03.workers.dev";

/* Conversation history

  This array stores previous user questions and
  assistant responses so the chatbot can remember
  context during the conversation.
*/
const conversationHistory = [];

/*
  Display chat messages

  role = "user" or "assistant"
*/
function displayMessage(role, message) {
  const messageDiv = document.createElement("div");

  messageDiv.classList.add("msg");

  if (role === "user") {
    messageDiv.classList.add("user");
  } else {
    messageDiv.classList.add("ai");
  }

  const label = document.createElement("strong");
  label.classList.add("msg-label");

  label.textContent =
    role === "user" ? "You" : "L'Oréal Beauty Assistant";

  const messageText = document.createElement("div");
  messageText.textContent = message;

  messageDiv.appendChild(label);
  messageDiv.appendChild(messageText);

  chatWindow.appendChild(messageDiv);

  // Automatically scroll to the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return messageDiv;
}

/*
  Display latest question

  Replaces the previous question each time
  the user sends a new message.
*/
function updateLatestQuestion(question) {
  questionText.textContent = question;
  latestQuestion.hidden = false;
}

/*
  Welcome message

  Replaces the original plain-text greeting
  with an assistant chat bubble.
*/
displayMessage(
  "assistant",
  "👋 Hello! Welcome to your L'Oréal Beauty Assistant! " +
    "I'm here to help you discover beauty products, " +
    "skincare routines, haircare tips, and makeup " +
    "recommendations. What can I help you with today?"
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Capture user input
  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  // Display user's message
  displayMessage("user", message);

  // Update latest question
  updateLatestQuestion(message);

  // Clear input
  userInput.value = "";

  // Disable sending while waiting
  sendBtn.disabled = true;
  userInput.disabled = true;

  // Show loading message
  const loadingMessage = displayMessage(
    "assistant",
    "Thinking..."
  );

  loadingMessage.classList.add("loading");

  /*
    Add the new user message to a temporary
    conversation array. Only save it permanently
    after the API request succeeds.
  */
  const pendingHistory = [
    ...conversationHistory,
    {
      role: "user",
      content: message
    }
  ];

  try {
    /*
      Send request to Cloudflare Worker.

      The Worker securely communicates with
      OpenAI using the API key stored in Cloudflare.
    */
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: pendingHistory
      })
    });

    // Parse API response
    const data = await response.json();

    // Check for errors
    if (!response.ok) {
      throw new Error(
        data.error?.message ||
        data.error ||
        "Unable to get a response."
      );
    }

    /*
      Extract the assistant's response from
      OpenAI Chat Completions API.
    */
    const aiResponse =
      data.choices[0].message.content;

    if (typeof aiResponse !== "string" ||
        !aiResponse.trim()) {
      throw new Error("The assistant returned an empty response.");
    }

    // Remove loading message
    loadingMessage.remove();

    // Display assistant response
    displayMessage("assistant", aiResponse);

    /*
      Save successful conversation history.

      This allows the assistant to remember
      previous questions and answers.
    */
    conversationHistory.push(
      {
        role: "user",
        content: message
      },
      {
        role: "assistant",
        content: aiResponse
      }
    );

  } catch (error) {
    console.error("Chatbot error:", error);

    // Remove loading message
    loadingMessage.remove();

    // Display friendly error message
    displayMessage(
      "assistant",
      "I'm sorry! I'm having trouble connecting " +
        "right now. Please try again in a moment."
    );

  } finally {
    // Re-enable input and send button
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
});
