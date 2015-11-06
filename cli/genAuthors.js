#!/usr/bin/env node
'use strict'

const path = require('path')
const format = require('util').format
const existsSync = require('exists-sync')
const glob = require('glob')
const chalk = require('chalk')
const moment = require('moment')
const now = new Date()
const outputFile = path.relative('', path.resolve(__dirname, '..', 'generated', format('authors_%s.json', moment(now).format('YYYYMMDD_HHmmss'))))

function findLatestPkgsFile () {
  // first check latest file in generated dir
  let files = glob.sync(path.resolve(__dirname, '..', 'generated') + path.sep + 'packages_*.json')
  if (files.length) return path.relative('', files.pop())
  // otherwise fallback to source packages.json
  return path.relative('', path.resolve(__dirname, '..', 'packages.json'))
}

function validateArgs (args) {
  if (args.input && !existsSync(args.input)) throw new Error(format('File %s does not exist', chalk.red(args.input)))
  return true
}

let argv = require('yargs')
  .usage('Fetch author info for specific packages and generate json data file\n\nUsage: $0 [options]')
  .option('i', {
    alias: 'input',
    describe: 'A json data file of packages for which to fetch author info. Disable with --no-input.',
    default: findLatestPkgsFile()
  })
  .option('o', {
    alias: 'output',
    describe: 'The file name to write author json data to. Use --no-output to write data to stdout instead.',
    default: outputFile
  })
  .option('p', {
    alias: 'pkg',
    describe: 'Specify one or more packages for which to fetch author info. Additive to --input.',
    type: 'array'
  })
  .option('t', {
    alias: 'token',
    describe: 'The GitHub API token to use. Only necessary to avoid throttling. Alternatively set GITHUB_TOKEN env var.',
    type: 'string'
  })
  .option('n', {
    alias: 'noalias',
    describe: 'Run without loading aliases.json',
    type: 'boolean'
  })
  .option('d', {
    alias: 'debug',
    describe: 'Print debug statements',
    type: 'boolean'
  })
  .help('h').alias('h', 'help')
  .epilog('For more information on GitHub API tokens and throttling:\n' +
          'https://help.github.com/articles/creating-an-access-token-for-command-line-use/\n' +
          'https://developer.github.com/v3/#rate-limiting')
  .check(validateArgs)
  .argv

const jsonfile = require('jsonfile')

const fetcher = require('../lib/fetchAuthors')

let pkgs = []
if (argv.input) {
  let pkgsFromFile = jsonfile.readFileSync(argv.input)
  pkgs = pkgs.concat(Array.isArray(pkgsFromFile) ? pkgsFromFile : Object.keys(pkgsFromFile))
}
if (argv.pkg) {
  pkgs = pkgs.concat(argv.pkg)
}

let opts = {}
let aliasesFile = path.resolve(__dirname, '..', 'aliases.json')
if (!argv.noalias && existsSync(aliasesFile)) opts.aliases = jsonfile.readFileSync(aliasesFile)
opts.debug = argv.debug
opts.chalk = require('chalk')
if (argv.token) opts.githubToken = argv.token

console.log('Fetching authors for %s packages', chalk.green(pkgs.length))

fetcher(pkgs, opts)
  .then(writeFile)
  .catch(err => {
    console.error('Error fetching authors', err)
  })

function writeFile (authors) {
  if (!argv.output) {
    console.dir(authors)
    return
  }
  jsonfile.writeFile(path.resolve(argv.output), authors, { spaces: 2 }, err => {
    if (err) console.error('Failed to write %s', chalk.red(argv.output), err)
    else console.log('Wrote %s authors to %s', chalk.green(Object.keys(authors).length), chalk.yellow(argv.output))
  })
}
