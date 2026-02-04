// Position Iceberg Explorer

const API_KEY_STORAGE = 'iceberg_api_key';

// Layer prompts
const layerPrompts = {
  interests: {
    title: "Interests",
    prompt: `Given this stated position, identify 3-4 underlying INTERESTS that might motivate this position. Interests are the "why" behind the position - what the person actually wants to achieve, gain, or protect. Focus on practical goals and desired outcomes.

Stated Position: "{position}"

Respond with a JSON array of strings, each being a concise interest (1-2 sentences max). Example format:
["Interest 1 explanation", "Interest 2 explanation", "Interest 3 explanation"]`
  },
  values: {
    title: "Values",
    prompt: `Given this stated position, identify 3-4 underlying VALUES that might shape this position. Values are deeply held principles about what is right, important, or worthwhile. Think about ethics, priorities, and what this person might hold sacred.

Stated Position: "{position}"

Respond with a JSON array of strings, each being a concise value (1-2 sentences max). Example format:
["Value 1 explanation", "Value 2 explanation", "Value 3 explanation"]`
  },
  beliefs: {
    title: "Beliefs",
    prompt: `Given this stated position, identify 3-4 underlying BELIEFS that might inform this position. Beliefs are assumptions about how the world works, what is true, or what will happen. These shape how the person interprets situations.

Stated Position: "{position}"

Respond with a JSON array of strings, each being a concise belief (1-2 sentences max). Example format:
["Belief 1 explanation", "Belief 2 explanation", "Belief 3 explanation"]`
  },
  needs: {
    title: "Needs",
    prompt: `Given this stated position, identify 3-4 underlying NEEDS that might drive this position. Needs are fundamental human requirements like safety, belonging, respect, autonomy, fairness, or recognition. Think about what basic human need this position might be protecting.

Stated Position: "{position}"

Respond with a JSON array of strings, each being a concise need (1-2 sentences max). Example format:
["Need 1 explanation", "Need 2 explanation", "Need 3 explanation"]`
  }
};

// Get stored API key
function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE);
}

// Open modal
function openModal() {
  const modal = document.getElementById('api-modal');
  const input = document.getElementById('api-key-input');
  const stored = getApiKey();
  if (stored) {
    input.value = stored;
  }
  modal.classList.add('open');
}

// Close modal
function closeModal() {
  document.getElementById('api-modal').classList.remove('open');
}

// Save API key
function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const key = input.value.trim();
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
  closeModal();
}

// Explore a layer
async function explore(layerType) {
  const position = document.getElementById('position-input').value.trim();

  if (!position) {
    alert('Please enter a position first.');
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    openModal();
    return;
  }

  const layer = document.querySelector(`.layer[data-layer="${layerType}"]`);
  const content = document.getElementById(`${layerType}-content`);

  // Set loading state
  layer.classList.add('loading');
  layer.classList.remove('explored');
  content.innerHTML = '<p>Exploring beneath the surface...</p>';

  try {
    const layerConfig = layerPrompts[layerType];
    const prompt = layerConfig.prompt.replace('{position}', position);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse the JSON array from response
    let items;
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      // Fallback: split by newlines if JSON parsing fails
      items = text.split('\n').filter(line => line.trim()).slice(0, 4);
    }

    // Display results
    const html = `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    content.innerHTML = html;
    layer.classList.add('explored');

  } catch (error) {
    console.error('Error:', error);
    content.innerHTML = `<p style="color: #ffb9b5;">Error: ${escapeHtml(error.message)}</p>`;

    if (error.message.includes('401') || error.message.includes('invalid') || error.message.includes('key')) {
      openModal();
    }
  } finally {
    layer.classList.remove('loading');
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Close modal on background click
document.getElementById('api-modal').addEventListener('click', (e) => {
  if (e.target.id === 'api-modal') {
    closeModal();
  }
});
