import Transport from "@ledgerhq/hw-transport-u2f";
import AppBtc from "@ledgerhq/hw-app-btc";
import Networks from "./Networks";
import bitcoinjs from "bitcoinjs-lib";
import zcash from "bitcoinjs-lib-zcash";
import bs58 from "bs58";
import padStart from "lodash/padStart";
import Errors from "./Errors";

let bitcoin = bitcoinjs;

function parseHexString(str) {
  var result = [];
  while (str.length >= 2) {
    result.push(parseInt(str.substring(0, 2), 16));
    str = str.substring(2, str.length);
  }
  return result;
}

export const toPrefixBuffer = network => {
  return {
    ...network,
    messagePrefix: Buffer.concat([
      Buffer.from([network.messagePrefix.length + 1]),
      Buffer.from(network.messagePrefix + "\n", "utf8")
    ]).toString("hex")
  };
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

export var initialize = async (network, purpose, coin, account, segwit) => {
  const devices = await Transport.list();
  if (devices.length === 0) throw "no device";
  const transport = await Transport.open(devices[0]);
  transport.setExchangeTimeout(2000);
  transport.setDebugMode(true);
  const btc = new AppBtc(transport);
  var prevPath = purpose + "/" + coin;
  const finalize = async fingerprint => {
    var path = prevPath + "/" + account;
    let nodeData = await btc.getWalletPublicKey(path, undefined, segwit);
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
      Networks[network].bitcoinjs.bip32.public
    );
    return encodeBase58Check(xpub);
  };
  let nodeData = await btc.getWalletPublicKey(prevPath, undefined, segwit);
  var publicKey = compressPublicKey(nodeData.publicKey);
  publicKey = parseHexString(publicKey);
  var result = bitcoin.crypto.sha256(publicKey);
  result = bitcoin.crypto.ripemd160(result);
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
  if (!params.useXpub) {
    try {
      let xpub58 = await initialize(
        parseInt(params.coin, 10),
        params.segwit ? "49'" : "44'",
        parseInt(params.coinPath, 10) + "'",
        parseInt(params.account, 10) + "'",
        params.segwit
      );
      params.xpub58 = xpub58;
      console.log("success initialized", xpub58);
    } catch (e) {
      throw Errors.u2f;
    }
  }
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
};

export var findAddress = async (path, segwit, coin, xpub58) => {
  if (parseInt(coin, 10) === 133 || parseInt(coin, 10) === 121) {
    bitcoin = zcash;
  } else {
    bitcoin = bitcoinjs;
  }
  if (!xpub58) {
    xpub58 = await initialize(
      coin,
      path.split("/")[0],
      path.split("/")[1],
      path.split("/")[2],
      segwit
    );
  }
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
