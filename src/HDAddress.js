export default class HDAddress {
  getAccountPathOnwards = fullPath => {
    const indexOfFirstSlash = fullPath.indexOf("/");
    var indexOfSecondSlash = fullPath.indexOf("/", indexOfFirstSlash+1);
    return fullPath.substr(indexOfSecondSlash+1);
  };

  getPath = (isSegwit, coinType, path) => {
    const segwitPurpose = 49;
    const nonSegWitPurpose = 44;
    return `${isSegwit? segwitPurpose : nonSegWitPurpose}'/${coinType}'/${this.getAccountPathOnwards(path)}`;
  };
};
