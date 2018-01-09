importScripts('/bitcoinjs.min.js')

onmessage = function (params) {
  console.log(params.data)
  var hdnode = bitcoin.HDNode.fromBase58(params.data.xpub58, params.data.network)
  var response = []
  var index = 0
  var prefix = "44'/" + params.data.coin + "'" + "/" + params.data.account + "'/"
  var nextPath = function (i) {
    if (i <= 0x7fffffff) {
      for (var j = 0; j < 2; j++) {
        var path = j + "/" + i
        var res = hdnode.derivePath(path)
        response.push({ index: i, path: prefix + path, address: res.getAddress() })
        if (res.getAddress() == params.data.address) {
          postMessage({ done: true, response })
          close()
        } else if (response.length > params.data.batchSize - 1) {
          postMessage({ response })
          response = []
        }
        if (j == 1) {
          nextPath(++i)
        }
      }
    } else {
      postMessage({ failed: true, response })
    }
  }
  nextPath(params.data.index)
}