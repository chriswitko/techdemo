const express = require('express')
const morgan = require('morgan')
const helmet = require('helmet')
const favicon = require('serve-favicon')
const ejs = require('ejs')
const path = require('path')
const bodyParser = require('body-parser')
const api = require('../api')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const cors = require('cors')
const compression = require('compression')

const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const TwitterStrategy = require('passport-twitter').Strategy

ejs.delimiter = '?'
const cacheTime = 86400000 * 7 // 7 days

const getMongoURL = (options) => {
  const url = options.servers
    .reduce((prev, cur) => prev + cur + ',', 'mongodb://')

  return `${url.substr(0, url.length - 1)}`
}

const start = (options) => {
  return new Promise((resolve, reject) => {
    const hostname = process.env.NODE_ENV === 'production' ? 'https://techspeller.com' : 'http://localhost:' + options.port

    if (!options.repo) {
      reject(new Error('The server must be started with a connected repository'))
    }
    if (!options.port) {
      reject(new Error('The server must be started with an available port'))
    }

    if (options.oAuthSettings) {
      passport.use(new FacebookStrategy({
        clientID: options.oAuthSettings.facebookClientId,
        clientSecret: options.oAuthSettings.facebookSecretId,
        callbackURL: hostname + '/auth/facebook/return',
        profileFields: ['id', 'displayName', 'email']
      }, (accessToken, refreshToken, profile, cb) => {
        options.repo.users.registerUser(profile).then(user => cb(null, user))
      }))

      passport.use(new TwitterStrategy({
        consumerKey: options.oAuthSettings.twitterClientId,
        consumerSecret: options.oAuthSettings.twitterSecretId,
        userProfileURL: 'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
        callbackURL: hostname + '/auth/twitter/return'
      }, (accessToken, refreshToken, profile, cb) => {
        options.repo.users.registerUser(profile).then(user => cb(null, user))
      }))

      passport.serializeUser((user, cb) => cb(null, user))

      passport.deserializeUser((obj, cb) => cb(null, obj))
    }

    const app = express()
    app.use(morgan('dev'))
    app.use(helmet())

    app.use(cors())
    app.options('*', cors())

    app.use(compression())

    app.use(favicon(path.join(__dirname, '/../client/images/favicon-128.png')))
    app.use(require('cookie-parser')('tech$1125speller', {
      maxAge: 31 * 24 * 60 * 60 * 1000
    }))

    app.use(bodyParser.json())       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
      extended: true
    }))
    app.use(session({
      secret: 'tech$1125speller',
      resave: true,
      saveUninitialized: true,
      store: new MongoStore({url: getMongoURL(options.dbSettings)})
    }))

    app.use(passport.initialize())
    app.use(passport.session())

    app.use(express.static(path.join(__dirname, '/../client'), { maxAge: cacheTime }))
    app.set('views', path.join(__dirname, '/../client'))
    app.engine('.html', require('express-ejs-extend'))
    app.set('view engine', 'html')

    api(app, options)

    app.use((err, req, res, next) => {
      console.log('err', err)
      reject(new Error('Something went wrong!, err:' + err))
      res.status(500).send('Something went wrong!')
    })

    const server = app.listen(options.port, () => resolve(server))
  })
}

module.exports = Object.assign({}, {start})
