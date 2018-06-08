import React, { Component } from "react";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";
import "react-bootstrap-table/dist/react-bootstrap-table.min.css";
import fetchWithRetries from "./FetchWithRetries";
import Inspector from "react-inspector";

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
import { findAddress, initialize } from "./PathFinderUtils";
import { estimateTransactionSize } from "./TransactionUtils";
import Errors from "./Errors";
import HDAddress from "./HDAddress"

const initialState = {
  done: false,
  running: false,
  coin: "0",
  error: false,
  segwit: false,
  path: "44'/0'/0'",
  useXpub: false,
  xpub58: "",
  gap: 20,
  result: [],
  allTxs: {},
  paused: false,
  lastIndex: [0, 0],
  totalBalance: 0
};

class BalanceChecker extends Component {
  hdAddress = new HDAddress();
  
  constructor(props) {
    super();
    if (localStorage.getItem("LedgerBalanceChecker")) {
      this.state = JSON.parse(localStorage.getItem("LedgerBalanceChecker"));
    } else {
      this.state = initialState;
    }
  }

  componentWillUnmount() {
    var state = {};
    this.interrupt();
    if (this.state.running) {
      Object.assign(state, this.state, {
        running: false,
        paused: true
      });
    } else {
      Object.assign(state, this.state);
    }
    localStorage.setItem("LedgerBalanceChecker", JSON.stringify(state));
  }

  reset = () => {
    // change states.
    localStorage.removeItem("LedgerBalanceChecker");
    this.setState({
      result: [],
      allTxs: {},
      paused: false,
      lastIndex: [0, 0],
      totalBalance: 0,
      done: false,
      running: false,
      error: false
    });
  };

  onError = e => {
    console.log("on error", e);
    this.reset();
    this.setState({
      error: e.toString()
    });
  };

  handleChangePath = e => {
    this.reset();
    this.setState({
      path: e.target.value.replace(/\s/g, ""),
      done: false,
      result: []
    });
  };

  handleChangeGap = e => {
    this.reset();
    this.setState({ gap: e.target.value });
  };

  handleChangeSegwit = e => {
    this.reset();
    let isSegwit = e.target.checked;
    this.setState({ 
      segwit: isSegwit,
      path: this.hdAddress.getPath(isSegwit, this.state.coin, this.state.path),
    });
  };

  handleChangeUseXpub = e => {
    this.reset();
    this.setState({ useXpub: e });
  };

  handleChangeXpub = e => {
    this.reset();
    this.setState({
      xpub58: e.target.value.replace(/\s/g, "")
    });
  };

  handleChangeCoin = e => {
    this.reset();
    this.setState({ 
      coin: e.target.value,
      path: this.hdAddress.getPath(this.state.segwit, e.target.value, this.state.path),
    });
  };

  onUpdate = (e, i, j) => {
    this.setState({ result: this.state.result.concat(e), lastIndex: [i, j] });
  };

  interrupt = () => {
    this.stop = true;
  };

  addressesOptions = {
    onRowClick: row => {
      if (!this.state.running) {
        if (this.state.allTxs[row.address]) {
          this.setState({
            selectedTxs: Object.keys(this.state.allTxs[row.address]).map(
              tx => this.state.allTxs[row.address][tx].display
            ),
            selectedAddress: row.address,
            selectedTx: false
          });
        } else {
          this.setState({
            selectedTxs: false,
            selectedAddress: false,
            selectedTx: false
          });
        }
      }
    }
  };

  txsOptions = {
    onRowClick: (tx, col, row) => {
      this.setState({
        selectedTx: tx.raw
      });
    }
  };

