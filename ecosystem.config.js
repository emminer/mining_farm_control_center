module.exports = {
  apps : [
    {
      name: 'mfcc',
      script: './bin/www',
      watch: false,
      env: {
        'PORT': 3000,
        'NODE_ENV': 'development'
      },
      env_production: {
        'PORT': 3001,
        'NODE_ENV': 'production',
        'LOG_LEVEL': 'info',
      },
      env_production2: {
        'PORT': 3001,
        'NODE_ENV': 'production',
        'LOG_LEVEL': 'verbose',
      }
    }
  ]
};
