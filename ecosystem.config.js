module.exports = {
  apps: [{
    name: 'architectural-ai-api',
    script: 'src/server.js',
    env: {
      NODE_ENV: 'development',
      PORT: 4000,
    },
    watch: ['src'],
    ignore_watch: ['node_modules', 'uploads'],
    max_memory_restart: '300M',
  }],
};
