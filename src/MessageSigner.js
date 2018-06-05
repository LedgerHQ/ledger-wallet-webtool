import React, { Component } from "react";
import Transport from "@ledgerhq/hw-transport-u2f";
import AppBtc from "@ledgerhq/hw-app-btc";
import bitcoin from "bitcoinjs-lib";

import {
  Button,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar,
  Alert,
  Checkbox
} from "react-bootstrap";
import Networks from "./Networks";
import { findAddress } from "./PathFinderUtils";
import Errors from "./Errors";
import HDAddress from "./HDAddress"



const initialState = {
  done: false,
  running: false,
  error: false,
  path: "49'/1'/0'/0/0",
  message: "",
  hash: Buffer.from(""),
  coin: 0,
  v: undefined,
  s: undefined,
  r: undefined,
  signature: false
};

class MessageSigner extends Component {
  hdAddress = new HDAddress();
  
  constructor(props) {
    super();
    if (localStorage.getItem("LedgerMessageSigner")) {
      this.state = JSON.parse(localStorage.getItem("LedgerMessageSigner"));
    } else {
      this.state = initialState;
    }
  }


  componentWillUnmount() {
    var state = {};
    if (this.state.running) {
      Object.assign(state, this.state, {
        running: false
      });
    } else {
      Object.assign(state, this.state);
    }
    localStorage.setItem("LedgerMessageSigner", JSON.stringify(state));
  }

  reset = () => {
    // change states.
    localStorage.removeItem("LedgerMessageSigner");
    this.setState(initialState);
  };

  onError = e => {
    console.log("on error", e);
    this.reset();
    this.setState({
      error: e.toString()
    });
  };

  handleChangePath = e => {
    this.setState({
      path: e.target.value.replace(/\s/g, ""),
      done: false,
      error: false
    });
  };

  handleChangeMessage = e => {
    let hash = bitcoin.crypto.sha256(e.target.value).toString("hex");
    this.setState({ message: e.target.value, done: false, error: false, hash });
  };

  handleChangeCoin = e => {
    this.setState({ 
      coin: e.target.value, 
      path: `${this.hdAddress.getPath(true, e.target.value, this.state.path)}`,
      done: false, 
      error: false,
      result: [] 
    });
  };

  sign = async e => {
    e.preventDefault();
    this.setState({
      running: true,
      done: false,
      error: false
    });
    let btc;
    try {
      try {
        const devices = await Transport.list();
        if (devices.length === 0) throw "no device";
        const transport = await Transport.open(devices[0]);
        transport.setExchangeTimeout(60000);
        transport.setDebugMode(true);
        btc = new AppBtc(transport);
      } catch (e) {
        throw Errors.u2f;
      }
      try {
        let address = await findAddress(
          this.state.path,
          false,
          this.state.coin
        );
        let result = await btc.signMessageNew(
          this.state.path,
          Buffer.from(this.state.message).toString("hex")
        );
        let v = result["v"] + 27 + 4;
        let signature = Buffer.from(
          v.toString(16) + result["r"] + result["s"],
          "hex"
        );
        signature = signature.toString("base64");
        this.setState({
          address,
          running: false,
          done: true,
          signature
        });
      } catch (e) {
        console.log(e);
        throw e;
      }
    } catch (e) {
      this.onError(e);
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
      <div className="MessageSigner">
        <form onSubmit={this.sign}>
          <FormGroup controlId="MessageSigner">
            <ControlLabel>Currency</ControlLabel>
            <FormControl
              componentClass="select"
              placeholder="select"
              onChange={this.handleChangeCoin}
              disabled={this.state.running || this.state.paused}
            >
              {coinSelect}
            </FormControl>
            <ControlLabel>Path</ControlLabel>
            <FormControl
              type="text"
              value={this.state.path}
              placeholder="ex: 44'/0'/0'/0/0"
              onChange={this.handleChangePath}
              disabled={this.state.running}
            />
            <ControlLabel>Message</ControlLabel>
            <FormControl
              componentClass="textarea"
              value={this.state.message}
              placeholder="message to sign here"
              onChange={this.handleChangeMessage}
              disabled={this.state.running}
            />
            <FormControl.Feedback />
            <br />
            <p>Message hash: {this.state.message && this.state.hash}</p>
            <ButtonToolbar style={{ marginTop: "10px" }}>
              <Button
                bsSize="large"
                onClick={this.sign}
                disabled={this.state.running || this.state.message.length === 0}
              >
                Sign message
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
              <strong>Sign finished</strong>
              <p>
                Signed message with address: {this.state.address}
                <br />
                signature: {this.state.signature}
              </p>
            </Alert>
          )}
        </form>
      </div>
    );
  }
}

export default MessageSigner;
