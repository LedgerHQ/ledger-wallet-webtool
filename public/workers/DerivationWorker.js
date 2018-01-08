import bitcoin from "../bitcoinjs"

onmessage = function(params) {
    var response = {}
    var nextPath = function(i) {
        if(i <= 0x7fffffff) {
          for(var j=0; j<2; j++){
            var path = "44'/"+params.coin+ "'/"+params.account+"'/"+j+"/"+i
            Dongle.ledger.btc.getWalletPublicKey_async(path).then((res) => {
              onUpdate(path, res.bitcoinAddress)
              if(res.bitcoinAddress == params.address) {
                response.done = true
                postMessage(response)
                close()
              } else {
                if(j == 1) {
                  nextPath(++i)
                }
              }
            })
          }
        } else {
            postMessage(response)
        }
      }
  }