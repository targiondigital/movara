const Anthropic = require('@anthropic-ai/sdk').default;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function sendMessage(messages) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet',
    max_tokens: 1024,
    messages,
  });

  return response;
}

module.exports = { sendMessage };
