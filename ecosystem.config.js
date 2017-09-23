module.exports = {
  apps : [
      {
        name: "mfcc",
        script: "./bin/www",
        watch: true,
        env: {
            "PORT": 3000,
            "NODE_ENV": "development"
        },
        env_production: {
            "PORT": 3001,
            "NODE_ENV": "production",
            "LOG_LEVEL": "info",
        }
      }
  ]
}
