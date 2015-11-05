'use strict'

var path = require('path')
var jsonfile = require('jsonfile')
var chalk = require('chalk')
var authors = require('../authors.json')

createIndex()

function createIndex () {
  var index = {}
  indexField(index, authors, 'npmUsers')
  indexField(index, authors, 'emails')
  indexField(index, authors, 'names')
  indexField(index, authors, 'githubUsers')
  writeIndexFile(index, path.resolve(__dirname, '..', 'index_authors.json'))
}

function indexField (index, authors, field) {
  Object.keys(authors).forEach(function (author) {
    if (authors[author][field]) {
      authors[author][field].forEach(function (fieldValue) {
        addToIndex(index, fieldValue, author)
      })
    }
  })
}

function addToIndex (index, key, author) {
  if (!index[key]) index[key] = author
  else if (author !== index[key]) console.log('prepublish: Key \'%s\' for author \'%s\' already points to author \'%s\'', chalk.yellow(key), chalk.red(author), chalk.green(index[key]))
}

function writeIndexFile (index, file) {
  jsonfile.writeFile(file, index, function (err) {
    if (err) {
      console.error('prepublish: Failed to write index file at: %s', chalk.red(file), err.message)
      throw err
    }
    console.log('prepublish: Successfully wrote index file at: %s', chalk.green(file))
  })
}
