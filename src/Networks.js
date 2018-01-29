const networks = {
  0: {
    apiName: "btc",
    unit: "satoshi",
    name: "bitcoin",
    bip44: 0,
    p2pkh: 0,
    p2sh: 5,
    familly: 1,
    xpub: 0x0488b21e,
    bitcoinjs: {
      bech32: "bc",
      bip32: {
        private: 76066276,
        public: 76067358
      },
      messagePrefix: "\x18Bitcoin Signed Message:\n",
      pubKeyHash: 0,
      scriptHash: 5,
      wif: 128
    },
    isSegwitSupported: true,
    handleFeePerByte: true
  },
  1: {
    apiName: "btc_testnet",
    unit: "satoshi",
    name: "btc testnet",
    bip44: 1,
    p2pkh: 111,
    p2sh: 196,
    familly: 1,
    xpub: 0x043587cf,
    bitcoinjs: {
      bech32: "bc",
      bip32: {
        private: 70615956,
        public: 70617039
      },
      messagePrefix: "\x18Bitcoin Signed Message:\n",
      pubKeyHash: 111,
      scriptHash: 196,
      wif: 239
    },
    isSegwitSupported: true,
    handleFeePerByte: true
  }
};

export default networks;
