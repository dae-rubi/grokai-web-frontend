const LITELLM_PROXY = "https://litellm-production-xxxx.up.railway.app"; // GANTI DENGAN URL LITELLM KAMU
const MASTER_KEY = "sk-1234-grokai-ultimate-2025"; // Ganti dengan MASTER_KEY kamu

const messagesDiv = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const modelSelect = document.getElementById("modelSelect");

let recognition = null;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = 'id-ID';
  recognition.continuous = false;
}

function addMessage(role, content) {
  const div = document.createElement("div");
  div.className = `message ${role} w-auto max-w-full mx-4 my-2`;
  div.innerHTML = role === "user" ? content : marked.parse(content);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div;
}

async function sendMessage() {
  const prompt = userInput.value.trim();
  if (!prompt) return;

  addMessage("user", prompt);
  userInput.value = "";
  const botMsg = addMessage("bot", "<span class='streaming'>•</span>");

  const model = modelSelect.value;
  const isImage = model.includes("flux");

  if (isImage) {
    botMsg.innerHTML = "Generating image...";
    const res = await fetch(`${LITELLM_PROXY}/images/generations`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${MASTER_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "flux-schnell", prompt, n: 1, size: "1024x1024" })
    });
    const data = await res.json();
    const imgUrl = data.data[0].url;
    botMsg.innerHTML = `<img src="${imgUrl}" class="rounded-lg max-w-full mt-2" />`;
    return;
  }

  const response = await fetch(`${LITELLM_PROXY}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${MASTER_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  botMsg.innerHTML = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      if (line === "data: [DONE]") continue;
      try {
        const json = JSON.parse(line.slice(6));
        const delta = json.choices[0]?.delta?.content;
        if (delta) {
          text += delta;
          botMsg.innerHTML = marked.parse(text) + "<span class='streaming'>•</span>";
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
      } catch (e) {}
    }
  }
  botMsg.innerHTML = marked.parse(text);
}

// Voice Input
voiceBtn.onclick = () => {
  if (!recognition) return alert("Browser tidak support voice input");
  recognition.start();
  voiceBtn.style.background = "#10b981";
  recognition.onresult = (e) => {
    userInput.value = e.results[0][0].transcript;
    voiceBtn.style.background = "";
  };
  recognition.onend = () => voiceBtn.style.background = "";
};

// Enter & Click
userInput.addEventListener("keypress", e => e.key === "Enter" && sendMessage());
sendBtn.onclick = sendMessage;

// Load marked.js untuk render markdown
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
document.head.appendChild(script);
