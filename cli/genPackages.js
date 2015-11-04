#!/usr/bin/env node
'use strict'

const path = require('path')
const format = require('util').format
const moment = require('moment')
const now = new Date()
const outputFile = path.relative('', path.resolve(__dirname, '..', 'generated', format('packages_%s.json', moment(now).format('YYYYMMDD_HHmmss'))))
const fetcher = require('../lib/packages')

let argv = require('yargs')
  .usage('Fetch info for top depended packages and generate json data file\n\nUsage: $0 [options]')
  .option('m', {
    alias: 'max',
    describe: 'The max number of packages to fetch',
    default: fetcher.defaultMax,
    nargs: 1
  })
  .option('o', {
    alias: 'offset',
    describe: 'The index offset fetching should start from',
    default: fetcher.defaultOffset,
    nargs: 1
  })
  .option('f', {
    alias: 'file',
    describe: 'The file name to write package json data to. Use --no-file to write data to stdout instead.',
    default: outputFile
  })
  .option('d', {
    alias: 'debug',
    describe: 'Print debug statements',
    type: 'boolean'
  })
  .help('h').alias('h', 'help')
  .check(args => {
    fetcher.validateOpts(args)
    return true
  })
  .argv

const chalk = require('chalk')
const jsonfile = require('jsonfile')

argv.chalk = chalk
argv.now = now

fetcher(argv)
  .then(writeFile)
  .catch(err => {
    console.error('Error fetching packages', err)
  })

function writeFile (pkgs) {
  if (!argv.file) {
    console.dir(pkgs)
    return
  }
  jsonfile.writeFile(path.resolve(argv.file), pkgs, { spaces: 2 }, err => {
    if (err) console.error('Failed to write %s', chalk.red(argv.file), err)
    else console.log('Wrote top %s packages to %s', chalk.green(Object.keys(pkgs).length), chalk.yellow(argv.file))
  })
}
