import { app } from './server.js';
import { env } from './config/env.js';

// Arranque del servidor HTTP
const PORT = env.PORT; // puerto interno del contenedor
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});
