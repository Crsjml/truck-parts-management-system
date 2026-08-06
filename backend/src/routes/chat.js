import express from 'express';

const router = express.Router();

router.post('/simulate', (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const text = (lastUserMessage?.content || "").toLowerCase();

  // Simulate some processing delay
  setTimeout(() => {
    let content = [];
    
    if (text.includes("price") || text.includes("part") || text.includes("oem")) {
      content = [
        { type: "text", text: "I found that part in our catalog! Here are the details:" },
        { 
          type: "tool-call", 
          toolName: "show_part", 
          toolCallId: `call_${Date.now()}`, 
          args: { 
            part: {
              id: 'MOCK-1',
              name: 'FleetGuard Air Filter Premium',
              sku: 'FG-AF-1200',
              price: 85.50,
              stock: 12,
              minStock: 5,
              category: 'Filters',
              oem: 'OEM-1234'
            } 
          } 
        }
      ];
    } else {
      content = [
        { type: "text", text: `I can certainly help with that. (Simulated response to: "${text}")` }
      ];
    }

    res.json({ content });
  }, 1000);
});

export default router;
