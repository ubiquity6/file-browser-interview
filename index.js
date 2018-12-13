const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const path = require('path');
const util = require('util');

const PORT = process.env.NODE_ENV === 'production' ? 80 : 8080;

const readDirAsync = util.promisify(fs.readdir);
const setTimeoutAsync = util.promisify(setTimeout);

async function getFilenamesAsync(dirPath) {
  const dirents = await readDirAsync(dirPath, { withFileTypes: true });
  let filePaths = dirents.filter(d => d.isFile()).map(d => path.join(dirPath, d.name));
  const directories = dirents.filter(d => d.isDirectory());
  const promises = directories.map((d) => getFilenamesAsync(path.join(dirPath, d.name)));
  const results = await Promise.all(promises);

  results.forEach((arr) => {
    filePaths = filePaths.concat(arr);
  });

  return filePaths;
}

async function getAllFilenamesAsync() {
  const basePath = path.join(path.dirname(__filename), '/node_modules');
  const files = await getFilenamesAsync(basePath);
  return files.map(f => path.relative(basePath, f));
}

async function main() {
  const app = express();
  const logger = morgan('dev');
  const files = await getAllFilenamesAsync();
  files.sort();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cors());
  app.use(logger);

  app.use('/node_modules', express.static('node_modules'));
  app.get('/search', async function(req, res) {
    const { randomDelay } = req.query;
    const prefix = req.query.prefix || '';
    const count = parseInt(req.query.count, 10) || 10;
    const results = files.filter(f => f.startsWith(prefix));

    if (randomDelay) {
      await setTimeoutAsync(Math.random() * 3000);
    }

    res.send({ results: results.slice(0, count) });
  });

  console.log('Server started on port', PORT);
  app.listen(PORT);
}

main();
