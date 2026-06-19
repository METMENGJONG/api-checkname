const express = require('express');
const { checkRole } = require('./smileone');

const app = express();
const PORT = process.env.PORT || 8000;

app.get('/check_role', async (req, res) => {
  const { user_id, zone_id, region, phpsessid, game } = req.query;
  await handleCheckRole(req, res, game || 'mobilelegends');
});

app.get('/check_role/:game', async (req, res) => {
  await handleCheckRole(req, res, req.params.game);
});

async function handleCheckRole(req, res, game) {
  const { user_id, zone_id = '', region = 'br', phpsessid = '' } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  const result = await checkRole(region, game, user_id, phpsessid, zone_id);

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json(result);
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Smile.One API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
