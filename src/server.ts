import { app } from './api/app.js';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`TrueTawakkul Company Portal Server running on http://localhost:${PORT}`);
});
