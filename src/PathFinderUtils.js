import Dongle from "./libs/Dongle";
import Networks from "./Networks";
import bitcoin from "bitcoinjs-lib";
import bs58 from "bs58";
import _ from "lodash";

function parseHexString(str) {
  var result = [];
  while (str.length >= 2) {
    result.push(parseInt(str.substring(0, 2), 16));
    str = str.substring(2, str.length);
  }
  return result;
}

function compressPublicKey(publicKey) {
  var compressedKeyIndex;
  var compressedKey;
  if (publicKey.substring(0, 2) != "04") {
    throw "Invalid public key format";
  }
  if (parseInt(publicKey.substring(128, 130), 16) % 2 !== 0) {
    compressedKeyIndex = "03";
  } else {
    compressedKeyIndex = "02";
  }
  var result = compressedKeyIndex + publicKey.substring(2, 66);
  return result;
}

function toHexDigit(number) {
  var digits = "0123456789abcdef";
  return digits.charAt(number >> 4) + digits.charAt(number & 0x0f);
}

function toHexInt(number) {
  return (
    toHexDigit((number >> 24) & 0xff) +
    toHexDigit((number >> 16) & 0xff) +
    toHexDigit((number >> 8) & 0xff) +
    toHexDigit(number & 0xff)
  );
}

function hexToBin(src) {
  var result = "";
  var digits = "0123456789ABCDEF";
  if (src.length % 2 != 0) {
    throw "Invalid string";
  }
  src = src.toUpperCase();
  for (var i = 0; i < src.length; i += 2) {
    var x1 = digits.indexOf(src.charAt(i));
    if (x1 < 0) {
      return "";
    }
    var x2 = digits.indexOf(src.charAt(i + 1));
    if (x2 < 0) {
      return "";
    }
    result += String.fromCharCode((x1 << 4) + x2);
  }
  return result;
}

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}

function readHexDigit(data, offset) {
  var digits = "0123456789ABCDEF";
  if (typeof offset == "undefined") {
    offset = 0;
  }
  return (
    (digits.indexOf(data.substring(offset, offset + 1).toUpperCase()) << 4) +
    digits.indexOf(data.substring(offset + 1, offset + 2).toUpperCase())
  );
}

function encodeBase58Check(vchIn) {
  vchIn = parseHexString(vchIn);
  var chksum = bitcoin.crypto.sha256(vchIn);
  chksum = bitcoin.crypto.sha256(chksum);
  chksum = chksum.slice(0, 4);
  var hash = vchIn.concat(Array.from(chksum));
  return bs58.encode(hash);
}

function createXPUB(
  depth,
  fingerprint,
  childnum,
  chaincode,
  publicKey,
  network
) {
  var xpub = toHexInt(network);
  xpub = xpub + _.padStart(depth.toString(16), 2, "0");
  xpub = xpub + _.padStart(fingerprint.toString(16), 8, "0");
  xpub = xpub + _.padStart(childnum.toString(16), 8, "0");
  xpub = xpub + chaincode;
  xpub = xpub + publicKey;
  return xpub;
}

var initialize = function(coin, account, segwit) {
  var purpose = segwit ? "49'/" : "44'/";
  var prevPath = purpose + coin + "'";
  return new Promise((resolve, reject) => {
    function finalize(fingerprint) {
      return new Promise((resolve, reject) => {
        var path = prevPath + "/" + account + "'";
        Dongle.btc.getWalletPublicKey_async(path).then((nodeData, error) => {
          var publicKey = compressPublicKey(nodeData.publicKey);
          //console.log("puikeyu", publicKey);
          var childnum = (0x80000000 | account) >>> 0;
          //console.log("childnum", childnum);
          var xpub = createXPUB(
            3,
            fingerprint,
            childnum,
            nodeData.chainCode,
            publicKey,
            Networks[coin].xpub
          );
          var xpub58 = encodeBase58Check(xpub);
          resolve(xpub58);
        });
      });
    }
    Dongle.btc.getWalletPublicKey_async(prevPath).then((nodeData, error) => {
      var publicKey = compressPublicKey(nodeData.publicKey);
      publicKey = parseHexString(publicKey);
      var result = bitcoin.crypto.sha256(publicKey);
      var result = bitcoin.crypto.ripemd160(result);
      var fingerprint =
        ((result[0] << 24) |
          (result[1] << 16) |
          (result[2] << 8) |
          result[3]) >>>
        0;
      resolve(finalize(fingerprint));
    });
  });
};

export var findPath = (params, onUpdate, onDone, onError) => {
  if (typeof Worker !== "undefined") {
    var derivationWorker = new Worker("./workers/DerivationWorker.js");
  } else {
    onError("You need to use Google Chrome");
  }
  var running = true;
  var hdnode = {};

  Dongle.init()
    .then(comm => {
      return Dongle.setCoinVersion(
        comm,
        Networks[parseInt(params.coin, 10)]
      ).then(res => {
        console.log("success set coin");
        initialize(
          parseInt(params.coin, 10),
          parseInt(params.account, 10),
          params.segwit
        ).then(xpub58 => {
          console.log("success initialized", xpub58);
          params.xpub58 = xpub58;
          params.network = Networks[parseInt(params.coin, 10)].bitcoinjs;
          derivationWorker.onmessage = event => {
            onUpdate(event.data.response);
            if (event.data.done) {
              onDone();
            }
            if (event.data.failed) {
              onError("The address is not from this account");
            }
          };
          derivationWorker.onerror = error => {
            onError("Derivation error: " + error.message);
            console.log(error);
            derivationWorker.terminate();
          };
          derivationWorker.postMessage(params);
        });
      });
    })
    .catch(e => {
      onError(
        "Verify your device is unlocked and that browser support is activated"
      );
    });

  function terminate() {
    console.log("terminating");
    running = false;
    derivationWorker.terminate();
  }

  return terminate;
};

export var findAddress = async (path, segwit, coin, onError) => {
  try {
    var comm = await Dongle.init();
    await Dongle.setCoinVersion(comm, Networks[coin]);
    const xpub58 = await initialize(
      path.split("/")[1].replace("'", ""),
      path.split("/")[2].replace("'", ""),
      segwit
    );
    var script = segwit
      ? Networks[coin].bitcoinjs.scriptHash
      : Networks[coin].bitcoinjs.pubKeyHash;
    var hdnode = bitcoin.HDNode.fromBase58(xpub58, Networks[coin].bitcoinjs);
    var pubKeyToSegwitAddress = (pubKey, scriptVersion, segwit) => {
      var script = [0x00, 0x14].concat(
        Array.from(bitcoin.crypto.hash160(pubKey))
      );
      var hash160 = bitcoin.crypto.hash160(script);
      return bitcoin.address.toBase58Check(hash160, scriptVersion);
    };

    var getPublicAddress = (hdnode, path, script, segwit) => {
      hdnode = hdnode.derivePath(
        path
          .split("/")
          .splice(3, 2)
          .join("/")
      );
      if (!segwit) {
        return hdnode.getAddress().toString();
      } else {
        return pubKeyToSegwitAddress(
          hdnode.getPublicKeyBuffer(),
          script,
          segwit
        );
      }
    };
    return await getPublicAddress(hdnode, path, script, segwit);
  } catch (e) {
    onError(e);
  }
};
