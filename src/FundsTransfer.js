import React, { Component } from "react";
import {
  Button,
  Checkbox,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar
} from "react-bootstrap";
import Networks from "./Networks";
import { findAddress } from "./PathFinderUtils";
import {
  estimateTransactionSize,
  createPaymentTransaction
} from "./TransactionUtils";

class FundsTransfer extends Component {
  constructor(props) {
    super();
    this.state = {
      done: false,
      running: false,
      address: "",
      prepared: false,
      destination: "",
      coin: "1",
      onError: false,
      segwit: false,
      fees: 0,
      customFees: 0,
      empty: false,
      standardFees: {
        1: 3000,
        3: 2000,
        6: 1000
      },
      balance: 0,
      path: "44'/1'/0'/0/26",
      sent: false,
      utxos: {},
      txSize: 0
    };
  }

  reset = () => {
    // change states.
    localStorage.removeItem("LedgerFundsTransfer");
    this.setState({
      prepared: false,
      running: false,
      done: false
    });
  };

  onError = e => {
    console.log(e);
    alert("on error : " + e);
    this.setState({
      onError: true,
      running: false,
      done: false
    });
  };

  handleChangeDestination = e => {
    this.setState({ destination: e.target.value });
  };

  handleChangePath = e => {
    this.setState({ path: e.target.value });
  };

  handleChangeSegwit = e => {
    this.setState({ segwit: !this.state.segwit });
  };

