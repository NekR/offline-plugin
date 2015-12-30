export default function pathToBase(path, fillEmpty) {
  const size = path.replace(/^\//, '').split('/').length;
  const level = new Array(size).join('../') || (fillEmpty ? './' : '');

  return level;
}