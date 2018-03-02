import React, { Component } from "react";
import util from "util";
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
import { initialize } from "./PathFinderUtils";
import {
  estimateTransactionSize,
  createPaymentTransaction
} from "./TransactionUtils";
import Errors from "./Errors";
import Transport from "@ledgerhq/hw-transport-u2f";
import AppBtc from "@ledgerhq/hw-app-btc";

class AddressChecker extends Component {
  constructor(props) {
    super();
    this.state = {
      error: false,
      done: false,
      running: false,
      tx: "",
      coin: "0",
      result: ""
    };
  }

  onError = e => {
    this.setState({
      error: e.toString(),
      running: false,
      done: false
    });
  };

  handleChangeTx = e => {
    this.setState({ tx: e.target.value.replace(/\s/g, "") });
  };

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value });
  };

  check = async () => {
    this.setState({ running: true, done: false, error: false });
    try {
      var path =
        "https://api.ledgerwallet.com/blockchain/v2/" +
        Networks[this.state.coin].apiName +
        "/transactions/" +
        this.state.tx;
      let response = await fetch(path);
      let data = await response.json();

      this.setState({ running: false, done: true, result: data[0] });
    } catch (e) {
      this.onError(Errors.networkError);
    }
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
      <div className="TxChecker">
        {this.state.error && (
          <Alert bsStyle="danger">
            <strong>Operation aborted</strong>
            <p style={{ wordWrap: "break-word" }}>{this.state.error}</p>
          </Alert>
        )}
        {this.state.done &&
          this.state.result && (
            <Alert bsStyle="success">
              <strong>Tx found on Ledger nodes</strong>
              <p style={{ wordWrap: "break-word" }}>
                {util.inspect(this.state.result, { depth: null })}
              </p>
            </Alert>
          )}
        {this.state.done &&
          !this.state.result && (
            <Alert bsStyle="warning">
              <strong>Tx does not exist</strong>
            </Alert>
          )}
        <ControlLabel>Currency</ControlLabel>
        <FormControl
          componentClass="select"
          placeholder="select"
          onChange={this.handleChangeCoin}
          disabled={this.state.running}
        >
          {coinSelect}
        </FormControl>
        <ControlLabel>Tx hash</ControlLabel>
        <FormControl
          type="text"
          value={this.state.path}
          disabled={this.state.running}
          onChange={this.handleChangeTx}
        />
        <br />
        <ButtonToolbar>
          <Button
            bsStyle="primary"
            bsSize="large"
            disabled={this.state.running || this.state.tx.length < 1}
            onClick={this.check}
          >
            Check if Tx exists
          </Button>
        </ButtonToolbar>
      </div>
    );
  }
}

export default AddressChecker;
