module.exports = {
  apps: [
    {
      name: 'context7-orchestrator',
      script: 'scripts/phase89-context7-knowledge-organizer.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        QDRANT_URL: 'http://localhost:6333',
        POSTGRES_URL: 'postgresql://user:password@localhost:5434/legal'
      },
      cron_restart: '0 */6 * * *', // Restart every 6 hours
      watch: false,
      max_memory_restart: '2G'
    },
    {
      name: 'context7-indexer-cluster',
      script: 'scripts/phase89-file-indexer-worker.mjs',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        QUEUE_KEY: 'phase89:indexing:queue',
        WORKER_ID: process.env.pm_id || '0'
      },
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'context7-ace-analyzer',
      script: 'scripts/phase89-ace-rag-kag.mjs',
      instances: 2, // 2 analyzers for parallelism
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        OLLAMA_URL: 'http://127.0.0.1:11434',
        QDRANT_URL: 'http://localhost:6333',
        DOCS_LOADED: 'true'
      },
      watch: false,
      max_memory_restart: '3G'
    },
    {
      name: 'context7-progress-monitor',
      script: 'scripts/phase89-progress-monitor.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_URL: 'redis://localhost:6379',
        MONITOR_INTERVAL: '5000' // 5 seconds
      },
      watch: false
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:semaj90/mau5law.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
