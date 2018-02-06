import React, { Component } from "react";
import Networks from "./Networks";
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

import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";
import { findPath } from "./PathFinderUtils";
import _ from "lodash";

class PathFinder extends Component {
  constructor(props) {
    super();
    if (localStorage.getItem("LedgerPathFinder")) {
      this.state = JSON.parse(localStorage.getItem("LedgerPathFinder"));
    } else {
      this.state = {
        done: false,
        paused: false,
        running: false,
        batchSize: 10,
        account: "0",
        address: "",
        result: [],
        coinPath: "1",
        coin: "1",
        index: "0",
        segwit: true,
        error: false
      };
    }
  }

  componentWillUnmount() {
    var state = {};
    this.terminate && this.terminate();
    if (this.state.running || this.state.paused) {
      Object.assign(state, this.state, { running: false, paused: true });
    } else {
      Object.assign(state, this.state);
    }
    localStorage.setItem("LedgerPathFinder", JSON.stringify(state));
  }

  handleChangeAddress = e => {
    this.setState({ address: e.target.value.replace(/\s/g, "") });
  };

  handleChangeAccount = e => {
    this.setState({ account: e.target.value });
  };

  handleChangeIndex = e => {
    this.setState({ index: e.target.value });
  };

  handleChangeCoinPath = e => {
    this.setState({ coinPath: e.target.value });
  };

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value });
  };

  handleChangeSegwit = e => {
    this.setState({ segwit: !this.state.segwit });
  };

  onUpdate = e => {
    this.setState({
      index: e[e.length - 1].index + 1,
      result: this.state.result.concat(e)
    });
  };

  onDone = e => {
    this.stop();
    this.setState({ done: true });
  };

  onError = e => {
    this.stop();
    this.setState({ error: e });
  };

  dismiss = () => {
    this.setState({ error: false });
  };

  reset = () => {
    this.setState({
      index: 0,
      result: [],
      paused: false,
      done: false,
      error: false
    });
    localStorage.removeItem("LedgerPathFinder");
  };

  start = () => {
    this.setState({ running: true, paused: false });
    this.terminate = findPath(
      _.pick(this.state, [
        "address",
        "account",
        "index",
        "coinPath",
        "coin",
        "segwit",
        "batchSize"
      ]),
      this.onUpdate,
      this.onDone,
      this.onError
    );
  };

  stop = () => {
    this.terminate();
    this.setState({ running: false, paused: true });
  };

  save = () => {
    localStorage.setItem("LedgerPathFinder", JSON.stringify(this.state));
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
    var startName = "Start";
    if (this.state.paused) {
      startName = "Continue";
    }
    var launchButton = (
      <Button bsStyle="primary" bsSize="large" onClick={this.start}>
        {startName}
      </Button>
    );
    if (this.state.running || this.state.done) {
      launchButton = undefined;
    }

    return (
      <div className="Finder">
        This is Path finder
        <form>
          <FormGroup controlId="pathSearch">
            <ControlLabel>Currency</ControlLabel>
            <FormControl
              componentClass="select"
              placeholder="select"
              onChange={this.handleChangeCoin}
              disabled={this.state.running || this.state.paused}
            >
              {coinSelect}
            </FormControl>
            <ControlLabel>Coin Path</ControlLabel>
            <FormControl
              type="text"
              value={this.state.coinPath}
              placeholder="Bitcoin = 0"
              onChange={this.handleChangeCoinPath}
              disabled={this.state.running || this.state.paused}
            />
            <ControlLabel>Address</ControlLabel>
            <FormControl
              type="text"
              value={this.state.address}
              placeholder="Address (leave empty to list all addresses)"
              onChange={this.handleChangeAddress}
              disabled={this.state.running || this.state.paused}
            />
            <ControlLabel>Account number</ControlLabel>
            <FormControl
              type="text"
              value={this.state.account}
              placeholder="Account number (default = 0)"
              onChange={this.handleChangeAccount}
              disabled={this.state.running || this.state.paused}
            />
            <ControlLabel>Start index</ControlLabel>
            <FormControl
              type="text"
              value={this.state.index}
              placeholder="Start index (default = 0)"
              onChange={this.handleChangeIndex}
              disabled={this.state.running || this.state.paused}
            />
            <Checkbox
              onChange={this.handleChangeSegwit}
              checked={this.state.segwit}
              disabled={this.state.running || this.state.paused}
            >
              Segwit
            </Checkbox>
            <FormControl.Feedback />
          </FormGroup>
        </form>
        <ButtonToolbar>
          {launchButton}
          {this.state.running && (
            <Button bsStyle="primary" bsSize="large" onClick={this.stop}>
              Pause
            </Button>
          )}
          <Button
            bsSize="large"
            disabled={this.state.running}
            onClick={this.reset}
          >
            reset
          </Button>
        </ButtonToolbar>
        <div className="alert">
          {this.state.done &&
            this.state.address.length > 0 && (
              <Alert bsStyle="success">
                <strong>Path found!</strong> The path for {this.state.address}{" "}
                is {this.state.result[this.state.result.length - 1].path}
              </Alert>
            )}
          {this.state.error && (
            <Alert bsStyle="warning" onDismiss={this.dismiss}>
              <strong>Oups!</strong>
              <p>{this.state.error}</p>
            </Alert>
          )}
        </div>
        <div className="progress">
          Addresses scanned: {this.state.result.length}
        </div>
        <BootstrapTable
          height="400"
          data={this.state.result}
          striped={true}
          hover={true}
          pagination
          exportCSV
        >
          <TableHeaderColumn dataField="path">
            Derivation path
          </TableHeaderColumn>
          <TableHeaderColumn dataField="address" isKey={true}>
            Address
          </TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

export default PathFinder;