  recover = async e => {
    let [i, j] = this.state.lastIndex;
    this.stop = false;
    e.preventDefault();
    let total = this.state.totalBalance;
    let allTxs = this.state.allTxs;
    this.setState({
      running: true,
      paused: false,
      done: false,
      error: false,
      selectedTxs: false,
      selectedTx: false
    });
    try {
      var emptyStreak = 0;
      let xpub58 = this.state.useXpub
        ? this.state.xpub58
        : await initialize(
            this.state.coin,
            this.state.path.split("/")[0],
            this.state.path.split("/")[1],
            this.state.path.split("/")[2],
            this.state.segwit
          );
      console.log("xpub is", xpub58);
      const iterate = async (txs, address, balance, blockHash = "") => {
        const res = await fetchWithRetries(apiPath + blockHash);
        const data = await res.json();
        txs = txs.concat(data.txs);
        if (!data.truncated) {
          if (data.txs.length < 1 && j === 0) {
            emptyStreak++;
            allTxs[address] = {};
            return 0;
          } else {
            allTxs[address] = {};
            txs.forEach(tx => {
              let localBalance = 0;
              tx.outputs.forEach(output => {
                if (output.address === address) {
                  localBalance += output.value;
                }
              });
              tx.inputs.forEach(input => {
                if (input.address === address) {
                  localBalance -= input.value;
                }
              });
              balance += localBalance;
              allTxs[address][tx.hash] = {
                display: {
                  time: tx.received_at,
                  balance:
                    (
                      localBalance /
                      10 ** Networks[this.state.coin].satoshi
                    ).toString() +
                    " " +
                    Networks[this.state.coin].unit,
                  hash: tx.hash,
                  raw: tx
                }
              };
            });
          }
        } else {
          return await iterate(
            txs,
            address,
            balance,
            "&blockHash=" + data.txs[data.txs.length - 1].block.hash
          );
        }
        return balance;
      };
      for (i; emptyStreak < this.state.gap; i++) {
        if (this.state.error) {
          break;
        }
        for (j; j < 2; j++) {
          if (this.stop) {
            throw "stopped";
          }
          let localPath = [this.state.path, j, i].join("/");
          let address;
          try {
            address = await findAddress(
              localPath,
              this.state.segwit,
              this.state.coin,
              xpub58
            );
          } catch (e) {
            console.log(e);
            throw Errors.u2f;
          }
          try {
            var apiPath =
              "https://api.ledgerwallet.com/blockchain/v2/" +
              Networks[this.state.coin].apiName +
              "/addresses/" +
              address +
              "/transactions?noToken=true";
            let balance = await iterate([], address, 0);
            total += balance;
            this.onUpdate(
              {
                path: localPath,
                address,
                balance:
                  (
                    balance /
                    10 ** Networks[this.state.coin].satoshi
                  ).toString() +
                  " " +
                  Networks[this.state.coin].unit
              },
              i,
              j
            );
          } catch (e) {
            throw Errors.networkError;
          }
        }
        j = 0;
      }
      this.setState({
        running: false,
        done: true,
        allTxs,
        selectedTxs: false,
        totalBalance: total
      });
    } catch (e) {
      if (!(e === "stopped")) {
        this.onError(e);
      } else {
        this.setState({
          running: false,
          paused: true,
          allTxs,
          selectedTxs: false,
          totalBalance: total
        });
      }
    }
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

    return (
      
      <div className="BalanceChecker">
        <form onSubmit={this.recover}>
          <FormGroup controlId="BalanceChecker">
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
                  disabled={this.state.running || this.state.paused}
                />
              </div>
            )}
            <ControlLabel>Currency</ControlLabel>
            <FormControl
              componentClass="select"
              placeholder="select"
              onChange={this.handleChangeCoin}
              disabled={this.state.running || this.state.paused}
            >
              {coinSelect}
            </FormControl>
            <Checkbox
              onChange={this.handleChangeSegwit}
              checked={this.state.segwit}
              disabled={this.state.running || this.state.paused}
            >
              Segwit
            </Checkbox>
            <ControlLabel>Path</ControlLabel>
            <FormControl
              type="text"
              value={this.state.path}
              placeholder="44'/0'/0'"
              onChange={this.handleChangePath}
              disabled={this.state.running || this.state.paused}
            />
            <FormControl.Feedback />
            <ControlLabel>Gap</ControlLabel>
            <FormControl
              type="number"
              value={this.state.gap}
              onChange={this.handleChangeGap}
              disabled={this.state.running || this.state.paused}
            />
            <br />
            <ButtonToolbar style={{ marginTop: "10px" }}>
              {!this.state.running &&
                !this.state.paused &&
                !this.state.done && (
                  <Button bsSize="large" onClick={this.recover}>
                    Recover account's balances
                  </Button>
                )}
              {this.state.running && (
                <Button bsSize="large" onClick={this.interrupt}>
                  Pause
                </Button>
              )}
              {!this.state.running &&
                this.state.paused && (
                  <Button bsSize="large" onClick={this.recover}>
                    Continue
                  </Button>
                )}
              <Button
                bsSize="large"
                onClick={this.reset}
                disabled={this.state.running}
              >
                Reset
              </Button>
            </ButtonToolbar>
          </FormGroup>
          {this.state.error && (
            <Alert bsStyle="danger">
              <strong>Operation aborted</strong>
              <p>{this.state.error}</p>
            </Alert>
          )}
          {this.state.done && (
            <Alert bsStyle="success">
              <strong>Synchronization finished</strong>
              <p>
                Total on this account:{" "}
                {(
                  this.state.totalBalance /
                  10 ** Networks[this.state.coin].satoshi
                ).toString() +
                  " " +
                  Networks[this.state.coin].unit}
              </p>
            </Alert>
          )}
          {this.state.paused && (
            <Alert>
              <strong>Synchronization paused</strong>
              <p>
                Temporary total on this account:{" "}
                {(
                  this.state.totalBalance /
                  10 ** Networks[this.state.coin].satoshi
                ).toString() +
                  " " +
                  Networks[this.state.coin].unit}
              </p>
            </Alert>
          )}
        </form>
        <h2> Balances by address </h2>
        <BootstrapTable
          data={this.state.result}
          striped={true}
          hover={true}
          pagination
          options={this.addressesOptions}
        >
          <TableHeaderColumn dataField="path" dataSort={true} isKey={true}>
            Derivation path
          </TableHeaderColumn>
          <TableHeaderColumn dataField="address" dataSort={true}>
            Address
          </TableHeaderColumn>
          <TableHeaderColumn dataField="balance" dataSort={true}>
            Balance
          </TableHeaderColumn>
        </BootstrapTable>
        {(this.state.done || this.state.paused) && (
          <div>
            {this.state.selectedTxs && (
              <div>
                <h3> Txs for {this.state.selectedAddress} </h3>
                <BootstrapTable
                  data={this.state.selectedTxs}
                  striped={true}
                  hover={true}
                  pagination
                  options={this.txsOptions}
                >
                  <TableHeaderColumn
                    dataField="hash"
                    dataSort={true}
                    isKey={true}
                  >
                    Hash
                  </TableHeaderColumn>
                  <TableHeaderColumn dataField="balance" dataSort={true}>
                    Balance change
                  </TableHeaderColumn>
                  <TableHeaderColumn dataField="time" dataSort={true}>
                    Time
                  </TableHeaderColumn>
                </BootstrapTable>
              </div>
            )}
            {this.state.selectedTx && (
              <div
                style={{
                  textAlign: "left"
                }}
              >
                <h4>Tx details: </h4>
                <Inspector
                  data={this.state.selectedTx}
                  expandLevel={2}
                  style={{
                    fontSize: "20px"
                  }}
                />
                <br />
                <br />
                <br />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default BalanceChecker;
