import languageData from '../assets/monaco-languages-parsed.json'
import Logger from './logger'

const parseCSSVar = (cssVar, element = document.documentElement) => {
  const property = getComputedStyle(element).getPropertyValue(cssVar)

  if (!property) {
    Logger.warn(`Property ${cssVar} not found`)
    return 0
  }

  return parseInt(property.trim().replace('px', ''))
}

const setCSSVar = (key, value, element = document.documentElement) => {
  element.style.setProperty(key, value)
}

/**
 * Takes the name of a file, extracts the extension, and tries to
 * see if that file extension can be loaded my monaco. If the extension
 * isn't found, plaintext will be returned instead.
 * Ex: `main.js => .js`
 * ```
 * {
 *    "language": "javascript",
 *    "displayName": "JavaScript",
 *    "extension": ".js"
 * }
 * ```
 */
const getLanguageFromFileName = fileName => {
  if (languageData[fileName]) {
    return languageData[fileName]
  }

  let extension = ''
  fileName = fileName.trim().toLowerCase()

  // Read through the file name backwards to try to read
  // the extension of the file, stopping when we see a `.`
  for (let i = fileName.length - 1; i >= 0; i--) {
    if (fileName[i] === '.') {
      extension += '.'
      break
    }

    extension += fileName[i]
  }

  extension = extension.split('').reverse().join('')

  if (!languageData[extension]) {
    return {
      language: 'plaintext',
      displayName: 'Plain Text',
      extension
    }
  }

  return languageData[extension]
}

/**
 * Properly decodes a base64 string since some non-english
 * characters may not decode properly using atob. Note that this
 * throws an error if the string can't be decoded. In that case,
 * it may be an image, PDF, or some other file type that
 * FileRenderer might be able to display
 */
const base64DecodeUnicode = str => {
  // Going backwards: from byte stream, to percent-encoding, to original string.
  // https://stackoverflow.com/a/30106551/9124220
  return decodeURIComponent(
    atob(str)
      .split('')
      .map(chr => '%' + ('00' + chr.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

/**
 * Properly encodes a base 64 string since it may contain non UTF characters
 */
const base64EncodeUnicode = str => {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, value) => {
      return String.fromCharCode(parseInt(value, 16))
    })
  )
}

/**
 * Takes an object of class names and returns a string of only the
 * classes that have keys that evaluate to true.
 *
 * ```
 * withClasses({ foo: true, bar: false, baz: true }) // returns 'foo baz'
 * ```
 */
const withClasses = classObj => {
  const classNames = Object.keys(classObj).filter(key => classObj[key])
  return classNames.join(' ')
}

/* istanbul ignore next */
const noop = () => {}

export {
  parseCSSVar,
  setCSSVar,
  getLanguageFromFileName,
  noop,
  base64DecodeUnicode,
  base64EncodeUnicode,
  withClasses
}
