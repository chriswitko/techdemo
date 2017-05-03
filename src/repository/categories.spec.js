/* eslint-env jest */
const should = require('should')
const expect = require('expect')
const repository = require('./index')

describe('Categories', () => {
  let repo = null

  beforeEach(() => {
    repo = Promise.resolve(repository.connect({
      collection: () => ({
        find: () => [],
        findOne: () => {}
      })
    }))
  })

  afterEach(() => {
    repo = null
  })

  it('should return an error by wrong id', done => {
    repo.then(r => {
      r.categories.getCategoryById('id').should.be.a.Promise()
      done()
    })
  })

  it('should return a one empty movie', (done) => {
    repo.then(r => {
      r.categories.getCategoryById(null).then(m => {
        expect(m).toEqual({name: 'Tech', code: 'tech', url: 'tech', enabled: true, selectable: true, keywords: ['tech', 'apple', 'phone', 'laptop']})
        done()
      }).catch(e => {
        expect(e).toEqual('Missing category')
        done()
      })
    })
  })

  it('should return an one-element array', (done) => {
    Promise.resolve(repository.connect({
      collection: () => ({
        find: () => ['element1'],
        findOne: () => {}
      })
    })).then(r => {
      r.categories.getAllCategories().should.be.a.Promise(['element1'])
      done()
    })
  })

  it('should return an empty array from getSelectableCategories', (done) => {
    Promise.resolve(repository.connect({
      collection: () => ({
        find: () => ({
          skip: () => []
        })
      })
    })).then(r => {
      r.categories.getSelectableCategories({page: 1, limit: 10}).should.containEql([])
      done()
    })
  })

  it('should return an one-element array from getSelectableCategories', (done) => {
    Promise.resolve(repository.connect({
      collection: () => ({
        find: () => ({skip: () => ['element1']})
      })
    })).then(r => {
      r.categories.getSelectableCategories({page: 1, limit: 10}).should.be.a.Promise(['element1'])
      done()
    })
  })
})
