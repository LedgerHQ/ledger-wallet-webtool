import React, { Component } from "react";
import {
  Button,
  Checkbox,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar,
  Alert,
  DropdownButton,
  MenuItem
} from "react-bootstrap";
import Networks from "./Networks";
import { findAddress } from "./PathFinderUtils";
import {
  estimateTransactionSize,
  createPaymentTransaction
} from "./TransactionUtils";
import Errors from "./Errors";
const VALIDATIONS = {
  6: "slow",
  3: "medium",
  1: "fast"
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
      path: "44'/128'/0'/0/2",
      utxos: {},
      txSize: 0,
      useXpub: false,
      xpub58: ""
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
    if (
      e.target.value &&
      e.target.value * this.state.txSize < this.state.balance
    ) {
      this.setState({
        customFees: false,
        fees: this.state.txSize * e.target.value
      });
    } else {
      this.setState({
        customFees: true,
        fees: this.state.customFeesVal * this.state.txSize
      });
    }
  };

  handleChangeUseXpub = e => {
    this.setState({ useXpub: e });
  };

  handleChangeXpub = e => {
    this.setState({ xpub58: e.target.value.replace(/\s/g, "") });
  };

  handleEditFees = e => {
    if (e.target.value * this.state.txSize < this.state.balance) {
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
    try {
      var path =
        "https://api.ledgerwallet.com/blockchain/v2/" +
        Networks[this.state.coin].apiName +
        "/fees";
      let response = await fetch(path);
      let data = await response.json();
      this.setState({ standardFees: data });
    } catch (e) {}
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
    let address;
    let txs = [];
    let spent = {};
    try {
      await this.getFees();
      address = await findAddress(
        this.state.path,
        this.state.segwit,
        this.state.coin,
        this.state.useXpub ? this.state.xpub58 : undefined
      );
    } catch (e) {
      this.onError(Errors.u2f);
    }
    try {
      var blockHash = "";
      var apiPath =
        "https://api.ledgerwallet.com/blockchain/v2/" +
        Networks[this.state.coin].apiName +
        "/addresses/" +
        address +
        "/transactions?noToken=true";
      const iterate = async (blockHash = "") => {
        const res = await fetch(apiPath + blockHash);
        const data = await res.json();
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
          return [utxos, address];
        } else {
          iterate(data.txs[data.txs.length - 1].block.hash);
        }
      };
      const d = await iterate();
      this.onPrepared(d);
    } catch (e) {
      this.onError(Errors.networkError);
    }
  };

  onPrepared = d => {
    const utxos = d[0];
    let balance = 0;
    let inputs = 0;
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
        address: d[1]
      });
    } else {
      let txSize = Networks[this.state.coin].handleFeePerByte
        ? estimateTransactionSize(inputs, 1, this.state.segwit).max
        : Math.floor(
            estimateTransactionSize(inputs, 1, this.state.segwit).max / 1000
          ) + 1;
      this.setState({
        empty: false,
        txSize,
        prepared: true,
        running: false,
        utxos: utxos,
        balance: balance,
        address: d[1],
        customFeesVal: 0,
        fees:
          txSize * this.state.standardFees[6] < balance
            ? txSize * this.state.standardFees[6]
            : 0,
        customFees: txSize * this.state.standardFees[6] >= balance
      });
    }
  };

  send = async () => {
    this.setState({ running: true, done: false, error: false });
    try {
      let tx;
      tx = await createPaymentTransaction(
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
        "https://api.ledgerwallet.com/blockchain/v2/" +
        Networks[this.state.coin].apiName +
        "/transactions/send";
      console.log("res", tx);
      let res;
      try {
        res = await fetch(path, {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": JSON.stringify(body).length
          },
          method: "post",
          body
        });
        if (!res.ok) {
          throw "not ok";
        }
      } catch (e) {
        if (e == "not ok") {
          let err = await res.text();
          err = JSON.parse(err);
          console.log(err);
          err = JSON.parse(err.error);
          throw Errors.sendFail + err;
        } else {
          throw Errors.networkError;
        }
      }
      this.onSent(res);
    } catch (e) {
      this.onError(e);
    }
  };

  onSent = async tx => {
    let error = false;
    const json = await tx.json();
    if (!json) {
      console.log(error);
      error = tx;
    }
    this.setState({
      prepared: false,
      running: false,
      done: json.result,
      error
    });
  };

  render() {
    let derivations = ["Derive from device", "Derive from XPUB"];

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
      if (
        this.state.standardFees[blocks] * this.state.txSize <
        this.state.balance
      ) {
        feeSelect.push(
          <option value={this.state.standardFees[blocks]} key={blocks}>
            {VALIDATIONS[blocks]} :{this.state.standardFees[blocks]}
          </option>
        );
      }
    });
    feeSelect.push(
      <option value={false} key={0} selected={this.state.customFees}>
        Custom fees
      </option>
    );

    return (
      <div className="FundsTransfer">
        {this.state.error && (
          <Alert bsStyle="danger">
            <strong>Operation aborted</strong>
            <p>{this.state.error}</p>
          </Alert>
        )}
        {this.state.empty &&
          !this.state.error && (
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
            <p>Please check online for confirmations. TX : {this.state.done}</p>
          </Alert>
        )}
        <form onSubmit={this.prepare}>
          <FormGroup controlId="FundsTransfer">
            <DropdownButton
              title={this.state.useXpub ? derivations[1] : derivations[0]}
              disabled={this.state.running || this.state.paused}
              bsStyle="primary"
              bsSize="medium"
              style={{ marginBottom: "15px" }}
            >
              <MenuItem onClick={() => this.handleChangeUseXpub(false)}>
                {" "}
                {derivations[0]}{" "}
              </MenuItem>
              <MenuItem onClick={() => this.handleChangeUseXpub(true)}>
                {" "}
                {derivations[1]}{" "}
              </MenuItem>
            </DropdownButton>
            <br />
            {this.state.useXpub && (
              <div>
                <ControlLabel>XPUB</ControlLabel>
                <FormControl
                  type="text"
                  value={this.state.xpub58}
                  onChange={this.handleChangeXpub}
                  disabled={this.state.running || this.state.prepared}
                />
              </div>
            )}
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
            <br />
            <ButtonToolbar style={{ marginTop: "10px" }}>
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
          </FormGroup>
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
                    disabled={
                      this.state.running ||
                      !this.state.destination ||
                      !this.state.fees
                    }
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
