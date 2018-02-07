"use strict";
import Dongle from "./libs/Dongle";
import Networks from "./Networks";
import bitcoin from "bitcoinjs-lib";
import bs58 from "bs58";
import padStart from "lodash/padStart";
import Errors from "./libs/Errors";

function parseHexString(str) {
  var result = [];
  while (str.length >= 2) {
    result.push(parseInt(str.substring(0, 2), 16));
    str = str.substring(2, str.length);
  }
  return result;
}

const toPrefixBuffer = network => {
  network.messagePrefix = Buffer.concat([
    Buffer.from([network.messagePrefix.length + 1]),
    Buffer.from(network.messagePrefix + "\n", "hex")
  ]);
  return network;
};

function compressPublicKey(publicKey) {
  var compressedKeyIndex;
  if (publicKey.substring(0, 2) !== "04") {
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
  xpub = xpub + padStart(depth.toString(16), 2, "0");
  xpub = xpub + padStart(fingerprint.toString(16), 8, "0");
  xpub = xpub + padStart(childnum.toString(16), 8, "0");
  xpub = xpub + chaincode;
  xpub = xpub + publicKey;
  return xpub;
}

var initialize = async (network, coin, account, segwit) => {
  var purpose = segwit ? "49'/" : "44'/";
  var prevPath = purpose + coin + "'";
  const finalize = async fingerprint => {
    var path = prevPath + "/" + account + "'";
    let nodeData = await Dongle.btc.getWalletPublicKey_async(path);
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
      Networks[network].xpub
    );
    return encodeBase58Check(xpub);
  };
  let nodeData = await Dongle.btc.getWalletPublicKey_async(prevPath);
  var publicKey = compressPublicKey(nodeData.publicKey);
  publicKey = parseHexString(publicKey);
  var result = bitcoin.crypto.sha256(publicKey);
  var result = bitcoin.crypto.ripemd160(result);
  var fingerprint =
    ((result[0] << 24) | (result[1] << 16) | (result[2] << 8) | result[3]) >>>
    0;
  return finalize(fingerprint);
};

export var findPath = async (params, onUpdate, onDone, onError) => {
  if (typeof Worker !== "undefined") {
    var derivationWorker = new Worker("./workers/DerivationWorker.js");
  } else {
    onError("You need to use Google Chrome");
  }
  try {
    await Dongle.init();
    let xpub58 = await initialize(
      parseInt(params.coin),
      parseInt(params.coinPath, 10),
      parseInt(params.account, 10),
      params.segwit
    );
    console.log("success initialized", xpub58);
    params.xpub58 = xpub58;
    params.network = toPrefixBuffer(Networks[params.coin].bitcoinjs);
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
      derivationWorker.terminate();
    };
    derivationWorker.postMessage(params);
    return () => {
      derivationWorker.terminate();
    };
  } catch (e) {
    throw Errors.u2f;
  }
};

export var findAddress = async (path, segwit, coin) => {
  try {
    var comm = await Dongle.init();
  } catch (e) {
    console.log("init fail", e);
    throw e;
  }
  try {
    await Dongle.setCoinVersion(comm, Networks[coin]);
  } catch (e) {
    console.log("error setcoin", e);
    throw e;
  }
  const xpub58 = await initialize(
    coin,
    path.split("/")[1].replace("'", ""),
    path.split("/")[2].replace("'", ""),
    segwit
  );
  var script = segwit
    ? Networks[coin].bitcoinjs.scriptHash
    : Networks[coin].bitcoinjs.pubKeyHash;
  var hdnode = bitcoin.HDNode.fromBase58(
    xpub58,
    toPrefixBuffer(Networks[coin].bitcoinjs)
  );
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
      return pubKeyToSegwitAddress(hdnode.getPublicKeyBuffer(), script, segwit);
    }
  };
  try {
    return await getPublicAddress(hdnode, path, script, segwit);
  } catch (e) {
    throw e;
  }
};
