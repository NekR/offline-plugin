export default ['fonts-css'].reduce((result, loader) => {
  const mod = require('./' + loader);
  result[loader] = mod.default || mod;
}, {});