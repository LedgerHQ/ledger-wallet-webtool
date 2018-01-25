import React, { Component } from "react";
import {
  Button,
  Checkbox,
  form,
  FormControl,
  FormGroup,
  ControlLabel,
  ButtonToolbar
} from "react-bootstrap";
import Networks from "./Networks";

class FundsTransfer extends Component {
  constructor(props) {
    super();
    this.state = {
      done: false,
      running: false,
      prepared: false,
      destination: "",
      result: {},
      coin: 0,
      segwit: false,
      fees: 0,
      amount: 0,
      balance: 0,
      path: "",
      sent: false
    };
  }

  handleChangeDestination = e => {
    this.setState({ destination: e.target.value });
  };

  handleChangePath = e => {
    this.setState({ path: e.target.value });
  };

  handleChangeSegwit = e => {
    this.setState({ segwit: !this.state.segwit });
  };

  handleChangeFees = e => {
    this.setState({ fees: e.target.value });
  };

  handleChangeCoin = e => {
    this.setState({ coin: e.target.value });
  };

  prepare = () => {
    this.setState({ running: true, prepared: false });
    setTimeout(() => {
      this.onPrepared();
    }, 1000);
  };

  onPrepared = () => {
    this.setState({ prepared: true, running: false });
  };

  send = () => {
    this.setState({ running: true });
    setTimeout(() => {
      this.onSent();
    }, 1000);
  };

  onSent = () => {
    this.setState({ prepared: false, running: false, sent: true });
  };

  render() {
    var coinSelect = [];
    for (var coin in Networks) {
      if (Networks.hasOwnProperty(coin)) {
        coinSelect.push(<option value={coin}>{Networks[coin].name}</option>);
      }
    }

    return (
      <div className="FundsTransfer">
        <form>
          <FormGroup controlId="FundsTransfer">
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
              disabled={this.state.running || this.state.prepared}
            >
              Segwit
            </Checkbox>
            <ControlLabel>Path</ControlLabel>
            <FormControl
              type="text"
              value={this.state.path}
              placeholder="44'/0'/0'/0/0"
              onChange={this.handleChangePath}
              disabled={this.state.running}
            />
            <FormControl.Feedback />
          </FormGroup>
        </form>
        <ButtonToolbar>
          <Button
            bsSize="large"
            disabled={this.state.running}
            onClick={this.prepare}
          >
            Recover Path
          </Button>
        </ButtonToolbar>

        {this.state.prepared && (
          <div className="prepared">
            <form>
              <ControlLabel>Destination</ControlLabel>
              <FormControl
                type="text"
                value={this.state.destination}
                placeholder="Address to send to"
                onChange={this.handleChangeDestination}
                disabled={this.state.running}
              />
              <ControlLabel>Fees</ControlLabel>
              <FormControl
                type="text"
                value={this.state.fees}
                onChange={this.handleChangeFees}
                disabled={this.state.running}
              />
            </form>
            <div className="feesIndication">"SLOW / NORMAL / FAST"</div>
            <ButtonToolbar>
              <Button bsStyle="primary" bsSize="large" onClick={this.send}>
                Send
              </Button>
            </ButtonToolbar>
          </div>
        )}
      </div>
    );
  }
}

export default FundsTransfer;
