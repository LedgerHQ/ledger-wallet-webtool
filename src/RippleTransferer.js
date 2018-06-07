import React, { Component } from 'react';
import { RippleAPI } from 'ripple-lib';
import Xrp from '@ledgerhq/hw-app-xrp';
import Transport from '@ledgerhq/hw-transport-u2f';
import BinaryCodec from 'ripple-binary-codec';

import {
  Button,
  FormControl,
  ControlLabel,
  ButtonToolbar,
  Alert,
  FormGroup
} from 'react-bootstrap';
import Errors from './Errors';


class RippleTransferer extends Component {
  constructor() {
    super();
    this.state = {
      node: 'wss://s1.ripple.com',
      done: false,
      running: false,
      address: '',
      prepared: false,
      recipient: '',
      error: false,
      fees: 10,
      empty: false,
      balance: 0,
      path: '44\'/144\'/0\'/0\'',
      tag: false,
      amount: ""
    };
  }


  onError = (e) => {
    this.setState({
      error: e.toString(),
      running: false,
      done: false,
    });
  };

  onSent = async (tx) => {
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
      error,
    });
  };

  handleChangePath = (e) => {
    this.setState({ path: e.target.value.replace(/\s/g, ''), done: false });
  };

  handleChangeFees = (e) => {
    this.setState({ fees: e.target.value });
  };

  handleChangeAmount = (e) => {
    const amount = e.target.value.match(/^([0-9]*)?[.,]?([0-9]{0,6})?$/)
    if(!!amount && amount[0]) {
      this.setState({ amount: amount[0].replace(/,/g,'.')});
    } else if(e.target.value==="") {
      this.setState({ amount: ""});
    }
  };

  handleChangeRecipient = (e) => {
    this.setState({ recipient: e.target.value.replace(/\s/g, '') });
  };


  handleChangeTag = (e) => {
    this.setState({ tag: e.target.value });
  };

  prepare = async (e) => {
    e.preventDefault();
    this.setState({
      running: true,
      prepared: false,
      done: false,
      empty: false,
      error: false,
    });
    let address;
    try {
      const devices = await Transport.list();
      if (devices.length === 0) throw "no device";
      const transport = await Transport.open(devices[0]);
      transport.setExchangeTimeout(60000);
      transport.setDebugMode(true);
      this.xrp = new Xrp(transport);
      const { address: xrpAddress } = await this.xrp.getAddress(this.state.path, false);
      address = xrpAddress
      console.log('address', address)
      this.api = new RippleAPI({
        server: this.state.node,
      });
      this.api.on('error', (errorCode, errorMessage) => {
        console.log(errorCode + ': ' + errorMessage);
      });
    } catch (err) {
      this.onError(Errors.u2f);
    }
    try {
      await this.api.connect();
    } catch (err) {
      this.onError(Errors.rippleLib)
    }
    try {
      console.log("here")
      const res = await this.api.getAccountInfo(
      address
      );
      console.log('account info',res);
      this.setState({
        balance: res.xrpBalance,
        address,
        prepared: true,
        running: false,
      });
    } catch (e) {
      this.setState({
        address,
        empty: true,
        prepared: true,
        running: false
      })
    }
  };

  verify = async () => {
    this.setState({ running: true, done: false, error: false });
    await this.xrp.getAddress(this.state.path, true);
    this.setState({ running: false, done: false, error: false });
  }


  send = async () => {
    this.setState({ running: true, done: false, error: false });
    const amount = this.state.amount;
    const payment = {
      source: {
        address: this.state.address,
        maxAmount: {
          value: this.state.amount,
          currency: "XRP"
        },
      },
      destination: {
        address: this.state.recipient,
        amount: {
          value: this.state.amount,
          currency: "XRP"
        },
        tag: this.state.tag ? parseInt(this.state.tag, 10) : undefined,
      },
    };
    const instructions = {
      fee: (this.state.fees / 10 ** 6).toFixed(6)
    };
    let localProgress = "rippleLib"
    try {
      console.log("tx", payment)
      const prepared = await this.api.preparePayment(this.state.address, payment, instructions);
      const tx = JSON.parse(prepared.txJSON);
      console.log('prepared', tx);
      localProgress = "u2f"
      const { publicKey } = await this.xrp.getAddress(this.state.path);
      tx.SigningPubKey = publicKey.toUpperCase();
      const rawTxHex = BinaryCodec.encode(tx).toUpperCase();
      tx.TxnSignature = (await this.xrp.signTransaction(this.state.path, rawTxHex)).toUpperCase();
      const signed = BinaryCodec.encode(tx).toUpperCase();
      console.log('rawTxHex, signed', rawTxHex, signed);
      localProgress = "rippleLib"
      const res = await this.api.submit(signed);
      this.setState({
        running: false,
        done: res,
      });
    } catch (err) {
      console.log(err)
      switch(localProgress) {
        case "rippleLib":
          this.onError(err.errorMessage);
          break;
        default:
          this.onError(Errors[localProgress]);
      }
    }
  };


  reset = () => {
    // change states.
    this.setState({
      prepared: false,
      running: false,
      done: false,
      empty: false,
      error: false
    });
  };

  render = () => (
    <div className="RippleTransferer">
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
            The address {this.state.address} has no{' '}
            XRP on it.{' '}
          </p>
        </Alert>
      )}
      
      <form onSubmit={this.prepare} />
          <FormGroup controlId="RippleRecoverer">
            <ControlLabel>Derivation path</ControlLabel>
            <FormControl
              type="text"
              value={this.state.path}
              onChange={this.handleChangePath}
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
          <ButtonToolbar style={{ marginTop: "10px" }}>
            {!this.state.prepared && (
            <Button bsStyle="primary" bsSize="large" onClick={this.prepare} disabled={this.state.running}>
              Query my account
            </Button>
            )}
            {this.state.prepared && (
            <Button bsStyle="primary" bsSize="large" onClick={this.verify} disabled={this.state.running}>
              Verify address on screen
            </Button>
            )}
            <Button
              bsSize="large"
              disabled={this.state.running}
              onClick={this.reset}
            >
              Reset
            </Button>
          </ButtonToolbar>
      {this.state.prepared && !this.state.empty && (
        <form onSubmit={this.send} style={{ marginTop: "10px" }}>
        <FormGroup controlId="RippleRecovererSend">
          <Alert bsStyle="success">
            <strong>Funds found!</strong>
            <p>
              The address {this.state.address} has {this.state.balance} XRP
              on it.
            </p>
          </Alert>
          <ControlLabel>Recipient's address</ControlLabel>
          <FormControl
            type="text"
            value={this.state.recipient}
            onChange={this.handleChangeRecipient}
            disabled={this.state.running}
          />
          <ControlLabel>
            Amount in XRP
          </ControlLabel>
          <FormControl
            type="text"
            placeholder="Enter the amount to send (remember 20XRP must stay on the account after fees and payment)"
            value={this.state.amount}
            onChange={this.handleChangeAmount}
            disabled={this.state.running}
          />
          <ControlLabel>Fees in drops (1 drop = 0.000001 XRP)</ControlLabel>
          <FormControl
            type="number"
            placeholder="10 is the standard fees"
            value={this.state.fees}
            onChange={this.handleChangeFees}
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
        <ButtonToolbar style={{ marginTop: "10px" }}>
          <Button bsStyle="primary" bsSize="large" onClick={this.send} disabled={this.state.running || !parseFloat(this.state.amount)}>
            Send
          </Button>
        </ButtonToolbar>
      </form>
    )}
    <br/>
    {this.state.done && (
        <Alert bsStyle="warning">
          <strong>Information</strong>
          
          <p>{this.state.done.resultMessage}</p>

          <p>You can check the transaction state <a href={`https://xrpcharts.ripple.com/#/graph/${this.state.address}`} >here</a></p>
        </Alert>
      )}
    </div>
  )
}

export default RippleTransferer;
