'use strict'

const categories = [
  {name: 'New', code: 'new', url: 'new', login: true, admin: true, enabled: true, selectable: false},
  {name: 'Upvoted', code: 'upvoted', url: 'upvoted', login: true, enabled: true, selectable: false},
  {name: 'Top', code: 'top', url: '', login: false, enabled: true, selectable: false},
  {name: 'Tech', code: 'tech', url: 'tech', enabled: true, selectable: true, keywords: ['tech', 'apple', 'phone', 'laptop']},
  {name: 'Design', code: 'design', url: 'design', enabled: true, selectable: true, keywords: ['design', 'ui', 'ux', 'mock', 'sketch']},
  {name: 'Mobile', code: 'mobile', url: 'mobile', enabled: false, selectable: true, keywords: ['mobile', 'phone', 'ios', 'android']},
  {name: 'Javascript', code: 'javascript', url: 'javascript', enabled: true, selectable: true, keywords: ['javascript', 'script', 'js']},
  {name: 'React', code: 'react', url: 'react', enabled: true, selectable: true, keywords: ['react', 'js', 'state', 'props', 'native']},
  {name: 'Angular', code: 'angular', url: 'angular', enabled: true, selectable: true, keywords: ['angular']},
  {name: 'CSS', code: 'css', url: 'css', enabled: true, selectable: true, keywords: ['css', 'style', 'stylesheet']},
  {name: 'Rails', code: 'rails', url: 'rails', enabled: true, selectable: true, keywords: ['rails', 'ruby']},
  {name: 'Swift', code: 'swift', url: 'swift', enabled: true, selectable: true, keywords: ['swift']},
  {name: 'AI', code: 'ai', url: 'ai', enabled: true, selectable: true, keywords: ['ai', 'alghorithm']},
  {name: 'Tutorials', code: 'tutorials', url: 'tutorials', enabled: true, selectable: true, keywords: ['tutorials', 'learn', 'course']},
  {name: 'Jobs', code: 'jobs', url: 'jobs', enabled: false, selectable: true, keywords: ['job', 'work']}
]

const repository = (db) => {
  const getAllCategories = (user) => {
    return new Promise((resolve, reject) => {
      if (user) {
        resolve(user.isAdmin ? categories.filter(c => c.enabled) : categories.filter(c => !c.admin && c.enabled))
      } else {
        resolve(categories.filter(c => !c.login && c.enabled))
      }
    })
  }

  const getSelectableCategories = () => {
    return new Promise((resolve, reject) => {
      resolve(categories.filter(c => c.selectable && c.enabled))
    })
  }

  const getCategoryById = (id = '') => {
    return new Promise((resolve, reject) => {
      const category = (categories.filter(c => c.url === id) || [])[0]
      if (category) {
        resolve(category)
      } else {
        reject('Missing category')
      }
    })
  }

  return Object.assign({}, {
    getCategoryById,
    getAllCategories,
    getSelectableCategories
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
