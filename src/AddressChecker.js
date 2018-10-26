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
import { initialize } from "./PathFinderUtils";
import {
  estimateTransactionSize,
  createPaymentTransaction
} from "./TransactionUtils";
import Errors from "./Errors";
import Transport from "@ledgerhq/hw-transport-u2f";
import AppBtc from "@ledgerhq/hw-app-btc";
import HDAddress from "./HDAddress"

class AddressChecker extends Component {
  hdAddress = new HDAddress();

  constructor(props) {
    super();
    this.state = {
      path: "49'/1'/0'/0/0",
      address: "",
      xpub58: "",
      error: false,
      done: false,
      running: false,
      segwit: false,
      coin: "1"
    };
  }

  onError = e => {
    this.setState({
      error: e.toString(),
      running: false,
      done: false,
      xpub58: ""
    });
  };

  handleChangeSegwit = e => {
    let isSegwit = e.target.checked;
    this.setState({ 
      segwit: isSegwit,
      path: this.hdAddress.getPath(isSegwit, this.state.coin, this.state.path),
    });
  };

  handleChangePath = e => {
    this.setState({ path: e.target.value.replace(/\s/g, "") });
  };

  handleChangeCoin = e => {
    this.setState({ 
      coin: e.target.value,
      path: this.hdAddress.getPath(this.state.segwit, e.target.value, this.state.path),
    });
  };

  check = async () => {
    this.setState({ running: true, done: false, error: false });
    let xpub58;
    try {
      const devices = await Transport.list();
      if (devices.length === 0) throw "no device";
      const transport = await Transport.open(devices[0]);
      transport.setExchangeTimeout(30000);
      transport.setDebugMode(true);
      const btc = new AppBtc(transport);
      xpub58 = await initialize(
        parseInt(this.state.coin, 10),
        this.state.path.split("/")[0],
        this.state.path.split("/")[1],
        this.state.path.split("/")[2],
        this.state.segwit
      );

      await btc.getWalletPublicKey(this.state.path, true, this.state.segwit);
    } catch (e) {
    } finally {
      if (xpub58) {
        this.setState({ running: false, done: true, xpub58: xpub58 });
      } else {
        this.setState({ running: false, done: false });
        this.onError("Your device seems unavailable");
      }
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
      <div className="AddressChecker">
        {this.state.error && (
          <Alert bsStyle="danger">
            <strong>Operation aborted</strong>
            <p style={{ wordWrap: "break-word" }}>{this.state.error}</p>
          </Alert>
        )}
        {this.state.done && (
          <Alert bsStyle="success">
            <strong>XPUB</strong>
            <p style={{ wordWrap: "break-word" }}>{this.state.xpub58}</p>
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
        <ControlLabel>Path</ControlLabel>
        <FormControl
          type="text"
          value={this.state.path}
          disabled={this.state.running}
          onChange={this.handleChangePath}
        />
        <Checkbox
          onChange={this.handleChangeSegwit}
          checked={this.state.segwit}
          disabled={this.state.running}
        >
          Segwit
        </Checkbox>
        <ButtonToolbar>
          <Button
            bsStyle="primary"
            bsSize="large"
            disabled={this.state.running}
            onClick={this.check}
          >
            Check path
          </Button>
        </ButtonToolbar>
      </div>
    );
  }
}

export default AddressChecker;
