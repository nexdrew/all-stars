'use strict'

const format = require('util').format

const got = require('got')
const cheerio = require('cheerio')
const ghUser = require('gh-user')

const utils = require('./utils')
const green = utils.green
const yellow = utils.yellow
const red = utils.red
const stringInArray = utils.stringInArray

const packageInfoUrl = 'http://registry.npmjs.org/%s/latest'
const npmProfileUrl = 'https://www.npmjs.com/~%s'
const json = { json: true }

module.exports = authors

function authors (forPackages, opts) {
  opts = normalizeOpts(opts)
  return fetchRegistry(forPackages, {}, opts)
    .then(persons => {
      return reduceDuplicates(persons, opts)
    })
    .then(persons => {
      return fetchProfiles(persons, opts)
    })
    .then(persons => {
      return fetchGithub(persons, opts)
    })
}

function normalizeOpts (opts) {
  return opts
}

function fetchRegistry (pkgs, persons, opts) {
  if (!pkgs) return Promise.resolve(persons)
  try {
    let promises = []
    let pkgKeys = Array.isArray(pkgs) ? pkgs : Object.keys(pkgs)
    for (let pkgName of pkgKeys) {
      promises.push(getPkgInfo(pkgName, persons, opts))
    }
    return Promise.all(promises).then(ignore => {
      return persons
    })
  } catch (err) {
    return Promise.reject(err)
  }
}

function getPkgInfo (pkgName, persons, opts) {
  let url = format(packageInfoUrl, pkgName)
  if (opts.debug) console.log('Fetching package info at %s', yellow(url, opts))
  return got(url, json)
    .then(response => {
      if (!(response && response.body)) {
        if (opts.debug) console.log('No response body for %s', red(url, opts))
        return false
      }
      if (opts.debug) console.log('Processing package info for %s', green(pkgName, opts))
      addMaintainers(persons, response.body.maintainers, opts)
      return true
    })
    .catch(err => {
      console.error('Failure fetching %s', url, err)
      return false
    })
}

function addMaintainers (persons, maintainers, opts) {
  if (!maintainers) return
  for (let m of maintainers) {
    let npmUser = m.name
    if (!npmUser) continue
    // let npmEmail = String(m.email).toLowerCase()
    addElementIfUnique(persons, npmUser, npmUser, 'emails', m.email, opts)
  }
}

function addElementIfUnique (persons, user, npmUser, field, value, opts) {
  if (!persons[user]) {
    persons[user] = { npmUsers: [ npmUser ] }
    persons[user][field] = [ value ]
  } else if (!persons[user][field]) {
    persons[user][field] = [ value ]
  } else if (!stringInArray(value, persons[user][field])) {
    persons[user][field].push(value)
  }
}

function reduceDuplicates (persons, opts) {
  persons = persons || {}

  // check for and squash npm aliases
  if(opts.aliases && opts.aliases.npm) {
    for (let user of Object.keys(opts.aliases.npm)) {
      for (let alias of opts.aliases.npm[user]) {
        squashAlias(persons, alias, user, opts)
      }
    }
  }

  // go ahead and add any github aliases
  if(opts.aliases && opts.aliases.github) {
    for (let user of Object.keys(opts.aliases.github)) {
      for (let alias of opts.aliases.github[user]) {
        addElementIfUnique(persons, user, user, 'githubUsers', alias, opts)
      }
    }
  }

  // check for "unknown" duplicates via same email
  let allEmails = new Map()
  let duplicateEmails = new Map()
  for (let npmUser of Object.keys(persons)) {
    if (!persons[npmUser].emails) continue
    for (let npmEmail of persons[npmUser].emails) {
      if (allEmails.has(npmEmail)) {
        if (!duplicateEmails.has(npmEmail)) duplicateEmails.set(npmEmail, [ allEmails.get(npmEmail) ])
        duplicateEmails.get(npmEmail).push(npmUser)
      } else {
        allEmails.set(npmEmail, npmUser)
      }
    }
  }

  // squash any "unknown" duplicates
  if (duplicateEmails.size) {
    if (opts.debug) console.log('Found %d duplicate emails across npm users', duplicateEmails.size)
    duplicateEmails.forEach((npmUsers, npmEmail) => {
      let preferredUser
      let squashUsers = new Set()
      for (let npmUser of npmUsers) {
        if (!preferredUser) preferredUser = npmUser
        else squashUsers.add(npmUser)
      }
      for (let squashUser of squashUsers) {
        squashAlias(persons, squashUser, preferredUser, opts)
      }
    })
  }

  return Promise.resolve(persons)
}

function squashAlias (persons, alias, user, opts) {
  if (!persons[alias]) return
  if (!persons[user]) {
    persons[user] = persons[alias]
    persons[user].npmUsers.push(user)
  } else {
    persons[user].npmUsers.push(alias)
    if (persons[alias].emails) {
      if (!persons[user].emails) persons[user].emails = persons[alias].emails
      else {
        for (let npmEmail of persons[alias].emails) {
          if (!stringInArray(npmEmail, persons[user].emails)) persons[user].emails.push(npmEmail)
        }
      }
    }
  }
  delete persons[alias]
  if (opts.debug) console.log('Merged %s alias into %s', red(alias, opts), green(user, opts))
}

