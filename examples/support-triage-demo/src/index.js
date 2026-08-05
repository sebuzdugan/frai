import express from 'express';
import { triageTicket } from './triage.js';

const app = express();
app.use(express.json());

// TRIAGE_MODE: auto | shadow | off (kill switch, config change only - no deploy)
const MODE = process.env.TRIAGE_MODE ?? 'auto';

app.post('/tickets', async (req, res) => {
  if (MODE === 'off') return res.json({ severity: 'P2', team: 'product', summary: 'manual triage' });
  try {
    const result = await triageTicket(req.body);
    if (MODE === 'auto' && result.severity === 'P1') {
      await fetch(process.env.PAGER_WEBHOOK, { method: 'POST', body: JSON.stringify(result) });
    }
    res.json(result);
  } catch {
    res.status(502).json({ severity: 'P2', team: 'product', summary: 'triage failed, human queue' });
  }
});

app.listen(3000);
