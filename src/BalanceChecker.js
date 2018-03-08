import React, { Component } from "react";
import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";
import "react-bootstrap-table/dist/react-bootstrap-table.min.css";
import fetchWithRetries from "./FetchWithRetries";
import ObjectInspector from "react-object-inspector";

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
var util = require("util");

class BalanceChecker extends Component {
  constructor(props) {
    super();
    this.state = {
      done: false,
      running: false,
      coin: "1",
      error: false,
      segwit: true,
      path: "49'/1'/0'",
      useXpub: false,
      xpub58: "",
      gap: 2,
      result: [],
      allTxs: false
    };
  }

  reset = () => {
    // change states.
    localStorage.removeItem("LedgerFundsTransfer");
    this.setState({
      prepared: false,
      running: false,
      done: false,
      empty: false,
      txs: false,
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
    this.setState({ path: e.target.value.replace(/\s/g, ""), done: false });
  };

  handleChangeGap = e => {
    this.setState({ gap: e.target.value, done: false });
  };

  handleChangeSegwit = e => {
    this.setState({ segwit: !this.state.segwit, done: false });
  };

  handleChangeUseXpub = e => {
    this.setState({ useXpub: e, done: false });
  };

  handleChangeXpub = e => {
    this.setState({ xpub58: e.target.value.replace(/\s/g, ""), done: false });
  };

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value, done: false });
  };

  onUpdate = e => {
    this.setState({ result: this.state.result.concat(e) });
  };

  stop = () => {
    this.setState({ running: false });
  };

  addressesOptions = {
    onRowClick: row => {
      this.setState({
        selectedTxs: Object.keys(this.state.allTxs[row.address]).map(
          tx => this.state.allTxs[row.address][tx].display
        ),
        selectedTx: false
      });
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
    e.preventDefault();
    let total = 0;
    let allTxs = {};
    this.setState({
      running: true,
      prepared: false,
      done: false,
      empty: false,
      error: false,
      result: [],
      allTxs: false,
      selectedTxs: false
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
      const iterate = async (txs, address, spent, blockHash = "") => {
        const res = await fetchWithRetries(apiPath + blockHash);
        const data = await res.json();
        txs = txs.concat(data.txs);
        if (!data.truncated) {
          if (data.txs.length < 1) {
            emptyStreak++;
            return [{}, address];
          } else {
            var utxos = {};
            allTxs[address] = {};
            txs.forEach(tx => {
              let localBalance = 0;
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
                  localBalance += output.value;
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
                  localBalance -= input.value;
                }
              });
              allTxs[address][tx.hash] = {
                display: {
                  time: tx.received_at,
                  amount: tx.amount,
                  hash: tx.hash,
                  raw: tx
                }
              };
            });
            return [utxos, address];
          }
        } else {
          return await iterate(
            txs,
            address,
            spent,
            "&blockHash=" + data.txs[data.txs.length - 1].block.hash
          );
        }
      };
      for (let i = 0; emptyStreak < this.state.gap; i++) {
        //console.log("i, emptystreak", i, emptyStreak);
        if (this.state.error) {
          break;
        }
        for (let j = 0; j < 2; j++) {
          if (!this.state.running) {
            throw "stopped";
          }
          let localPath = [this.state.path, j, i].join("/");
          let address;
          let txs = [];
          let spent = {};
          try {
            address = await findAddress(
              localPath,
              this.state.segwit,
              this.state.coin,
              xpub58
            );
          } catch (e) {
            throw Errors.u2f;
          }
          try {
            var apiPath =
              "https://api.ledgerwallet.com/blockchain/v2/" +
              Networks[this.state.coin].apiName +
              "/addresses/" +
              address +
              "/transactions?noToken=true";
            let d = await iterate(txs, address, spent);
            let balance = this.getBalance(d);
            total += balance;
            this.onUpdate({
              path: localPath,
              address,
              balance:
                (balance / 10 ** Networks[this.state.coin].satoshi).toString() +
                " " +
                Networks[this.state.coin].unit
            });
          } catch (e) {
            throw Errors.networkError;
          }
        }
      }
      this.setState({
        running: false,
        done: true,
        allTxs,
        selectedTxs: false,
        totalBalance:
          (total / 10 ** Networks[this.state.coin].satoshi).toString() +
          " " +
          Networks[this.state.coin].unit
      });
    } catch (e) {
      if (!(e === "stopped")) {
        this.onError(e);
      } else {
        this.setState({
          running: false,
          done: true,
          allTxs,
          selectedTxs: false,
          totalBalance:
            (total / 10 ** Networks[this.state.coin].satoshi).toString() +
            " " +
            Networks[this.state.coin].unit
        });
      }
    }
  };

  getBalance = d => {
    const utxos = d[0];
    let balance = 0;
    for (var utxo in utxos) {
      if (utxos.hasOwnProperty(utxo)) {
        for (var index in utxos[utxo]) {
          if (utxos[utxo].hasOwnProperty(index)) {
            balance += utxos[utxo][index].outputs[index].value;
          }
        }
      }
    }
    return balance > 0 ? balance : 0;
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
        {this.state.error && (
          <Alert bsStyle="danger">
            <strong>Operation aborted</strong>
            <p>{this.state.error}</p>
          </Alert>
        )}
        {this.state.done && (
          <Alert bsStyle="success">
            <strong>Synchronization finished</strong>
          </Alert>
        )}
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
              placeholder="44'/0'/0'"
              onChange={this.handleChangePath}
              disabled={this.state.running || this.state.prepared}
            />
            <FormControl.Feedback />
            <ControlLabel>Gap</ControlLabel>
            <FormControl
              type="number"
              value={this.state.gap}
              onChange={this.handleChangeGap}
              disabled={this.state.running || this.state.prepared}
            />
            <br />
            <ButtonToolbar style={{ marginTop: "10px" }}>
              {!this.state.running && (
                <Button bsSize="large" onClick={this.recover}>
                  Recover Path
                </Button>
              )}
              {this.state.running && (
                <Button bsSize="large" onClick={this.stop}>
                  Stop
                </Button>
              )}
            </ButtonToolbar>
          </FormGroup>
          {this.state.done && (
            <h2>Total on this account: {this.state.totalBalance}</h2>
          )}
        </form>
        <BootstrapTable
          data={this.state.result}
          striped={true}
          hover={true}
          pagination
          options={this.addressesOptions}
        >
          <TableHeaderColumn dataField="path" isKey={true}>
            Derivation path
          </TableHeaderColumn>
          <TableHeaderColumn dataField="address">Address</TableHeaderColumn>
          <TableHeaderColumn dataField="balance">Balance</TableHeaderColumn>
        </BootstrapTable>
        {this.state.done &&
          this.state.selectedTxs && (
            <BootstrapTable
              data={this.state.selectedTxs}
              striped={true}
              hover={true}
              pagination
              options={this.txsOptions}
            >
              <TableHeaderColumn dataField="hash" isKey={true}>
                Hash
              </TableHeaderColumn>
              <TableHeaderColumn dataField="amount">Amount</TableHeaderColumn>
              <TableHeaderColumn dataField="time">Time</TableHeaderColumn>
            </BootstrapTable>
          )}
        {this.state.selectedTx && (
          <div
            style={{
              textAlign: "left"
            }}
          >
            <ObjectInspector data={this.state.selectedTx} />
          </div>
        )}
      </div>
    );
  }
}

export default BalanceChecker;
