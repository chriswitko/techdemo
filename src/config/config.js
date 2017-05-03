const dbSettings = {
  servers: (process.env.DB_SERVERS) ? process.env.DB_SERVERS.split(' ') : [
    ''
  ],
  dbParameters: () => ({
    w: 'majority',
    wtimeout: 10000,
    j: true,
    native_parser: false
  }),
  serverParameters: () => ({
    autoReconnect: true,
    poolSize: 10,
    socketoptions: {
      keepAlive: 300,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000
    }
  }),
  replsetParameters: (replset = 'rs1') => ({
    replicaSet: replset,
    ha: true,
    haInterval: 10000,
    poolSize: 10,
    socketoptions: {
      keepAlive: 300,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000
    }
  })
}

const serverSettings = {
  static: false,
  port: process.env.PORT || 3020,
  ssl: require('./ssl')
}

const oAuthSettings = {
  facebookClientId: '',
  facebookSecretId: '',
  twitterClientId: '',
  twitterSecretId: ''
}

module.exports = Object.assign({}, { dbSettings, serverSettings, oAuthSettings })