function fetchProfiles (persons, opts) {
  if (!persons) return Promise.resolve(persons)

  try {
    let promises = []
    for (let user of Object.keys(persons)) {
      if (!persons[user].npmUsers) continue
      for (let npmUser of persons[user].npmUsers) {
        promises.push(getNpmProfile(persons, user, npmUser, opts))
      }
    }
    return Promise.all(promises).then(ignore => {
      return persons
    })
  } catch (err) {
    return Promise.reject(err)
  }
}

function getNpmProfile (persons, user, npmUser, opts) {
  let url = format(npmProfileUrl, npmUser)
  if (opts.debug) console.log('Fetching npm profile at %s', yellow(url, opts))
  return got(url)
    .then(response => {
      if (!(response && response.body)) {
        if (opts.debug) console.log('No response body for %s', red(url, opts))
        return false
      }
      if (opts.debug) console.log('Processing npm profile for %s', green(npmUser, opts))
      let $ = cheerio.load(response.body)

      // look for fullname first
      let items = $('h2.fullname')
      if (items) {
        for (let i of Object.keys(items)) {
          let fullname = extractText(items, i)
          if (fullname) addElementIfUnique(persons, user, npmUser, 'names', fullname, opts)
        }
      }

      // look for github user next
      items = $('li.github')
      if (items) {
        for (let i of Object.keys(items)) {
          let githubUser = extractNestedAnchorText(items, i, 1)
          if (githubUser) addElementIfUnique(persons, user, npmUser, 'githubUsers', githubUser, opts)
        }
      }

      // double check email
      // items = $('li.email')
      // if (items) {
      //   for (let i of Object.keys(items)) {
      //     let email = extractNestedAnchorText(items, i, 0)
      //     if (email) addElementIfUnique(persons, user, npmUser, 'emails', String(email).toLowerCase(), opts)
      //   }
      // }

      // twitter, cuz why not
      items = $('li.twitter')
      if (items) {
        for (let i of Object.keys(items)) {
          let twitter = extractNestedAnchorText(items, i, 1)
          if (twitter) addElementIfUnique(persons, user, npmUser, 'twitters', twitter, opts)
        }
      }

      return true
    })
    .catch(err => {
      console.error('Failure fetching npm profile %s', red(url, opts), err)
      return false
    })
}

function extractText (items, i) {
  return items[i] && items[i].children && items[i].children[0] && items[i].children[0].data ? items[i].children[0].data : null
}

function extractNestedAnchorText (items, i, fromIndex) {
  return items[i] &&
    items[i].children &&
    items[i].children[0] &&
    items[i].children[0].next &&
    items[i].children[0].next.children &&
    items[i].children[0].next.children[0] &&
    items[i].children[0].next.children[0].data ?
    String(items[i].children[0].next.children[0].data).substring(fromIndex) :
    null
}

function fetchGithub (persons, opts) {
  if (!persons) return Promise.resolve(persons)

  try {
    let promises = []
    for (let user of Object.keys(persons)) {
      if (persons[user].githubUsers) {
        for (let githubUser of persons[user].githubUsers) {
          promises.push(getGithub(persons, user, user, githubUser, false, opts))
        }
      }
      if (persons[user].npmUsers) {
        for (let npmUser of persons[user].npmUsers) {
          if (!stringInArray(npmUser, persons[user].githubUsers)) promises.push(getGithub(persons, user, npmUser, npmUser, true, opts))
        }
      }
    }
    return Promise.all(promises).then(ignore => {
      return persons
    })
  } catch (err) {
    return Promise.reject(err)
  }
}

function getGithub (persons, user, npmUser, githubUser, validate, opts) {
  if (opts.debug) console.log('Fetching github user %s', yellow(githubUser, opts), (validate ? '(EXPERIMENTAL)' : ''))
  return ghUser(githubUser, opts.githubToken)
    .then(ghuser => {
      if (!ghuser) {
        if (opts.debug) console.log('No github user %s', red(githubUser, opts))
        return false
      }
      if (opts.debug) console.log('Processing github user %s', green(githubUser, opts), (validate ? '(EXPERIMENTAL)' : ''))
      if (validate) {
        // ignore github orgs in "experimental" mode
        if (ghuser.type !== 'User') {
          if (opts.debug) console.log('Github account %s is NOT a user', red(githubUser, opts))
          return false
        }
        // can only use ghuser if email or name is same
        let addGithubUser = false
        if (ghuser.email && stringInArray(ghuser.email, persons[user].emails)) {
          addGithubUser = true
          if (ghuser.name) addElementIfUnique(persons, user, npmUser, 'names', ghuser.name, opts)
        }
        if (ghuser.name && stringInArray(ghuser.name, persons[user].names)) {
          addGithubUser = true
          if (ghuser.email) addElementIfUnique(persons, user, npmUser, 'emails', String(ghuser.email).toLowerCase(), opts)
        }
        if (addGithubUser) addElementIfUnique(persons, user, npmUser, 'githubUsers', githubUser, opts)
      } else {
        if (ghuser.name) addElementIfUnique(persons, user, npmUser, 'names', ghuser.name, opts)
        if (ghuser.email) addElementIfUnique(persons, user, npmUser, 'emails', String(ghuser.email).toLowerCase(), opts)
      }
      return true
    })
    .catch(err => {
      console.error('Failure fetching github user %s', red(githubUser, opts), err.message)
      return false
    })
}
