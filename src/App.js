import { Navbar, Nav, NavItem } from "react-bootstrap";
import React, { Component } from "react";
import Home from "./Home";
import PathFinder from "./PathFinder";
import FundsRecoverer from "./FundsRecoverer";
import AddressChecker from "./AddressChecker";
import TxChecker from "./TxChecker";
import BalanceChecker from "./BalanceChecker";
import MessageSigner from "./MessageSigner";
import MessageChecker from "./MessageChecker";
import RippleRecoverer from "./RippleRecoverer";
import RippleTransferer from "./RippleTransferer";
import "./App.css";

class App extends Component {
  constructor() {
    super();
    this.state = {
      nav: "home"
    };
  }

  handleNav = e => {
    this.setState({ nav: e });
  };
  render() {
    var content = {};
    switch (this.state.nav) {
      case "home":
        content = <Home />;
        break;
      case "pathFinder":
        content = <PathFinder />;
        break;
      case "fundsRecoverer":
        content = <FundsRecoverer />;
        break;
      case "addressChecker":
        content = <AddressChecker />;
        break;
      case "txChecker":
        content = <TxChecker />;
        break;
      case "balanceChecker":
        content = <BalanceChecker />;
        break;
      case "messageSigner":
        content = <MessageSigner />;
        break;
      case "messageChecker":
        content = <MessageChecker />;
        break;
      case "rippleRecoverer":
        content = <RippleRecoverer />;
        break;
      case "rippleTransferer":
        content = <RippleTransferer />;
        break;
      default:
        content = <Home />;
        break;
    }
    return (
      <div className="App">
        <Navbar>
          <Navbar.Header>
            <Navbar.Brand>
              <a href="#" onClick={() => this.handleNav("home")}>
                Ledger Web Tool
              </a>
            </Navbar.Brand>
          </Navbar.Header>
          <Nav>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("pathFinder")}
            >
              Find Path
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("fundsRecoverer")}
            >
              Recover Funds
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("addressChecker")}
            >
              Check Address
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("txChecker")}
            >
              Check Tx
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("balanceChecker")}
            >
              Check Balances
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("messageSigner")}
            >
              Sign Message
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("messageChecker")}
            >
              Check Message
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("rippleRecoverer")}
            >
              Recover XRP without device
            </NavItem>
            <NavItem
              eventKey={1}
              href="#"
              onClick={() => this.handleNav("rippleTransferer")}
            >
              Temporary XRP wallet
            </NavItem>
          </Nav>
        </Navbar>
        <div className="Content">{content}</div>
      </div>
    );
  }
}

export default App;
