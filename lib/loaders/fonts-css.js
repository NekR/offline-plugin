const R_FONT_FACE = /\@font-face\s*\{([\s\S]*?)\}/g;
const R_CSS_PAIR = /\s*([a-zA-Z\-]+)\s*:\s*([\s\S]+?)\s*(?:;|$)/g;
const R_URL_SRC = /^\s*url\(([\s\S]*?)\)(?:\s+format\(([\s\S]*?)\))?\s*$/;

module.exports = function fontsCssLoader(response) {
  return response.text().then(text => {
    const fonts = parseStylesheet(text);
    const urls = extractFontURLs(fonts);

    return urls;
  });
};

function parseStylesheet(content) {
  const fonts = [];
  let face;

  if (!content) {
    return fonts;
  }

  while (face = R_FONT_FACE.exec(content)) {
    const font = {};
    const faceData = face[1].trim();
    let pair;

    while (pair = R_CSS_PAIR.exec(faceData)) {
      const prop = pair[1].replace('font-', '');
      const val = pair[2];

      if (prop === 'unicode-range') {
        font.unicodeRange = val;
      } else if (prop === 'feature-settings') {
        font.featureSettings = val;
      } else {
        font[prop] = prop === 'family' ? val.replace(/'|"/g, '') : val;
      }
    }

    fonts.push(font);
  }

  return fonts;
}

function extractFontURLs(fonts) {
  const urls = [];

  if (!fonts.length) {
    return urls;
  }

  fonts.forEach(font => {
    const sources = parseSources(font);
    if (!sources) return;

    sources.url.forEach(source => {
      source = parseUrlSource(source);

      if (source[0]) {
        urls.push(source[0]);
      }
    });
  });

  return urls;
}

function parseSources(font) {
  if (!font || !font.src) {
    return;
  }

  const sources = font.src.trim().split(/\s*,\s*/);

  const localSources = [];
  const urlSources = [];

  for (let i = 0, len = sources.length; i < len; i++) {
    const source = sources[i];

    if (source.indexOf('local') === 0) {
      localSources.push(source);
    } else {
      urlSources.push(source);
    }
  }

  return {
    local: localSources,
    url: urlSources
  };
}

function parseUrlSource(source) {
  const match = source && source.match(R_URL_SRC);

  if (!match) {
    return [];
  }

  return [match[1] && match[1].replace(/'|"/g, ''), match[2] && match[2].replace(/'|"/g, '')];
}