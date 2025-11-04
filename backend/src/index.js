import { app } from './server.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

// Arranque del servidor HTTP
const PORT = env.PORT; // puerto interno del contenedor
const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on port ${PORT}`);
});

async function shutdown(signal) {
  try {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Closing HTTP server...`);
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    // eslint-disable-next-line no-console
    console.log('Shutdown completed.');
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error during shutdown', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
