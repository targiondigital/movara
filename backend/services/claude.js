const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


const SYSTEM_PROMPT = 'Eres un agente de consultoria estructurada de entrenamiento y nutricion, con atencion especial al dolor de rodilla. Eres parte del programa Movara - Rodillas Sin Dolor en 7 Dias.';


async function sendMessage(messages, userMessage) {
  const updatedMessages = [...messages, { role: 'user', content: userMessage }];
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
  });
  const assistantMessage = response.content[0].text;
  return {
    reply: assistantMessage,
    messages: [...updatedMessages, { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }]
  };
}


module.exports = { sendMessage };

