#!/usr/bin/env node
'use strict'

const fetcher = require('../lib/packages')

let argv = require('yargs')
  .usage('Usage: $0 [options]')
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

const format = require('util').format
const resolve = require('path').resolve

const chalk = require('chalk')
const moment = require('moment')
const jsonfile = require('jsonfile')

const now = new Date()
const fileName = format('packages_%s.json', moment(now).format('YYYYMMDD_HHmmss'))

argv.chalk = chalk
argv.now = now

fetcher(argv)
  .then(writeFile)
  .catch(err => {
    console.error('Error fetching packages', err)
  })

function writeFile (pkgs) {
  let path = resolve(__dirname, '..', 'generated', fileName)
  jsonfile.writeFile(path, pkgs, { spaces: 2 }, err => {
    if (err) console.error('Failed to write %s', chalk.red(path), err)
    else console.log('Wrote top %s packages to %s', chalk.green(Object.keys(pkgs).length), chalk.yellow(path))
  })
}
