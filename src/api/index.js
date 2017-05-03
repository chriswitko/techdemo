'use strict'

const passport = require('passport')
const sm = require('sitemap')

const idx = (p, o) => p.reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, o)

const hostname = (req, options) => (req.hostname === 'localhost' ? 'http' : 'https') + '://' + req.hostname + (req.hostname === 'localhost' ? ':' + options.port : '')

const globalProps = {}

const authenticate = (req, res, next) => {
  if (!req.user) {
    req.session.returnTo = req.originalUrl
    return res.redirect('/?login=1')
  } else {
    req.session.returnTo = null
    return next()
  }
}

const suggestCategory = (str = '', categories) => {
  const flatMap = arr => ([].concat.apply([], arr)[0]) || {}
  return flatMap(categories.filter(c => c.keywords).filter(c => c.keywords.filter(k => str.toLowerCase().includes(k)).length))
}

module.exports = (app, options) => {
  app.all('*', function (req, res, next) {
    app.locals.hostname = hostname(req, options)
    options.repo.categories.getAllCategories(req.user).then(categories => {
      app.locals.categories = categories
      globalProps.nav = app.locals.categories
      globalProps.user = req.user
      globalProps.login = req.query.login
      globalProps.host = app.locals.hostname
      globalProps.firstVisit = req.cookies.techspeller === '1'
      globalProps.url = app.locals.hostname + req.path
      globalProps.q = req.query.q || ''
      globalProps.category = ''
      res.cookie('techspeller', '1')
      next()
    })
  })

  app.get('/search', (req, res) => {
    if (!req.query.q) {
      return res.redirect('/')
    }

    options.repo.links.searchLinks({q: req.query.q, page: req.query.page, user: req.user}).then(links => {
      res.render('search', Object.assign({}, globalProps, {
        page: req.params.page ? parseInt(req.params.page) + 1 : 2,
        links: links
      }))
    })
  })

  // app.get('/search/bulkUpdate', (req, res) => {
  //   const index = search.initIndex('links')
  //   options.repo.links.getAllLinks({}).then(links => {
  //     links.map(l => {
  //       l.objectID = l._id
  //       return l
  //     })
  //     index.addObjects(links, (err, content) => {
  //       if (err) {
  //         res.status(200).json(err)
  //       }
  //       res.status(200).json({
  //         status: 'success'
  //       })
  //     })
  //   })
  // })

  app.get('/sitemap.xml', (req, res) => {
    options.repo.links.getAllLinks({}).then(links => {
      const sitemap = sm.createSitemap({
        hostname: 'https://techspeller.com',
        cacheTime: 600000,
        urls: links.map(l => ({url: `/link/${l.slug}`}))
      })

      sitemap.toXML((err, xml) => {
        if (err) {
          return res.status(500).end()
        }
        res.header('Content-Type', 'application/xml')
        res.send(xml)
      })
    })
  })

  app.get('/clearCookie', (req, res) => {
    res.cookie('techspeller', '0')
    res.redirect('/')
  })

  app.get('/login', (req, res) => {
    req.session.returnTo = req.get('Referrer')
    res.redirect('/')
  })

  app.get('/submit', authenticate, (req, res, next) => {
    options.repo.categories.getSelectableCategories().then(categories => {
      res.render('submit', Object.assign({}, globalProps, {
        title: req.query.t,
        url: req.query.u,
        categories: categories,
        suggestCategory: suggestCategory(req.query.t, categories)
      }))
    })
  })

  app.post('/submit', authenticate, (req, res) => {
    if (!req.body.title || !req.body.url) {
      return res.redirect('/')
    }
    options.repo.links.addLink(Object.assign({}, {
      user: req.user,
      title: req.body.title,
      url: req.body.url,
      category: req.body.category
    })).then(link => {
      res.redirect('/link/' + link.slug)
    })
  })

  app.post('/delete/:link?', authenticate, (req, res) => {
    options.repo.links.deleteLink(Object.assign({}, {
      user: req.user._id,
      link: req.body.link || req.query.link
    })).then(_ => {
      res.status(200).json({status: 'success'})
    })
  })

  app.post('/follow/:link?', authenticate, (req, res) => {
    options.repo.links.followLink(Object.assign({}, {
      user: req.user._id,
      link: req.body.link || req.query.link
    })).then(_ => {
      res.status(200).json({status: 'success'})
    })
  })

  app.get('/follow/:link', authenticate, (req, res) => {
    options.repo.links.followLink(Object.assign({}, {
      user: req.user._id,
      link: req.body.link || req.query.link
    })).then(_ => {
      res.redirect('/')
    })
  })

  app.post('/approve/:link?', authenticate, (req, res) => {
    options.repo.links.approveLink(Object.assign({}, {
      user: req.user._id,
      link: req.body.link || req.query.link
    })).then(_ => {
      res.status(200).json({status: 'success'})
    })
  })

  app.get('/approve/:link', authenticate, (req, res) => {
    options.repo.links.approveLink(Object.assign({}, {
      user: req.user._id,
      link: req.body.link || req.query.link
    })).then(_ => {
      res.redirect('/')
    })
  })

  app.post('/unfollow/:link?', authenticate, (req, res) => {
    options.repo.links.unfollowLink(Object.assign({}, {
      user: req.user._id,
      link: req.body.link || req.query.link
    })).then(_ => {
      res.status(200).json({status: 'success'})
    })
  })

  app.get('/unfollow/:link', authenticate, (req, res) => {
    options.repo.links.unfollowLink(Object.assign({}, {
      user: req.user._id,
      link: req.body.link || req.query.link
    })).then(_ => {
      res.redirect('/')
    })
  })

  app.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email']}))

  app.get('/auth/facebook/return', passport.authenticate('facebook', { failureRedirect: '/' }), (req, res) => {
    if (req.session.returnTo) {
      return res.redirect(req.session.returnTo)
    }
    res.redirect('/')
  })

  app.get('/auth/twitter', passport.authenticate('twitter', {scope: ['email']}))

  app.get('/auth/twitter/return', passport.authenticate('twitter', { failureRedirect: '/' }), (req, res) => {
    if (req.session.returnTo) {
      return res.redirect(req.session.returnTo)
    }
    res.redirect('/')
  })

  app.get('/unsubscribe', authenticate, (req, res) => {
    options.repo.users.unsubscribeUserFromNewsletter(req.user).then(_ => {
      req.user.isSubscribed = false
      res.redirect('/')
    })
  })

  app.get('/subscribe', (req, res) => {
    res.redirect('/')
  })

  app.post('/subscribe', authenticate, (req, res) => {
    options.repo.users.subscribeUserToNewsletter(Object.assign({}, req.user, {email: req.body.email})).then(_ => {
      req.user.isSubscribed = true
      res.redirect('/')
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/test', (req, res, next) => {
    next(new Error('Something went wrong :-('))
  })

  app.get('/link/:slug?', (req, res, next) => {
    options.repo.links.getLinkById({slug: req.params.slug, user: idx(['_id'], req.user)}).then(link => {
      options.repo.links.getAllLinks({user: idx(['_id'], req.user), limit: 50, category: link.category, exclude: [link._id]}).then(links => {
        res.render('link', Object.assign({}, globalProps, {
          category: req.params.category || link.category,
          link: link,
          links: links
        }))
      })
    })
  })

  app.get('/go/:slug?', (req, res, next) => {
    options.repo.links.getLinkById({slug: req.params.slug, user: idx(['_id'], req.user)}).then(link => {
      options.repo.links.visitLink({link: link._id}).then(_ => {
        res.redirect(link.url)
      })
    })
  })

  app.get('/page/:page', (req, res, next) => {
    if (req.params.category === 'upvoted' && !req.user) {
      return res.redirect('/')
    }
    if (req.params.category === 'new' && (!req.user || !req.user.isAdmin)) {
      return res.redirect('/')
    }
    options.repo.links.getAllLinks({user: idx(['_id'], req.user), page: req.params.page, category: req.params.category, source: req.query.source}).then(links => {
      options.repo.categories.getCategoryById(req.params.category).then(categoryDetails => {
        res.render('home', Object.assign({}, globalProps, {
          categoryDetails: categoryDetails,
          page: req.params.page ? parseInt(req.params.page) + 1 : 2,
          links: links
        }))
      })
    })
  })

  app.get('/:category/page/:page', (req, res, next) => {
    if (req.params.category === 'upvoted' && !req.user) {
      return res.redirect('/')
    }
    if (req.params.category === 'new' && (!req.user || !req.user.isAdmin)) {
      return res.redirect('/')
    }
    options.repo.links.getAllLinks({user: idx(['_id'], req.user), page: req.params.page, category: req.params.category, source: req.query.source}).then(links => {
      options.repo.categories.getCategoryById(req.params.category).then(categoryDetails => {
        res.render('home', Object.assign({}, globalProps, {
          categoryDetails: categoryDetails,
          page: req.params.page ? parseInt(req.params.page) + 1 : 2,
          links: links
        }))
      })
    })
  })

  app.get('/:category?', (req, res, next) => {
    if (req.params.category === 'upvoted' && !req.user) {
      return res.redirect('/')
    }
    if (req.params.category === 'new' && (!req.user || !req.user.isAdmin)) {
      return res.redirect('/')
    }
    options.repo.links.getAllLinks({user: idx(['_id'], req.user), page: req.query.page, category: req.params.category, source: req.query.source}).then(links => {
      options.repo.categories.getCategoryById(req.params.category).then(categoryDetails => {
        res.render('home', Object.assign({}, globalProps, {
          category: req.params.category || '',
          categoryDetails: categoryDetails,
          page: req.query.page ? parseInt(req.query.page) + 1 : 2,
          links: links
        }))
      })
    })
  })
}
