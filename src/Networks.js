const Coins = {
  0: {
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
      messagePrefix:"\x18Bitcoin Signed Message:\n",
      pubKeyHash: 0,
      scriptHash: 5,
      wif: 128
    }
  }
}


export default Coins