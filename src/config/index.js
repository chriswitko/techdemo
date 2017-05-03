const {dbSettings, serverSettings, oAuthSettings} = require('./config')
const db = require('./mongo')

module.exports = Object.assign({}, {dbSettings, serverSettings, oAuthSettings, db})
