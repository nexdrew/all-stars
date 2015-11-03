'use strict'

module.exports = {

  green (val, opts) {
    return opts.chalk ? opts.chalk.green(val) : val
  },

  yellow (val, opts) {
    return opts.chalk ? opts.chalk.yellow(val) : val
  },

  red (val, opts) {
    return opts.chalk ? opts.chalk.red(val) : val
  },

  stringInArray (value, array) {
    if (!array) return false
    value = String(value).toLowerCase()
    return [].concat(array).filter(e => {
      return String(e).toLowerCase() === value
    }).length !== 0
  }

}
