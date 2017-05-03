'use strict'
const ObjectID = require('./ObjectID')
const AppError = require('./AppError')
const CreateSend = require('createsend-node')
const cmApi = new CreateSend({ apiKey: '589e6263f8a96cbe238661d33767130a' })

const idx = (p, o) => p.reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, o)

const validateEmail = email => {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}

const admins = [
  'chris.witko@gmail.com',
  'chris.witko@me.com'
]

const repository = (db) => {
  const collection = db.collection('users')

  const getAllUsers = ({page = 1, limit = 10}) => {
    return new Promise((resolve, reject) => {
      const users = []
      const cursor = collection.find({}, {title: 1, id: 1}).skip((page - 1) * 10, limit)
      const addUser = (user) => {
        users.push(user)
      }
      const sendUsers = (err) => {
        if (err) {
          resolve(AppError('An error occured fetching all users, err:' + err))
        }
        resolve(users.slice())
      }
      if (cursor.length) {
        cursor.forEach(addUser, sendUsers)
      } else {
        sendUsers('Missing users')
      }
    })
  }

  const getUserById = id => {
    return new Promise((resolve, reject) => {
      const projection = { _id: 0, id: 1, title: 1, format: 1 }
      const sendUser = (err, user) => {
        if (err || !user) {
          reject(AppError(`An error occured fetching a user with id: ${id}, err: ${err}`))
        }
        resolve(user)
      }
      if (!id) {
        sendUser('No id')
      } else {
        collection.findOne({_id: ObjectID(id)}, projection, sendUser)
      }
    })
  }

  const registerUser = profile => {
    return new Promise((resolve, reject) => {
      const sendUser = (err, user) => {
        if (err || !user) {
          reject(AppError(`An error occured fetching a user, err: ${err}`))
        }
        resolve(user)
      }
      const isSubscribed = email => validateEmail(email)
      const getEmail = profile => idx(['0', 'value'], profile.emails)
      const createUser = (err, user) => {
        if (err || !user) {
          user = {
            displayName: profile.displayName,
            username: profile.username,
            provider: profile.provider,
            providerId: profile.id,
            email: getEmail(profile),
            isAdmin: admins.includes(getEmail(profile)),
            isSubscribed: isSubscribed(getEmail(profile)),
            karma: 0
          }
          user.createdAt = new Date().toISOString()
          user.updatedAt = new Date().toISOString()
          collection.insertOne(user, _ => {
            campaignMonitorSubscribeUser(user, _ => {
              sendUser(err, user)
            })
          })
        } else {
          user.lastSignedIn = new Date().toISOString()
          user.isAdmin = admins.includes(user.email)
          collection.update({provider: profile.provider, providerId: profile.id}, user, _ => {
            sendUser(err, user)
          })
        }
      }
      if (!profile) {
        sendUser('No user')
      } else {
        collection.findOne({provider: profile.provider, providerId: profile.id}, createUser)
      }
    })
  }

  const unsubscribeUserFromNewsletter = profile => {
    return new Promise((resolve, reject) => {
      const sendUser = (err, user) => {
        if (err || !user) {
          reject(AppError(`An error occured fetching a user, err: ${err}`))
        }
        resolve(user)
      }
      if (!profile) {
        sendUser('No user')
      } else {
        campaignMonitorUnsubscribeUser(profile, _ => {
          collection.update({_id: ObjectID(profile._id)}, {$set: {isSubscribed: false}}, sendUser)
        })
      }
    })
  }

  const subscribeUserToNewsletter = profile => {
    return new Promise((resolve, reject) => {
      const sendUser = (err, user) => {
        if (err || !user) {
          reject(AppError(`An error occured fetching a user, err: ${err}`))
        }
        resolve(user)
      }
      if (!profile) {
        sendUser('No user')
      } else {
        if (validateEmail(profile.email)) {
          campaignMonitorSubscribeUser(profile, _ => {
            collection.update({_id: ObjectID(profile._id)}, {$set: {email: profile.email, isSubscribed: true}}, sendUser)
          })
        } else {
          sendUser('Wrong email')
        }
      }
    })
  }

  const campaignMonitorSubscribeUser = (profile, cb) => {
    if (validateEmail(profile.email)) {
      cmApi.subscribers.addSubscriber('4ee3e9b82fb21f642052856f3da6cf79', {
        'EmailAddress': profile.email,
        'Name': profile.displayName,
        'Resubscribe': true
      }, (err, subscriber) => {
        cb(err, subscriber)
      })
    } else {
      cb('Wrong email address')
    }
  }

  const campaignMonitorUnsubscribeUser = (profile, cb) => {
    cmApi.subscribers.unsubscribeSubscriber('4ee3e9b82fb21f642052856f3da6cf79', profile.email, (err, subscriber) => {
      cb(err, subscriber)
    })
  }

  return Object.assign({}, {
    subscribeUserToNewsletter,
    unsubscribeUserFromNewsletter,
    registerUser,
    getAllUsers,
    getUserById
  })
}

const connect = (connection) => {
  return new Promise((resolve, reject) => {
    if (!connection) {
      reject(new Error('connection db not supplied!'))
    }
    resolve(repository(connection))
  })
}

module.exports = Object.assign({}, {connect})
