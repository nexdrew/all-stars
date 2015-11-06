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
  var result
  for (var i = 0; i < query.length; i++) {
    result = allStars(query[i])
    if (result) return result
  }
  return null
}

function lookupObject (query) {
  var keys = Object.keys(query)
  var result
  for (var i = 0; i < keys.length; i++) {
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

  /** Return array of all known npm usernames */
  self.npmUsers = function npmUsers () {
    return authorsField('npmUsers')
  }

  /** Return preferred (first) known npm username */
  self.npmUser = function npmUser () {
    return first(self.npmUsers())
  }

  /** Return array of all known email addresses */
  self.emails = function emails () {
    return authorsField('emails')
  }

  /** Return preferred (first) known email address */
  self.email = function email () {
    return first(self.emails())
  }

  /** Return array of all known names */
  self.names = function names () {
    return authorsField('names')
  }

  /** Return preferred (first) known name */
  self.name = function name () {
    return first(self.names())
  }

  /** Return array of all known GitHub usernames */
  self.githubUsers = function githubUsers () {
    return authorsField('githubUsers')
  }

  /** Return preferred (first) known GitHub username */
  self.githubUser = function githubUser () {
    return first(self.githubUsers())
  }

  /** Return array of all known Twitter handles */
  self.twitters = function twitters () {
    return authorsField('twitters')
  }

  /** Return preferred (first) known Twitter handle */
  self.twitter = function twitter () {
    return first(self.twitters())
  }

  /** Return name and email, with optional usernames */
  self.summary = function summary (all) {
    var summary = self.name() || self.id
    summary = append(summary, ' ', '<', self.email(), '>')
    if (!all) return summary
    var rest = append('', '', 'npm: ', self.npmUser())
    rest = append(rest, ', ', 'GitHub: ', self.githubUser())
    rest = append(rest, ', ', 'Twitter: ', self.twitter())
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
allStars.index = function index () {
  return indexJson
}

allStars.authors = function authors () {
  // return JSON.parse(JSON.stringify(authorsJson))
  return authorsJson
}

allStars.packages = function packages () {
  return require('./packages.json')
}

// Promise-based API for fetching content (node 4+ only)
// TODO conditional export might be a bad idea :)
allStars.fetchPackages = isNode4Plus() ? require('./lib/fetchPackages.js') : undefined

allStars.fetchAuthors = isNode4Plus() ? require('./lib/fetchAuthors.js') : undefined

function isNode4Plus () {
  return parseInt(process.version.charAt(1), 10) >= 4
}
