'use strict'

// note that index_authors.json is created from scripts/prepublish.js
var indexJson = require('./index_authors.json')
var authorsJson = require('./authors.json')

var memoized = {}

module.exports = allStars

// main API for querying
function allStars (query) {
  if (typeof query === 'string') return lookupString(query)
  else if (Array.isArray(query)) return lookupArray(query)
  else if (typeof query === 'object') return lookupObject(query)
  return null
}

function lookupArray (query) {
  for (var i = 0, result; i < query.length; i++) {
    result = allStars(query[i])
    if (result) return result
  }
  return null
}

function lookupObject (query) {
  var keys = Object.keys(query)
  for (var i = 0, result; i < keys.length; i++) {
    result = allStars(query[keys[i]])
    if (result) return result
  }
  return null
}

function lookupString (query) {
  var author = indexJson[query.trim().toLowerCase()]
  return author ? memoize(author) : null
}

function memoize (author) {
  if (!memoized[author]) memoized[author] = new AllStar(author)
  return memoized[author]
}

// "class" used as functional wrapper around an individual author's data
allStars.AllStar = AllStar

function AllStar (author) {
  var self = this

  /** The identifying key of this AllStar, typically the preferred npm username */
  self.id = author

  ;['npmUsers', 'emails', 'names', 'githubUsers', 'twitters'].forEach(function (fieldName) {
    // define array property, as plural fieldName
    Object.defineProperty(self, fieldName, arrayGetter(fieldName))
    // define property for first value of array, as singular fieldName
    Object.defineProperty(self, fieldName.substring(0, fieldName.length - 1), firstValueGetter(fieldName))
  })

  function arrayGetter (fieldName) {
    return {
      get: function () {
        return authorsField(fieldName)
      },
      enumerable: true
    }
  }

  function firstValueGetter (fieldName) {
    return {
      get: function () {
        return first(authorsField(fieldName))
      },
      enumerable: true
    }
  }

  var sub
  self.subset = function subset () {
    if (!sub) {
      sub = {
        name: self.name,
        email: self.email,
        npm: self.npmUser,
        github: self.githubUser,
        twitter: self.twitter
      }
    }
    return sub
  }

  /** Return name and email, with optional usernames */
  self.summary = function summary (all) {
    var summary = self.name || self.id
    summary = append(summary, ' ', '<', self.email, '>')
    if (!all) return summary
    var rest = append('', '', 'npm: ', self.npmUser)
    rest = append(rest, ', ', 'GitHub: ', self.githubUser)
    rest = append(rest, ', ', 'Twitter: ', self.twitter)
    return append(summary, ' ', '(', rest, ')')
  }

  /** Return full summary */
  self.toString = function toString () {
    return self.summary(true)
  }

  function authorsField (field) {
    return authorsJson[self.id][field]
  }

  function first (array) {
    return array && array.length ? array[0] : null
  }

  function append (full, delim, pre, val, suf) {
    if (!val) return full
    val = suf ? pre + val + suf : pre + val
    return full ? full + delim + val : val
  }
}

// API access to underlying data, allowing modification if desired
allStars.index = indexJson

allStars.authors = authorsJson

Object.defineProperty(allStars, 'packages', {
  get: function () {
    return require('./packages.json')
  },
  enumerable: true
})
