import Networks from "./Networks";
import bitcoin from "bitcoinjs-lib";
import bs58 from "bs58";
import padStart from "lodash/padStart";
import Transport from "@ledgerhq/hw-transport-u2f";
import AppBtc from "@ledgerhq/hw-app-btc";
import { Buffer } from "buffer";
import zip from "lodash/zip";

export var estimateTransactionSize = (
  inputsCount,
  outputsCount,
  handleSegwit
) => {
  var maxNoWitness,
    maxSize,
    maxWitness,
    minNoWitness,
    minSize,
    minWitness,
    varintLength;
  if (inputsCount < 0xfd) {
    varintLength = 1;
  } else if (inputsCount < 0xffff) {
    varintLength = 3;
  } else {
    varintLength = 5;
  }
  if (handleSegwit) {
    minNoWitness =
      varintLength + 4 + 2 + 59 * inputsCount + 1 + 31 * outputsCount + 4;
    maxNoWitness =
      varintLength + 4 + 2 + 59 * inputsCount + 1 + 33 * outputsCount + 4;
    minWitness =
      varintLength +
      4 +
      2 +
      59 * inputsCount +
      1 +
      31 * outputsCount +
      4 +
      106 * inputsCount;
    maxWitness =
      varintLength +
      4 +
      2 +
      59 * inputsCount +
      1 +
      33 * outputsCount +
      4 +
      108 * inputsCount;
    minSize = (minNoWitness * 3 + minWitness) / 4;
    maxSize = (maxNoWitness * 3 + maxWitness) / 4;
  } else {
    minSize = varintLength + 4 + 146 * inputsCount + 1 + 31 * outputsCount + 4;
    maxSize = varintLength + 4 + 148 * inputsCount + 1 + 33 * outputsCount + 4;
  }
  return {
    min: minSize,
    max: maxSize
  };
};

var addressToHash160WithNetwork = address => {
  var bytes = bs58.decode(address);
  var bytes = bytes.slice(0, bytes.length - 4);
  return Buffer.from(bytes);
};

var createVarint = value => {
  if (value < 0xfd) {
    return Buffer.from([value]);
  }
  if (value <= 0xffff) {
    return Buffer.from([0xfd, value & 0xff, (value >> 8) & 0xff]);
  }
  return Buffer.from([
    0xfe,
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff
  ]);
};

var toScriptByteString = amount => {
  var hex;
  hex = padStart(amount.toString(16), 16, "0");
  hex = hex
    .match(/../g)
    .reverse()
    .join("");
  return Buffer.from(hex, "hex");
};

var createOutputScript = function(recipientAddress, amount, coin) {
  var OP_CHECKSIG,
    OP_DUP,
    OP_EQUAL,
    OP_EQUALVERIFY,
    OP_HASH160,
    OP_RETURN,
    OpReturnScript,
    P2shScript,
    PkScript,
    outputScript;
  OP_DUP = Buffer.from([0x76]);
  OP_HASH160 = Buffer.from([0xa9]);
  OP_EQUAL = Buffer.from([0x87]);
  OP_EQUALVERIFY = Buffer.from([0x88]);
  OP_CHECKSIG = Buffer.from([0xac]);
  OP_RETURN = Buffer.from([0x6a]);
  let p2sh = false;

  /*
        Create the output script
        Count (VI) | Value (8) | PkScript (var) | ....
       */

  P2shScript = function(hash160) {
    p2sh = true;
    var script;
    script = Buffer.concat([
      OP_HASH160,
      Buffer.from([hash160.length]),
      hash160,
      OP_EQUAL
    ]);
    return Buffer.concat([createVarint(script.length), script]);
  };

  PkScript = function(address) {
    var hash160, hash160WithNetwork, p2pkhNetworkVersionSize, script;
    hash160WithNetwork = addressToHash160WithNetwork(address);
    p2pkhNetworkVersionSize = hash160WithNetwork.length - 20;
    hash160 = hash160WithNetwork.slice(p2pkhNetworkVersionSize);
    if (p2pkhNetworkVersionSize === 1) {
      if (hash160WithNetwork[0] === Networks[coin].p2sh) {
        return P2shScript(hash160);
      }
    } else {
      if (
        ((hash160WithNetwork[0] << 8) | hash160WithNetwork[1]) ===
        Networks[coin].p2sh
      ) {
        return P2shScript(hash160);
      }
    }
    script = Buffer.concat([
      OP_DUP,
      OP_HASH160,
      Buffer.from([hash160.length]),
      hash160,
      OP_EQUALVERIFY,
      OP_CHECKSIG
    ]);
    return Buffer.concat([createVarint(script.length), script]);
  };

  OpReturnScript = function(data) {
    var script;
    script = Buffer.concat([
      OP_RETURN,
      Buffer.from([data.length / 2]),
      Buffer.from(data, "hex")
    ]);
    return Buffer.concat([createVarint(script.length), script]);
  };

  var numberOfOutputs = 1;
  outputScript = Buffer.concat([
    createVarint(numberOfOutputs),
    toScriptByteString(amount),
    PkScript(recipientAddress)
  ]);

  /*if (changeAmount.gt(0)) {
    outputScript = outputScript
      .concat(changeAmount.toScriptByteString())
      .concat(PkScript(changeAddress));
  }
  if (data != null) {
    outputScript = outputScript
      .concat(ledger.Amount.fromSatoshi(0).toScriptByteString())
      .concat(OpReturnScript(data));
  }*/
  return [outputScript, p2sh];
};

export var createPaymentTransaction = async (
  recipientAddress,
  amount,
  utxos,
  path,
  coin
) => {
  amount = Math.floor(amount);
  let indexes = [];
  let apiCalls = [];
  const devices = await Transport.list();
  if (devices.length === 0) throw "no device";
  const transport = await Transport.open(devices[0]);
  const btc = new AppBtc(transport);
  Object.keys(utxos).forEach(h => {
    Object.keys(utxos[h]).forEach(i => {
      indexes.push(parseInt(i));
      var path = "/" + Networks[coin].apiName + "/transactions/" + h + "/hex";
      apiCalls.push(
        fetch(path)
          .then(res => res.json())
          .then(data =>
            btc.splitTransaction(data[0].hex, Networks[coin].isSegwitSupported)
          )
      );
    });
  });
  const txs = await Promise.all(apiCalls);
  const inputs = zip(txs, indexes);
  const [outputScript, p2sh] = createOutputScript(
    recipientAddress,
    amount,
    coin
  );
  const res = await btc.createPaymentTransactionNew(
    inputs,
    Array(indexes.length).fill(path),
    undefined,
    outputScript.toString("hex"),
    undefined,
    undefined,
    p2sh
  );
  return res;
};

export const findAddress = async path => {
  const devices = await Transport.list();
  if (devices.length === 0) throw "no device";
  const transport = await Transport.open(devices[0]);
  const btc = new AppBtc(transport);
  var pub = await btc.getWalletPublicKey(path);
  return pub.bitcoinAddress;
};
