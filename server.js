import { createServer } from './src/server.js';

const port = Number(process.env.PORT || 3000);
createServer().listen(port, '0.0.0.0', () => {
  console.log(`AlphaBee Binance evidence bridge listening on port ${port}`);
});
