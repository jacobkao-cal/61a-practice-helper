// Shared settings for the browser tests. Override with environment variables:
//   CHROME=/path/to/chrome   APP_URL=http://localhost:8000/
const path = require('path');
const { pathToFileURL } = require('url');

const DEFAULT_CHROME = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}[process.platform];

module.exports = {
  APP_URL: process.env.APP_URL || pathToFileURL(path.join(__dirname, '..', '..', 'app', 'index.html')).href,
  CHROME: process.env.CHROME || DEFAULT_CHROME,
};
