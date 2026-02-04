// Position Iceberg Explorer - Sam Edition

const API_KEY_STORAGE = 'iceberg_api_key';

// Sam's persona context
const samPersona = `Sam is a seasoned, outspoken data scientist at LumenLyte Labs, a wearable tech and wellness firm. He's been with the company for over 10 years, making him one of its longest-tenured employees.

Key traits about Sam:
- Highly experienced, deeply knowledgeable, and unapologetically opinionated
- Has seen countless trends, policies, and "game-changing initiatives" come and go
- Believes in efficiency, but not at the cost of common sense
- Not opposed to change outright, but hates change for the sake of change
- Direct, no-nonsense communication style, often laced with skepticism
- Despite his gruff exterior, cares deeply about quality of work and colleagues
- Has seen too many good employees burn out due to mismanaged expectations
- Not looking for promotions or power—just wants to do his job well and protect the integrity of the work
- Will adapt to things that truly make sense and prove themselves, but grudgingly`;

// Layer prompts
const layerPrompts = {
  interests: {
    title: "Interests",
    prompt: `You are analyzing what Sam, a veteran data scientist, said. Given his persona and his stated position, identify ONE key underlying INTEREST that might motivate what he said.

${samPersona}

Interests are the "why" behind the position - what Sam actually wants to achieve, gain, or protect. Focus on practical goals and desired outcomes that someone like Sam would have.

What Sam said: "{position}"

Phrase your response as: "Sam might actually mean: [explanation of what he's really trying to achieve]"

Respond with a JSON array containing exactly ONE string (2-3 sentences). Example format:
["Sam might actually mean: ..."]`
  },
  values: {
    title: "Values",
    prompt: `You are analyzing what Sam, a veteran data scientist, said. Given his persona and his stated position, identify ONE key underlying VALUE that might shape what he said.

${samPersona}

Values are deeply held principles about what is right, important, or worthwhile. Think about what Sam holds sacred given his experience and personality.

What Sam said: "{position}"

Phrase your response as: "Sam might actually mean: [explanation of the value he's protecting]"

Respond with a JSON array containing exactly ONE string (2-3 sentences). Example format:
["Sam might actually mean: ..."]`
  },
  beliefs: {
    title: "Beliefs",
    prompt: `You are analyzing what Sam, a veteran data scientist, said. Given his persona and his stated position, identify ONE key underlying BELIEF that might inform what he said.

${samPersona}

Beliefs are assumptions about how the world works, what is true, or what will happen. These are shaped by Sam's 10+ years of experience seeing initiatives succeed and fail.

What Sam said: "{position}"

Phrase your response as: "Sam might actually mean: [explanation of the belief driving his statement]"

Respond with a JSON array containing exactly ONE string (2-3 sentences). Example format:
["Sam might actually mean: ..."]`
  },
  needs: {
    title: "Needs",
    prompt: `You are analyzing what Sam, a veteran data scientist, said. Given his persona and his stated position, identify ONE key underlying NEED that might drive what he said.

${samPersona}

Needs are fundamental human requirements like safety, belonging, respect, autonomy, fairness, or recognition. Think about what basic human need Sam might be protecting, given his experience and care for his colleagues.

What Sam said: "{position}"

Phrase your response as: "Sam might actually mean: [explanation of the need he's expressing]"

Respond with a JSON array containing exactly ONE string (2-3 sentences). Example format:
["Sam might actually mean: ..."]`
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
