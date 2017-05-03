'use strict'

const repository = (db, p) => {
  const disconnect = () => {
    db.close()
  }

  return Object.assign({}, p, {
    disconnect
  })
}

const promisedProperties = (object) => {
  let promisedProperties = []
  const objectKeys = Object.keys(object)

  objectKeys.forEach((key) => promisedProperties.push(object[key]))

  return Promise.all(promisedProperties)
    .then((resolvedValues) => {
      return resolvedValues.reduce((resolvedObject, property, index) => {
        resolvedObject[objectKeys[index]] = property
        return resolvedObject
      }, object)
    })
}

const connect = (connection) => {
  return new Promise((resolve, reject) => {
    if (!connection) {
      reject(new Error('connection db not supplied!'))
    }
    promisedProperties({
      users: require('./users').connect(connection),
      categories: require('./categories').connect(connection),
      links: require('./links').connect(connection)
    }).then(p => {
      resolve(repository(connection, p))
    }).catch(e => {
      reject(new Error('repo not available!'))
    })
  })
}

module.exports = Object.assign({}, {connect})
