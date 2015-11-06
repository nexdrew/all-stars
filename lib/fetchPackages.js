'use strict'

const format = require('util').format

const got = require('got')
const cheerio = require('cheerio')
const isDate = require('is-date-object')

const utils = require('./utils')
const green = utils.green
const yellow = utils.yellow

const topPackagesUrl = 'https://www.npmjs.com/browse/depended?offset=%d'

const defaultOpts = {
  max: 150,
  offset: 0
}

module.exports = fetchPackages

// returns a Promise that resolves to fetched packages
function fetchPackages (opts) {
  return fetch({}, normalizeOpts(opts))
}

fetchPackages.defaultMax = defaultOpts.max
fetchPackages.defaultOffset = defaultOpts.offset

fetchPackages.validateOpts = function (opts) {
  let msg = ''
  let offset = absInt(opts.offset)
  if (!absInt(opts.max)) msg += '\'max\' must be a non-zero integer'
  if (!offset && offset !== 0) msg += '\n\'offset\' must be an integer'
  if (msg) throw new Error(msg)
}

function normalizeOpts (opts) {
  if (opts) {
    opts.max = absIntSafe(opts.max, defaultOpts.max)
    opts.offset = absIntSafe(opts.offset, defaultOpts.offset)
    opts.debug = !!opts.debug
  } else {
    opts = defaultOpts
  }
  if (!isDate(opts.now)) opts.now = new Date()
  opts.asOf = opts.now.toISOString()
  return opts
}

function absInt (val) {
  return Math.abs(parseInt(val, 10))
}

function absIntSafe (val, dfault) {
  return absInt(val) || dfault
}

function fetch (pkgs, opts) {
  let count = 0
  let url = format(topPackagesUrl, opts.offset)
  if (opts.debug) console.log('Fetching top packages from %s', yellow(url, opts))

  try {
    return got(url).then(response => {
      if (!(response && response.body)) {
        if (opts.debug) console.log('No response body received for %s', yellow(url, opts))
        return pkgs
      }

      let $ = cheerio.load(response.body)
      let items = $('a.name')
      if (opts.debug) console.log('Fetched %s packages from %s', green(items.length, opts), yellow(url, opts))

      let itemKeys = Object.keys(items)
      for (let i of itemKeys) {
        let name = extractName(items, i)
        if (!name) continue
        let index = (++count) + opts.offset
        if (index <= opts.max) addPackage(pkgs, name, index, opts)
        if (index === opts.max) {
          return pkgs
        } else if (index < opts.max && count === items.length) {
          opts.offset += count
          return fetch(pkgs, opts)
        }
      }
    })
  } catch (error) {
    return Promise.reject(error)
  }
}

function extractName (items, i) {
  return items[i] && items[i].children && items[i].children[0] && items[i].children[0].data ? items[i].children[0].data : null
}

function addPackage (pkgs, name, index, opts) {
  pkgs[name] = {
    rank: index,
    asOf: opts.asOf
  }
  if (opts.debug) console.log('package %s: %s', green(index, opts), yellow(name, opts))
}
