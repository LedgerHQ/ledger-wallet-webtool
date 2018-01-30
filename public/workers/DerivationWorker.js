importScripts("bitcoinjs.min.js");

var pubKeyToSegwitAddress = (pubKey, scriptVersion, segwit) => {
  var script = [0x00, 0x14].concat(Array.from(bitcoin.crypto.hash160(pubKey)));
  var hash160 = bitcoin.crypto.hash160(script);
  return bitcoin.address.toBase58Check(hash160, scriptVersion);
};

var getPublicAddress = (hdnode, path, script, segwit) => {
  hdnode = hdnode.derivePath(path);
  if (!segwit) {
    return hdnode.getAddress().toString();
  } else {
    return pubKeyToSegwitAddress(hdnode.getPublicKeyBuffer(), script, segwit);
  }
};

onmessage = function(params) {
  var hdnode = bitcoin.HDNode.fromBase58(
    params.data.xpub58,
    params.data.network
  );
  var response = [];
  var script = params.data.segwit
    ? parseInt(params.data.p2sh, 10)
    : parseInt(params.data.p2pkh, 10);
  var index = 0;
  var purpose = params.data.segwit ? "49'/" : "44'/";
  var prefix =
    purpose + params.data.coin + "'" + "/" + params.data.account + "'/";
  var nextPath = function(i) {
    if (i <= 0x7fffffff) {
      for (var j = 0; j < 2; j++) {
        var path = j + "/" + i;
        var address = getPublicAddress(
          hdnode,
          path,
          script,
          params.data.segwit
        );
        response.push({ index: i, path: prefix + path, address });
        if (address == params.data.address) {
          postMessage({ done: true, response });
          close();
        } else if (response.length > params.data.batchSize - 1) {
          postMessage({ response });
          response = [];
        }
        if (j == 1) {
          nextPath(++i);
        }
      }
    } else {
      postMessage({ failed: true, response });
    }
  };
  nextPath(params.data.index);
};