  handleChangeFees = e => {
    if (e.target.value < this.state.balance) {
      this.setState({
        customFees: e.target.value,
        fees: this.state.txSize * e.target.value
      });
    } else {
    }
  };

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value });
  };

  getFees = () => {
    return new Promise((resolve, reject) => {
      var path =
        //"https://api.ledgerwallet.com/blockchain/v2/" +
        Networks[this.state.coin].apiName + "/fees";
      fetch(path)
        .then(response => {
          response.json().then(data => {
            this.setState({ standardFees: data });
            resolve(data);
          });
        })
        .catch(e => {
          this.onError(e);
        });
    });
  };

  prepare = () => {
    this.setState({ running: true, prepared: false });
    var f = this.getFees();
    var d = new Promise((resolve, reject) => {
      var txs = [];
      var spent = {};
      findAddress(
        this.state.path,
        this.state.segwit,
        this.state.coin,
        this.onError
      )
        .then(address => {
          var blockHash = "";
          var apiPath =
            //"https://api.ledgerwallet.com/blockchain/v2/" +
            Networks[this.state.coin].apiName +
            "/addresses/" +
            address +
            "/transactions?noToken=true";
          var iterate = (blockHash = "") => {
            fetch(apiPath + blockHash)
              .then(response => {
                response.json().then(data => {
                  if (!data.truncated) {
                    txs = txs.concat(data.txs);
                    var utxos = {};
                    txs.forEach(tx => {
                      console.log(tx.hash);
                      tx.outputs.forEach(output => {
                        if (output.address === address) {
                          if (!spent[tx.hash]) {
                            spent[tx.hash] = {};
                          }
                          if (!spent[tx.hash][output.output_index]) {
                            if (!utxos[tx.hash]) {
                              utxos[tx.hash] = {};
                            }
                            utxos[tx.hash][output.output_index] = tx;
                          }
                        }
                      });

                      tx.inputs.forEach(input => {
                        if (input.address === address) {
                          if (utxos.hasOwnProperty(input.output_hash)) {
                            delete utxos[input.output_hash][input.output_index];
                          } else {
                            if (!spent[input.output_hash]) {
                              spent[input.output_hash] = {};
                            }
                            spent[input.output_hash][input.output_index] = true;
                          }
                        }
                      });
                    });
                    resolve([utxos, address]);
                  } else {
                    iterate(data.txs[data.txs.length - 1].block.hash);
                  }
                });
              })
              .catch(e => {
                this.onError(e);
              });
          };
          iterate();
        })
        .catch(e => {
          console.log("error: ", e);
          reject(e);
        });
    });

    Promise.all([d, f])
      .then(d => {
        this.onPrepared.apply(this, d[0]);
      })
      .catch(e => {
        this.onError(e);
      });
  };

  onPrepared = (utxos, address) => {
    var balance = 0;
    var inputs = 0;
    for (var utxo in utxos) {
      if (utxos.hasOwnProperty(utxo)) {
        for (var index in utxos[utxo]) {
          if (utxos[utxo].hasOwnProperty(index)) {
            balance += utxos[utxo][index].outputs[index].value;
            inputs++;
          }
        }
      }
    }
    if (balance <= 0) {
      this.setState({
        empty: true,
        prepared: true,
        running: false,
        balance: balance,
        address: address
      });
    } else {
      this.setState({
        empty: false,
        txSize: Networks[this.state.coin].handleFeePerByte
          ? estimateTransactionSize(inputs, 1, this.state.segwit).max
          : estimateTransactionSize(inputs, 1, this.state.segwit).max / 1000,
        prepared: true,
        running: false,
        utxos: utxos,
        balance: balance,
        address: address,
        customFees: this.state.standardFees[6],
        fees:
          estimateTransactionSize(inputs, 1, this.state.segwit).max *
          this.state.standardFees[6]
      });
    }
  };

  send = () => {
    this.setState({ running: true });
    createPaymentTransaction(
      this.state.destination,
      this.state.balance - this.state.fees,
      this.state.utxos,
      this.state.path,
      this.state.coin
    )
      .then(res => {
        var body = JSON.stringify({
          tx: res
        });
        var path =
          //"https://api.ledgerwallet.com/blockchain/v2/" +
          Networks[this.state.coin].apiName + "/transactions/send";
        console.log("res", res);
        fetch(path, {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": JSON.stringify(body).length
          },
          method: "post",
          body
        }).then(res => {
          this.onSent();
        });
      })
      .catch(e => {
        this.onError(e);
      });
  };

  onSent = () => {
    this.setState({ prepared: false, running: false, sent: true });
  };

  render() {
    var coinSelect = [];
    for (var coin in Networks) {
      if (Networks.hasOwnProperty(coin)) {
        coinSelect.push(
          <option value={coin} key={coin} selected={coin === this.state.coin}>
            {Networks[coin].name}
          </option>
        );
      }
    }

    return (
      <div className="FundsTransfer">
        <form>
          <FormGroup controlId="FundsTransfer">
            <ControlLabel>Currency</ControlLabel>
            <FormControl
              componentClass="select"
              placeholder="select"
              onChange={this.handleChangeCoin}
              disabled={this.state.running || this.state.prepared}
            >
              {coinSelect}
            </FormControl>
            <Checkbox
              onChange={this.handleChangeSegwit}
              checked={this.state.segwit}
              disabled={this.state.running || this.state.prepared}
            >
              Segwit
            </Checkbox>
            <ControlLabel>Path</ControlLabel>
            <FormControl
              type="text"
              value={this.state.path}
              placeholder="44'/0'/0'/0/0"
              onChange={this.handleChangePath}
              disabled={this.state.running || this.state.prepared}
            />
            <FormControl.Feedback />
          </FormGroup>
        </form>
        <ButtonToolbar>
          {!this.state.prepared && (
            <Button
              bsSize="large"
              disabled={this.state.running}
              onClick={this.prepare}
            >
              Recover Path
            </Button>
          )}
          {this.state.prepared && (
            <Button
              bsSize="large"
              disabled={this.state.running}
              onClick={this.reset}
            >
              Change Path
            </Button>
          )}
        </ButtonToolbar>

        {this.state.prepared && (
          <div className="prepared">
            <div className="balance">
              The address {this.state.address} has {this.state.balance}{" "}
              {Networks[this.state.coin].unit} on it.
            </div>
            {!this.state.empty && (
              <div>
                <form>
                  <ControlLabel>Destination</ControlLabel>
                  <FormControl
                    type="text"
                    value={this.state.destination}
                    placeholder="Address to send to"
                    onChange={this.handleChangeDestination}
                    disabled={this.state.running}
                  />
                  <ControlLabel>
                    Fees per{" "}
                    {Networks[this.state.coin].handleFeePerByte
                      ? "byte"
                      : "kilo byte"}
                  </ControlLabel>
                  <FormControl
                    type="text"
                    value={this.state.customFees}
                    onChange={this.handleChangeFees}
                    disabled={this.state.running}
                  />
                </form>
                <div className="feesIndication">
                  SLOW : {this.state.standardFees[6]} <br />
                  NORMAL : {this.state.standardFees[3]} <br />
                  FAST : {this.state.standardFees[1]}
                </div>
                <div className="amount">
                  ESTIMATED TRANSACTION COST Sending :{" "}
                  {this.state.balance - this.state.fees} <br />
                  Fees : {this.state.fees} <br />
                </div>
                <ButtonToolbar>
                  <Button
                    bsStyle="primary"
                    bsSize="large"
                    disabled={this.state.running}
                    onClick={this.send}
                  >
                    Send
                  </Button>
                </ButtonToolbar>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default FundsTransfer;
