import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, closeDb } from './db/index.js';
import routes from './routes/index.js';
import { initSocket } from './controllers/socket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});


const httpServer = createServer(app);

const io = initSocket(httpServer);

async function start() {
  try {
    await initDb();
    console.log('✓ Database connected');

    httpServer.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`  API: http://localhost:${PORT}/api`);
      console.log(`  WebSocket: Socket.IO эндпоинт готов к работе`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('\n✓ Shutting down gracefully...');
  
  if (io) {
    console.log('✓ Closing WebSocket connections...');
    io.close();
  }

  httpServer.close(async () => {
    console.log('✓ HTTP server closed');
    await closeDb();
    console.log('✓ Database disconnected');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
});

start();