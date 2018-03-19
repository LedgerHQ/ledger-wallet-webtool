import React, { Component } from "react";
import bitcoin from "bitcoinjs-lib";
import message from "bitcoinjs-message";
import {
  Button,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar,
  Alert
} from "react-bootstrap";
import Errors from "./Errors";

const initialState = {
  done: false,
  running: false,
  coin: "1",
  error: false,
  message: "",
  hash: Buffer.from(""),
  coin: 0,
  segwit: false,
  v: undefined,
  s: undefined,
  r: undefined,
  address: ""
};

class MessageChecker extends Component {
  constructor(props) {
    super();
    if (localStorage.getItem("LedgerMessageChecker")) {
      this.state = JSON.parse(localStorage.getItem("LedgerMessageChecker"));
    } else {
      this.state = initialState;
    }
  }

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value, done: false, result: [] });
  };

  componentWillUnmount() {
    var state = {};
    if (this.state.running) {
      Object.assign(state, this.state, {
        running: false
      });
    } else {
      Object.assign(state, this.state);
    }
    localStorage.setItem("LedgerMessageChecker", JSON.stringify(state));
  }

  onError = e => {
    console.log("on error", e);
    this.setState({
      error: e.toString(),
      running: false,
      done: false
    });
  };

  handleChangeMessage = e => {
    let hash = bitcoin.crypto.sha256(e.target.value).toString("hex");
    this.setState({ message: e.target.value, done: false, error: false, hash });
  };

  handleChangeAddress = e => {
    this.setState({ address: e.target.value, done: false, error: false });
  };

  handleChangeSignature = e => {
    this.setState({ signature: e.target.value, done: false, error: false });
  };

  verify = async e => {
    this.setState({
      running: true,
      done: false,
      error: false
    });
    try {
      let result = message.verify(
        this.state.message,
        this.state.address,
        this.state.signature
      );
      this.setState({
        done: true,
        running: false,
        valid: result
      });
    } catch (e) {
      this.onError(e);
    }
  };

  render() {
    return (
      <div className="MessageChecker">
        <form onSubmit={this.verify}>
          <FormGroup controlId="MessageChecker">
            <ControlLabel>Address</ControlLabel>
            <FormControl
              type="text"
              value={this.state.address}
              placeholder=""
              onChange={this.handleChangeAddress}
              disabled={this.state.running}
            />
            <ControlLabel>Signature</ControlLabel>
            <FormControl
              type="text"
              value={this.state.signature}
              placeholder=""
              onChange={this.handleChangeSignature}
              disabled={this.state.running}
            />
            <ControlLabel>Message</ControlLabel>
            <FormControl
              componentClass="textarea"
              value={this.state.message}
              placeholder="message to check here"
              onChange={this.handleChangeMessage}
              disabled={this.state.running}
            />
            <FormControl.Feedback />
            <br />
            <p>Message hash: {this.state.message && this.state.hash}</p>
            <ButtonToolbar style={{ marginTop: "10px" }}>
              <Button
                bsSize="large"
                onClick={this.verify}
                disabled={this.state.running || this.state.message.length === 0}
              >
                Verify signature
              </Button>
            </ButtonToolbar>
          </FormGroup>
          {this.state.error && (
            <Alert bsStyle="danger">
              <strong>Operation aborted</strong>
              <p>{this.state.error}</p>
            </Alert>
          )}
          {this.state.done &&
            this.state.valid && (
              <Alert bsStyle="success">
                <p>Signature is valid</p>
              </Alert>
            )}
          {this.state.done &&
            !this.state.valid && (
              <Alert bsStyle="danger">
                <p>Signature is invalid</p>
              </Alert>
            )}
        </form>
      </div>
    );
  }
}

export default MessageChecker;
