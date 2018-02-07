import React, { Component } from "react";
import {
  Button,
  Checkbox,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar,
  Alert
} from "react-bootstrap";
import Networks from "./Networks";
import { findAddress } from "./PathFinderUtils";
import {
  estimateTransactionSize,
  createPaymentTransaction
} from "./TransactionUtils";
import Errors from "./libs/Errors";
const VALIDATIONS = {
  1: "fast",
  3: "medium",
  6: "slow"
};

class FundsTransfer extends Component {
  constructor(props) {
    super();
    this.state = {
      done: false,
      running: false,
      address: "",
      prepared: false,
      destination: "",
      coin: "128",
      error: false,
      segwit: true,
      fees: 0,
      customFees: false,
      customFeesVal: 0,
      empty: false,
      standardFees: {
        1: 3000,
        3: 2000,
        6: 1000
      },
      balance: 0,
      path: "49'/128'/0'/0/2",
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
      done: false,
      empty: false
    });
  };

  onError = e => {
    this.setState({
      error: e.toString(),
      running: false,
      done: false
    });
  };

  handleChangeDestination = e => {
    this.setState({ destination: e.target.value.replace(/\s/g, "") });
  };

  handleChangePath = e => {
    this.setState({ path: e.target.value.replace(/\s/g, ""), done: false });
  };

  handleChangeSegwit = e => {
    this.setState({ segwit: !this.state.segwit });
  };

  handleChangeFees = e => {
    if (e.target.value && e.target.value < this.state.balance) {
      this.setState({
        customFees: false,
        fees: this.state.txSize * e.target.value
      });
    } else {
      this.setState({
        customFees: true
      });
    }
  };

  handleEditFees = e => {
    if (e.target.value < this.state.balance) {
      this.setState({
        customFeesVal: e.target.value,
        fees: this.state.txSize * e.target.value
      });
    }
  };

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value });
  };

  getFees = async () => {
    var path =
      //"https://api.ledgerwallet.com/blockchain/v2/" +
      Networks[this.state.coin].apiName + "/fees";
    return await fetch(path /*, { mode: "no-cors" }*/)
      .then(response => response.json())
      .then(data => {
        this.setState({ standardFees: data });
        return data;
      });
  };

  prepare = async e => {
    e.preventDefault();
    this.setState({
      running: true,
      prepared: false,
      done: false,
      empty: false,
      error: false
    });
    try {
      var f = await this.getFees();
      var d = await new Promise((resolve, reject) => {
        var txs = [];
        var spent = {};
        findAddress(this.state.path, this.state.segwit, this.state.coin)
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
                .then(response => response.json())
                .then(data => {
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
            };
            iterate();
          })
          .catch(e => {
            reject(Errors.u2f);
          });
      }).catch(e => {
        throw e;
      });
      this.onPrepared(d);
    } catch (e) {
      this.onError(e);
    }
  };

  onPrepared = ([utxos, address]) => {
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
        customFeesVal: 0,
        fees:
          estimateTransactionSize(inputs, 1, this.state.segwit).max *
            this.state.standardFees[6] <
          balance
            ? estimateTransactionSize(inputs, 1, this.state.segwit).max *
              this.state.standardFees[6]
            : 0,
        customFees: this.state.standardFees[6] >= balance
      });
    }
  };

  send = async () => {
    this.setState({ running: true, done: false, error: false });
    try {
      let tx = await createPaymentTransaction(
        this.state.destination,
        this.state.balance - this.state.fees,
        this.state.utxos,
        this.state.path,
        this.state.coin
      );
      var body = JSON.stringify({
        tx: tx
      });
      var path =
        //"https://api.ledgerwallet.com/blockchain/v2/" +
        Networks[this.state.coin].apiName + "/transactions/send";
      console.log("res", tx);
      let res = await fetch(path, {
        headers: {
          "Content-Type": "application/json",
          "Content-Length": JSON.stringify(body).length
        },
        method: "post",
        body
      });
      let data = await res.json();
      this.onSent(data);
    } catch (e) {
      this.onError(e);
    }
  };

  onSent = tx => {
    this.setState({
      prepared: false,
      running: false,
      done: tx.result,
      error: !tx.result ? Errors.sendFail + tx.error.message : false
    });
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

    let feeSelect = [];
    Object.keys(VALIDATIONS).forEach(blocks => {
      feeSelect.push(
        <option value={this.state.standardFees[blocks]} key={blocks}>
          {VALIDATIONS[blocks]} :{this.state.standardFees[blocks]}
        </option>
      );
    });
    feeSelect.push(
      <option value={false} key={0} selected={this.state.customFees}>
        Custom fees
      </option>
    );

    return (
      <div className="FundsTransfer">
        <div className="alert">
          {this.state.error && (
            <Alert bsStyle="warning">
              <strong>Oups!</strong>
              <p>{this.state.error}</p>
            </Alert>
          )}
          {this.state.empty && (
            <Alert bsStyle="warning">
              <strong>Empty address</strong>
              <p>
                The address {this.state.address} has no{" "}
                {Networks[this.state.coin].unit} on it.{" "}
              </p>
            </Alert>
          )}
          {this.state.done && (
            <Alert bsStyle="success">
              <strong>Transaction broadcasted!</strong>
              <p>
                Please check online for confirmations. TX : {this.state.done}
              </p>
            </Alert>
          )}
        </div>
        <form onSubmit={this.prepare}>
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
        </form>

        {this.state.prepared && (
          <div className="prepared">
            {!this.state.empty && (
              <div>
                <Alert bsStyle="success">
                  <strong>Funds found!</strong>
                  <p>
                    The address {this.state.address} has{" "}
                    {this.state.balance /
                      10 ** Networks[this.state.coin].satoshi}{" "}
                    {Networks[this.state.coin].unit} on it.
                  </p>
                </Alert>
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
                    componentClass="select"
                    placeholder="select"
                    onChange={this.handleChangeFees}
                    disabled={this.state.running}
                  >
                    {feeSelect}
                  </FormControl>
                  {this.state.customFees && (
                    <FormControl
                      type="text"
                      value={this.state.customFeesVal}
                      onChange={this.handleEditFees}
                      disabled={this.state.running}
                    />
                  )}
                </form>
                <div className="amount">
                  Total to receive :{" "}
                  {(this.state.balance - this.state.fees) /
                    10 ** Networks[this.state.coin].satoshi}{" "}
                  {Networks[this.state.coin].unit} <br />
                  Total fees :{" "}
                  {this.state.fees /
                    10 ** Networks[this.state.coin].satoshi}{" "}
                  {Networks[this.state.coin].unit} <br />
                </div>
                <ButtonToolbar>
                  <Button
                    bsStyle="primary"
                    bsSize="large"
                    disabled={this.state.running || !this.state.destination}
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
