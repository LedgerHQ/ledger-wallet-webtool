import React, { Component } from "react";
import elliptic from "elliptic";
import { RippleAPI } from "ripple-lib";
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
import Inspector from "react-inspector";

const Secp256k1 = elliptic.ec("secp256k1");

const initialState = {
  amount: "",
  tag: "",
  done: false,
  running: false,
  error: false,
  address: "",
  privateKey: "",
  fees: "10",
  recipient: "",
  node: "wss://s1.ripple.com",
  prepared: false
};

class RippleRecoverer extends Component {
  constructor(props) {
    super();
    this.state = initialState;
  }

  api = {};
  connect = async node => {
    this.api = new RippleAPI({
      server: node
    });

    this.api.connect();
    return new Promise((resolve, reject) => {
      this.api.on("error", (errorCode, errorMessage) => {
        console.log(errorCode + ": " + errorMessage);
        this.api = undefined;
        reject(errorMessage);
      });
      this.api.on("connected", () => {
        console.log("connected");
        resolve(this.api);
      });
      this.api.on("disconnected", code => {
        console.log("disconnected, code:", code);
        reject("disconnected");
      });
    });
  };

  onError = e => {
    console.log("on error", e);
    this.setState({
      error: e.toString(),
      running: false,
      done: false
    });
  };

  reset = () => {
    this.setState(initialState);
  };

  handleChangeNode = e => {
    this.setState({ node: e.target.value, done: false, error: false });
  };

  handleChangeAddress = e => {
    this.setState({ address: e.target.value, done: false, error: false });
  };

  handleChangePrivateKey = e => {
    this.setState({ privateKey: e.target.value, done: false, error: false });
  };

  handleChangeFees = e => {
    this.setState({ fees: e.target.value, done: false, error: false });
  };

  handleChangeRecipient = e => {
    this.setState({ recipient: e.target.value, done: false, error: false });
  };

  handleChangeAmount = e => {
    this.setState({ amount: e.target.value, done: false, error: false });
  };

  handleChangeTag = e => {
    this.setState({ tag: e.target.value, done: false, error: false });
  };

  prepare = async () => {
    this.setState({
      error: false,
      prepared: false,
      running: true,
      done: false
    });
    let api = await this.connect(this.state.node);
    let balance = await api.getBalances(this.state.address, {
      currency: "XRP"
    });
    this.setState({
      balance: balance[0].value,
      prepared: true,
      running: false
    });
  };

  send = async () => {
    this.setState({ error: false, running: true, done: false });
    try {
      let publicKey = Secp256k1.keyFromPrivate(this.state.privateKey)
        .getPublic()
        .encodeCompressed("hex");
      if (!this.api.preparePayment) {
        await this.connect(this.state.node);
      }
      let prepared = await this.api.preparePayment(
        this.state.address,
        {
          source: {
            address: this.state.address,
            maxAmount: {
              value: (this.state.amount / 10 ** 6).toFixed(6),
              currency: "XRP"
            }
          },
          destination: {
            address: this.state.recipient,
            amount: {
              value: (this.state.amount / 10 ** 6).toFixed(6),
              currency: "XRP"
            },
            tag: this.state.tag ? parseInt(this.state.tag, 10) : undefined
          }
        },
        {
          fee: (this.state.fees / 10 ** 6).toFixed(6)
        }
      );
      var signed = this.api.sign(prepared.txJSON, {
        privateKey: this.state.privateKey.toUpperCase(),
        publicKey: publicKey.toUpperCase()
      });
      const val = await this.api.submit(signed.signedTransaction);
      this.setState({ done: val, running: false });
    } catch (e) {
      this.onError(e);
    }
  };

  render() {
    return (
      <div className="RippleRecoverer">
        <form onSubmit={this.prepare}>
          <FormGroup controlId="RippleRecoverer">
            <ControlLabel>Your XRP address</ControlLabel>
            <FormControl
              type="text"
              value={this.state.address}
              onChange={this.handleChangeAddress}
              disabled={this.state.running || this.state.prepared}
            />
            <ControlLabel>Rippled node to use</ControlLabel>
            <FormControl
              type="text"
              value={this.state.node}
              placeholder="Enter the rippled node you want to connect to"
              onChange={this.handleChangeNode}
              disabled={this.state.running || this.state.prepared}
            />
          </FormGroup>
          <ButtonToolbar >
            <Button bsStyle="primary" bsSize="large" onClick={this.prepare}>
              Recover Balance
            </Button>
            <Button
              bsSize="large"
              disabled={this.state.running}
              onClick={this.reset}
            >
              Reset
            </Button>
          </ButtonToolbar>
        </form>

        {this.state.prepared && (
          <form onSubmit={this.send} >
            <FormGroup controlId="RippleRecovererSend">
              <Alert bsStyle="success">
                <strong>Funds found!</strong>
                <p>
                  The address {this.state.address} has {this.state.balance} XRP
                  on it.
                </p>
              </Alert>
              <ControlLabel>The private key of this address</ControlLabel>
              <FormControl
                type="text"
                placeholder="Enter the private key in hexadecimal format (without prefix)"
                value={this.state.privateKey}
                onChange={this.handleChangePrivateKey}
                disabled={this.state.running}
              />
              <ControlLabel>Fees in drops (1 drop = 0.000001 XRP)</ControlLabel>
              <FormControl
                type="number"
                value={this.state.fees}
                onChange={this.handleChangeFees}
                disabled={this.state.running}
              />
              <ControlLabel>
                Amount in drops (1 drop = 0.000001 XRP)
              </ControlLabel>
              <FormControl
                type="number"
                placeholder="Enter the amount to send (remember 20XRP must stay on the account after fees and payment)"
                value={this.state.amount}
                onChange={this.handleChangeAmount}
                disabled={this.state.running}
              />
              <ControlLabel>Recipient's address</ControlLabel>
              <FormControl
                type="text"
                value={this.state.recipient}
                onChange={this.handleChangeRecipient}
                disabled={this.state.running}
              />
              <ControlLabel>Destination Tag</ControlLabel>
              <FormControl
                type="number"
                placeholder="This can remain empty if not needed"
                value={this.state.tag}
                onChange={this.handleChangeTag}
                disabled={this.state.running}
              />
            </FormGroup>
            <ButtonToolbar >
              <Button bsStyle="primary" bsSize="large" onClick={this.send}>
                Send
              </Button>
            </ButtonToolbar>
          </form>
        )}
        {this.state.error && (
          <Alert bsStyle="danger">
            <strong>Operation aborted</strong>
            <p>{this.state.error}</p>
          </Alert>
        )}
        {this.state.done && (
          <Alert bsStyle="success">
            <p>Transaction sent with response:</p>
            <Inspector
              data={this.state.done}
              expandLevel={2}
              style={{
                fontSize: "20px"
              }}
            />
          </Alert>
        )}
      </div>
    );
  }
}

export default RippleRecoverer;
