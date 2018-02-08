const networks = {
  0: {
    apiName: "btc",
    unit: "BTC",
    name: "bitcoin",
    satoshi: 8,
    xpub: 0x0488b21e,
    bitcoinjs: {
      bech32: "bc",
      bip32: {
        private: 76066276,
        public: 76067358
      },
      messagePrefix: "Bitcoin Signed Message:",
      pubKeyHash: 0,
      scriptHash: 5,
      wif: 128
    },
    isSegwitSupported: true,
    handleFeePerByte: true
  },
  1: {
    apiName: "btc_testnet",
    unit: "BTC",
    name: "btc testnet",
    satoshi: 8,
    xpub: 0x043587cf,
    bitcoinjs: {
      bech32: "bc",
      bip32: {
        private: 70615956,
        public: 70617039
      },
      messagePrefix: "Bitcoin Signed Message:",
      pubKeyHash: 111,
      scriptHash: 196,
      wif: 239
    },
    isSegwitSupported: true,
    handleFeePerByte: true
  },
  145: {
    name: "bitcoin cash",
    apiName: "abc",
    satoshi: 8,
    unit: "BCH",
    bitcoinjs: {
      bech32: "bc",
      bip32: {
        private: 76066276,
        public: 76067358
      },
      messagePrefix: "Bitcoin Signed Message:",
      pubKeyHash: 0,
      scriptHash: 5,
      wif: 128
    },
    sigHash: 0x41,
    isSegwitSupported: true,
    handleFeePerByte: true
  },
  128: {
    apiName: "vtc",
    unit: "VTC",
    satoshi: 8,
    name: "Vertcoin",
    xpub: 0x0488b21e,
    bitcoinjs: {
      bip32: {
        public: 0x0488b21e,
        private: 0x05358394
      },
      messagePrefix: "Vertcoin Signed Message:",
      pubKeyHash: 71,
      scriptHash: 5,
      wif: 128
    },
    isSegwitSupported: true,
    handleFeePerByte: false
  },

  5: {
    name: "dash",
    satoshi: 8,
    unit: "DASH",
    xpub: 50221816,
    apiName: "dash",
    bitcoinjs: {
      messagePrefix: "DarkCoin Signed Message:",
      bip32: { public: 50221816, private: 87393172 },
      pubKeyHash: 76,
      scriptHash: 16,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: undefined
  },
  6: {
    name: "peercoin",
    satoshi: 6,
    unit: "PPC",
    xpub: 3874023909,
    apiName: "ppc",
    bitcoinjs: {
      messagePrefix: "PPCoin Signed Message:",
      bip32: { public: 3874023909, private: 87393172 },
      pubKeyHash: 55,
      scriptHash: 117,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: true
  },
  14: {
    name: "viacoin",
    satoshi: 8,
    unit: "VIA",
    xpub: 76067358,
    apiName: "via",
    bitcoinjs: {
      messagePrefix: "Viacoin Signed Message:",
      bip32: { public: 76067358, private: 87393172 },
      pubKeyHash: 71,
      scriptHash: 33,
      wif: 128
    },
    isSegwitSupported: true,
    handleFeePerByte: false,
    areTransactionTimestamped: false
  },
  20: {
    name: "digibyte",
    satoshi: 8,
    unit: "DGB",
    xpub: 76067358,
    apiName: "dgb",
    bitcoinjs: {
      messagePrefix: "DigiByte Signed Message:",
      bip32: { public: 76067358, private: 87393172 },
      pubKeyHash: 30,
      scriptHash: 5,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: false
  },
  47: {
    name: "poswallet",
    satoshi: 8,
    unit: "POSW",
    xpub: 76067358,
    apiName: "posw",
    bitcoinjs: {
      messagePrefix: "PoSWallet Signed Message:",
      bip32: { public: 76067358, private: 87393172 },
      pubKeyHash: 55,
      scriptHash: 85,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: true
  },
  77: {
    name: "pivx",
    satoshi: 8,
    unit: "PIV",
    xpub: 36513075,
    apiName: "pivx",
    bitcoinjs: {
      messagePrefix: "DarkNet Signed Message:",
      bip32: { public: 36513075, private: 87393172 },
      pubKeyHash: 30,
      scriptHash: 13,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: false
  },
  79: {
    name: "clubcoin",
    satoshi: 8,
    unit: "CLUB",
    xpub: 76067358,
    apiName: "club",
    bitcoinjs: {
      messagePrefix: "ClubCoin Signed Message:",
      bip32: { public: 76067358, private: 87393172 },
      pubKeyHash: 28,
      scriptHash: 85,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: true
  },
  88: {
    name: "qtum",
    satoshi: 8,
    unit: "QTUM",
    xpub: 76067358,
    apiName: "qtum",
    bitcoinjs: {
      messagePrefix: "Qtum Signed Message:",
      bip32: { public: 76067358, private: 87393172 },
      pubKeyHash: 58,
      scriptHash: 50,
      wif: 128
    },
    isSegwitSupported: true,
    handleFeePerByte: false,
    areTransactionTimestamped: undefined
  },
  105: {
    name: "stratis",
    satoshi: 8,
    unit: "STRAT",
    xpub: 76071454,
    apiName: "strat",
    bitcoinjs: {
      messagePrefix: "Stratis Signed Message:",
      bip32: { public: 76071454, private: 87393172 },
      pubKeyHash: 63,
      scriptHash: 125,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: true
  },
  125: {
    name: "stealthcoin",
    satoshi: 6,
    unit: "XST",
    xpub: 2405583718,
    apiName: "xst",
    bitcoinjs: {
      messagePrefix: "StealthCoin Signed Message:",
      bip32: { public: 2405583718, private: 87393172 },
      pubKeyHash: 62,
      scriptHash: 85,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: true
  },
  133: {
    name: "zcash",
    satoshi: 8,
    unit: "ZEC",
    xpub: 76067358,
    apiName: "zec",
    bitcoinjs: {
      messagePrefix: "Zcash Signed Message:",
      bip32: { public: 76067358, private: 87393172 },
      pubKeyHash: 7352,
      scriptHash: 7357,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: undefined
  },
  141: {
    name: "komodo",
    satoshi: 8,
    unit: "KMD",
    xpub: 4193182861,
    apiName: "kmd",
    bitcoinjs: {
      messagePrefix: "Komodo Signed Message:",
      bip32: { public: 4193182861, private: 87393172 },
      pubKeyHash: 60,
      scriptHash: 85,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: undefined
  },
  156: {
    name: "bitcoin gold",
    satoshi: 8,
    unit: "BTG",
    xpub: 76067358,
    apiName: "btg",
    bitcoinjs: {
      messagePrefix: "Bitcoin gold Signed Message:",
      bip32: { public: 76067358, private: 76066276 },
      pubKeyHash: 38,
      scriptHash: 23,
      wif: 128
    },
    sigHash: 0x41,
    isSegwitSupported: true,
    handleFeePerByte: true,
    areTransactionTimestamped: undefined
  },
  171: {
    name: "hcash",
    satoshi: 8,
    unit: "HSR",
    xpub: 76071454,
    apiName: "hsr",
    bitcoinjs: {
      messagePrefix: "HShare Signed Message:",
      bip32: { public: 76071454, private: 87393172 },
      pubKeyHash: 40,
      scriptHash: 100,
      wif: 128
    },
    isSegwitSupported: false,
    handleFeePerByte: false,
    areTransactionTimestamped: true
  }
};

export default networks;
