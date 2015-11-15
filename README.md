# all-stars

> All-star lineup of Node-based FOSS contributors

all-stars is meant to be a lightweight data module containing pre-fetched author
info for the maintainers of the [top depended](https://www.npmjs.com/browse/depended)
Node packages on npm.

Inspired by [credits](https://github.com/stefanjudis/credits), all-stars was
created to recognize some of the most prolific authors of Node-based FOSS, to
honor them for the awesome work they've done that benefits us all.

One of the problems of giving credit where it is due is that any individual author
may be known by several names. Sometimes authors change usernames or email
addresses. Sometimes they use their real name, sometimes not. all-stars is
designed to address this problem, combining pre-fetched, cross-referenced data
with a simple API to resolve many possible identifiers to a known author.

all-stars can resolve any of the following to a known author with a single method:

- name or alias
- email address
- npm username
- GitHub username

If an author is resolved, an object representing that author is returned, containing
the following information:

- all known names
- all known email addresses
- all known npm usernames
- all known GitHub usernames
- all known Twitter handles

Hopefully this can help normalize arbitrary string-based ids into a more usable
structure (and reduce duplicates in credits).

*Note that the data in this module was fetched from public resources that are
freely available, but it could possibly be used for ill intent. Please be
respectful and DBAD! Thanks.*

## Install

```
npm install --save all-stars
```

```js
var allStars = require('all-stars')
```

## Examples

### Resolve author by string

```js
var rvagg = allStars('Rod Vagg')
console.log(rvagg.toString())
//=> Rod Vagg <r@va.gg> (npm: rvagg, GitHub: rvagg, Twitter: rvagg)

var othiym23 = allStars('ogd@aoaioxxysz.net')
console.log(othiym23.summary())
//=> Forrest L Norvell <forrest@npmjs.com>

var substack = allStars('substack')
console.log(substack.emails())
//=> [ 'mail@substack.net', 'substack@gmail.com' ]

var jongleberry = allStars('jongleberry')
console.log(jongleberry.npmUsers())
//=> [ 'jongleberry', 'jonathanong' ]

var tj = allStars('tjholowaychuk')
console.log(tj.githubUsers())
//=> [ 'tj' ]

var bcoe = allStars('Benjamin E. Coe')
console.log(bcoe.names())
//=> [ 'Benjamin Coe', 'Ben Coe', 'Benjamin E. Coe' ]

var sindre = allStars('sindresorhus@gmail.com')
console.log(sindre.twitters())
//=> [ 'sindresorhus' ]
```

### Resolve author by array

Iterates over elements and returns first match.

```js
var indutny = allStars([ 'Fedor', 'fedor.indutny@gmail.com' ])
console.log('%s', indutny)
//=> Fedor Indutny <fedor@indutny.com> (npm: indutny, GitHub: indutny, Twitter: indutny)
```

### Resolve author by object

Iterates over object property values and returns first match.

```js
var domenic = allStars({ name: 'Domenic', email: 'd@domenic.me' })
console.log(domenic.summary())
//=> Domenic Denicola <domenic@domenicdenicola.com>
```

## API

### allStars(query)

Synchronously resolve query to an individual author, if known.

- Returns: `allStars.AllStar` object or `null`
- `query`: string|array|object, identifier(s) to resolve

### allStars.AllStar

Object returned from `allStars()` method. Contains the following:

- `email()`: function, returns first email address from emails array
- `emails()`: function, returns array of all known email addresses
- `githubUser()`: function, returns first GitHub username from array
- `githubUsers()`: function, returns array of all known GitHub usernames
- `id`: string, identifying key of this author, typically the preferred npm username
- `name()`: function, returns first name from names array
- `names()`: function, returns array of all known names
- `npmUser()`: function, return first npm username from array
- `npmUsers()`: function, returns array of all known npm usernames
- `summary([all])`: function, returns first value from each array, concatenated as string
    - `all`: boolean, `true` if you want all fields, `false` if you just want name and email
- `toString()`: function, alias for `summary(true)`
- `twitter()`: function, returns first Twitter handle from array
- `twitters()`: function, returns array of all known Twitter handles

## Data Fetching/Generation

The git repository contains CLI tools for fetching and generating the static data
that is packaged within this module. The approach was intended to be as objective
as possible, though some guidance for accurate cross-referencing or gap-filling
proved necessary. Here's the basic process:

1. Fetch top depended packages, scraped from npm's website

    Executed via `cli/genPackages.js`. Number of packages to fetch is configurable
    but defaults to 150.

    Package list is written to `generated/packages_YYYYMMDD_HHmmss.json`, which
    can be copied to `packages.json`.

2. Fetch author info for a given set of packages

    Executed via `cli/genAuthors.js`. Package list to fetch authors for is
    configurable but defaults to the most recent generated packages json file.

    Attempts to collect names, emails, and usernames from the following locations:

    1. Package maintainer info, pulled from registry.npmjs.org

    2. Curated set of aliases from this module's source code (`aliases.json`)

    3. npm user profile, scraped from npm's site

    4. GitHub user profile, using GitHub's API

    Author info is written to `generated/authors_YYYYMMDD_HHmmss.json`, which
    can be copied to `authors.json`.

    Note that this process sends many concurrent requests that can accidentally
    DoS attack the resources (particularly npm). May need to run a few different
    times until no 503s are received. To avoid throttling by GitHub's API, you
    will need to provide a Personal Access Token, which can either be specified
    via CLI or exported as `GITHUB_TOKEN` env var.

After author data has been generated and copied over to `authors.json`, a
prepublish script should be run to create an `index_authors.json` file, which
is used by the main API. This is accomplished via `npm run prepublish`.

## License

[ISC](https://opensource.org/licenses/ISC) © Andrew Goode and Contributors
