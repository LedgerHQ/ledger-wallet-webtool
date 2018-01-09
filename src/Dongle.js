import ledger from 'ledger'

console.log(ledger)

var Dongle = {};
Dongle.ledger = ledger
var V_B_L_1_1_1 = 0x30010101

function getIntFirmwareMajorVersion(version) {
  parseInt(version.substr(4,2), 16)
}

function getIntFirmwareMinorVersion(version) {
  parseInt(version.substr(6,2), 16)
}

function getIntFirmwarePatchVersion(version) {
  parseInt(version.substr(8,2),16)
}
 
function getIntSemanticFirmwareVersion(version) {
  getIntFirmwareMajorVersion(version) << 16 | getIntFirmwareMinorVersion(version) << 8 | getIntFirmwarePatchVersion(version)
}

function getArchitecture(version) {
  parseInt(version.substr(2,2),16) 
}

function getIntFirmwareVersion(version) {
  return getArchitecture(version) << 24 | getIntSemanticFirmwareVersion(version)
}

function hasUInt16CoinVersion(version) {
  return getIntFirmwareVersion(version) >= V_B_L_1_1_1
}


Dongle.init = function() {
  return new Promise((resolve, reject) => {
      ledger.comm_u2f.create_async(2).then(function(comm) {
      Dongle.btc = new ledger.btc(comm)
      resolve(comm)
    }).catch(function(err) {
        console.log("error init")
        reject(err)
      }
    );
  })
}

Dongle.getFirmwareVersion = function(comm) {
  return new Promise((resolve, reject) => {
      comm.exchange("e0c4000000", [0x9000]).then(function(response) {
      resolve(response)
    }).catch(function(err) {
        console.log("error firm ")
        reject(err)
      }
    );
  })
}

const toU16IntHexString = function(e) {
  var result = e.toString(16)
  while(result.length <= 3) {
    result = "0"+result
  }
  return result
}

Dongle.setCoinVersion = function(comm, coin) {
  return new Promise((resolve, reject) => {
    var [p2pkh, p2sh, fam] = [coin.p2pkh, coin.p2sh, coin.familly].map(x => toU16IntHexString(x))
    comm.exchange("e014000005"+p2pkh+p2sh+fam.substr(-2), [0x9000]).then(function(response) {
      resolve()
    }).catch(function(err) {
            console.log("error setcoin ")
            reject(err)
          }
        )
      }
    )
  }

export default Dongle