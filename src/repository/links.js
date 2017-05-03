'use strict'
const ObjectID = require('./ObjectID')
const AppError = require('./AppError')
const parseDomain = require('parse-domain')
const ta = require('time-ago')
const slug = require('slug')
const algoliasearch = require('algoliasearch')
const search = algoliasearch('NCKK4ZMLV0', '909afdb50a39a15d7e982a3c007b5258')
const index = search.initIndex('links')

const idx = (p, o) => p.reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, o)
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const repository = (db) => {
  const collectionLinks = db.collection('links')
  const collectionVotes = db.collection('votes')

  const addVote = (link, user, cb) => {
    collectionVotes.update({link: ObjectID(link), user: ObjectID(user)}, {$set: {createdAt: new Date().toISOString()}}, {upsert: true}, cb)
  }

  const removeVote = (link, user, cb) => {
    collectionVotes.remove({link: ObjectID(link), user: ObjectID(user)}, cb)
  }

  const getLinkById = ({id, slug, user}) => {
    return new Promise((resolve, reject) => {
      const projection = {title: 1, url: 1, source: 1, votes: 1, createdAt: 1, slug: 1, category: 1, isApproved: 1, id: 1}
      const query = {}
      if (id) {
        query._id = ObjectID(id)
      }
      if (slug) {
        query.slug = slug
      }
      getAllVotes({user}).then(votes => {
        const sendLink = (err, link) => {
          if (err || !link) {
            reject(AppError(`An error occured fetching a movie with id: ${id}, err: ${err}`))
          }
          link.voted = votes.includes(link._id.toString())
          link.ago = ta().ago(link.createdAt)
          resolve(link)
        }
        if (!id && !slug) {
          sendLink('No id')
        } else {
          collectionLinks.findOne(query, projection, sendLink)
        }
      })
    })
  }

  const getAllVotes = ({user}) => {
    return new Promise((resolve, reject) => {
      const votes = []
      let query = {user: null}

      if (user) {
        query.user = ObjectID(user)
      }

      const cursor = collectionVotes.find(query, {})
      const addVote = (vote) => {
        votes.push(vote.link.toString())
      }
      const sendVotes = (err) => {
        if (err) {
          resolve([])
        }
        resolve(votes.slice())
      }
      cursor.forEach(addVote, sendVotes)
    })
  }

  const getAllLinks = ({ids = [], page = 1, limit = 50, user = null, category = null, source = null, exclude = []}) => {
    return new Promise((resolve, reject) => {
      const links = []
      let query = {
        _id: {$nin: exclude.map(e => ObjectID(e))},
        isApproved: true
      }

      if (ids.length) {
        query._id = {$in: ids.map(e => ObjectID(e))}
      }

      if (category) {
        if (!['upvoted', 'new'].includes(category)) {
          query.category = category
        }
      }

      if (source) {
        query.source = source
      }

      getAllVotes({user}).then(votes => {
        if (category === 'upvoted') {
          query._id = {$in: votes.map(v => ObjectID(v))}
        }
        if (category === 'new') {
          delete query.isApproved
          query.createdAt = {$gt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()}
          query['$or'] = [{isApproved: {$exists: false}}, {isApproved: {$eq: false}}]
        }

        const cursor = collectionLinks.find(query, {title: 1, url: 1, source: 1, votes: 1, createdAt: 1, slug: 1, category: 1, isApproved: 1, id: 1}, {sort: [['createdAt', -1], ['votes', -1]]}).skip((page - 1) * 10, limit)
        const addLink = (link) => {
          link.voted = votes.includes(link._id.toString())
          link.ago = ta().ago(link.createdAt)
          links.push(link)
        }
        const sendLinks = (err) => {
          if (err) {
            resolve([])
          }
          resolve(links.slice())
        }
        cursor.forEach(addLink, sendLinks)
      })
    })
  }

  const addToAlgolia = obj => {
    return new Promise((resolve, reject) => {
      index.addObjects([obj], (err, content) => {
        if (err) {
          reject(err)
        }
        resolve(obj)
      })
    })
  }


  const deleteFromAlgolia = id => {
    return new Promise((resolve, reject) => {
      index.deleteObject(id, (err, content) => {
        if (err) {
          reject(err)
        }
        resolve(id)
      })
    })
  }

  const searchLinks = ({q = '', user = null, page = 1}) => {
    return new Promise((resolve, reject) => {
      index.search(q, (_, content) => {
        getAllLinks({ids: content.hits.map(h => h._id), user: idx(['_id'], user), page: page}).then(links => {
          resolve(links)
        })
      })
    })
  }

  const addLink = input => {
    return new Promise((resolve, reject) => {
      const sendLink = (err, link) => {
        if (err || !link) {
          reject(AppError(`An error occured fetching a link, err: ${err}`))
        }
        addToAlgolia(link).then(_ => resolve(link))
      }
      const createLink = (err, link) => {
        if (err || !link) {
          const source = parseDomain(input.url)
          link = {
            user: ObjectID(input.user._id),
            title: input.title,
            url: input.url,
            source: source.domain + '.' + source.tld,
            category: input.category,
            slug: slug(input.title + ' ' + new Date().getTime(), {lower: true}),
            votes: input.user.isAdmin ? getRandomInt(getRandomInt(1, 6), getRandomInt(6, 17)) : 0,
            isApproved: input.user.isAdmin
          }
          link.createdAt = new Date().toISOString()
          collectionLinks.insertOne(link, _ => {
            sendLink(err, link)
          })
        } else {
          sendLink(err, link)
        }
      }
      if (!input) {
        sendLink('No link')
      } else {
        collectionLinks.findOne({url: input.url}, createLink)
      }
    })
  }

  const deleteLink = input => {
    return new Promise((resolve, reject) => {
      const sendLink = (err, link) => {
        if (err || !link) {
          reject(AppError(`An error occured fetching a link, err: ${err}`))
        }
        deleteFromAlgolia(link).then(_ => resolve(link))
      }
      if (!input) {
        sendLink('No link')
      } else {
        collectionVotes.remove({link: ObjectID(input.link), user: ObjectID(input.user)}, collectionLinks.remove({_id: ObjectID(input.link)}, sendLink))
      }
    })
  }

  const approveLink = input => {
    return new Promise((resolve, reject) => {
      const sendLink = (err, link) => {
        if (err || !link) {
          reject(AppError(`An error occured fetching a link, err: ${err}`))
        }
        resolve(link)
      }
      if (!input) {
        sendLink('No link')
      } else {
        collectionLinks.update({_id: ObjectID(input.link)}, {$set: {isApproved: true}, $inc: {votes: 1}}, sendLink)
      }
    })
  }

  const visitLink = input => {
    return new Promise((resolve, reject) => {
      const sendLink = (err, link) => {
        if (err || !link) {
          reject(AppError(`An error occured fetching a link, err: ${err}`))
        }
        resolve(link)
      }
      if (!input) {
        sendLink('No link')
      } else {
        collectionLinks.update({_id: ObjectID(input.link)}, {$inc: {clicks: 1, votes: 1}}, sendLink)
      }
    })
  }

  const followLink = input => {
    return new Promise((resolve, reject) => {
      const sendLink = (err, link) => {
        if (err || !link) {
          reject(AppError(`An error occured fetching a link, err: ${err}`))
        }
        resolve(link)
      }
      if (!input) {
        sendLink('No link')
      } else {
        addVote(input.link, input.user, _ => collectionLinks.update({_id: ObjectID(input.link)}, {$inc: {votes: 1}, $set: {votedAt: new Date().toISOString()}}, sendLink))
      }
    })
  }

  const unfollowLink = input => {
    return new Promise((resolve, reject) => {
      const sendLink = (err, link) => {
        if (err || !link) {
          reject(AppError(`An error occured fetching a link, err: ${err}`))
        }
        resolve(link)
      }
      if (!input) {
        sendLink('No link')
      } else {
        removeVote(input.link, input.user, _ => collectionLinks.update({_id: ObjectID(input.link)}, {$inc: {votes: -1}, $set: {votedAt: new Date().toISOString()}}, sendLink))
      }
    })
  }

  return Object.assign({}, {
    searchLinks,
    visitLink,
    deleteLink,
    approveLink,
    getAllVotes,
    getLinkById,
    unfollowLink,
    followLink,
    addLink,
    getAllLinks
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
