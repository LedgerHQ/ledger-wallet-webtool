import React, { Component } from "react";
import Inspector from "react-inspector";
import Transport from "@ledgerhq/hw-transport-u2f";
import AppBtc from "@ledgerhq/hw-app-btc";

import {
  Button,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar,
  Alert
} from "react-bootstrap";
import Networks from "./Networks";
import Errors from "./Errors";

class TransactionDecoder extends Component {
  constructor(props) {
    super();

    this.state = {
      rawTx: "",
      result: {},
      coin: 0,
      error: false,
      running: false
    };
  }

  onError = e => {
    this.setState({
      error: e.toString(),
      running: false,
      done: false
    });
  };

  handleChangeRawTx = e => {
    this.setState({ rawTx: e.target.value });
  };

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value });
  };

  decode = async e => {
    e.preventDefault();
    this.setState({ running: true, done: false, error: false });
    try {
      const transport = await Transport.open();
      const btc = new AppBtc(transport);
      this.setState({
        running: false,
        done: true,
        result: btc.splitTransaction(
          this.state.rawTx,
          Networks[this.state.coin].isSegwitSupported,
          Networks[this.state.coin].areTransactionTimestamped,
          !!Networks[this.state.coin].expiryHeight
        )
      });
      console.log("decoded tx", this.state.result);
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
      <div className="TransactionDecoder">
        <form onSubmit={this.decode}>
          <FormGroup controlId="TransactionDecoder">
            <ControlLabel>Currency</ControlLabel>
            <FormControl
              componentClass="select"
              placeholder="select"
              onChange={this.handleChangeCoin}
              disabled={this.state.running}
            >
              {coinSelect}
            </FormControl>
            <ControlLabel>Raw Tx</ControlLabel>
            <FormControl
              componentClass="textarea"
              value={this.state.rawTx}
              disabled={this.state.running}
              onChange={this.handleChangeRawTx}
            />
            <br />
            <ButtonToolbar>
              <Button
                bsStyle="primary"
                bsSize="large"
                disabled={this.state.running || this.state.rawTx.length < 1}
                onClick={this.decode}
              >
                Decode Tx
              </Button>
            </ButtonToolbar>
          </FormGroup>
        </form>
        <br />
        <br />
        {this.state.error && (
          <Alert bsStyle="danger">
            <strong>Operation aborted</strong>
            <p style={{ wordWrap: "break-word" }}>{this.state.error}</p>
          </Alert>
        )}
        {this.state.done && !this.state.result && (
          <Alert bsStyle="warning">
            <strong>Success</strong>
          </Alert>
        )}
        {this.state.done && this.state.result && (
          <div>
            <div
              style={{
                textAlign: "left"
              }}
            >
              <Inspector data={this.state.result} expandLevel={2} />
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default TransactionDecoder;
