import { Navbar, Nav, NavItem } from "react-bootstrap";
import React, { Component } from "react";
import Home from "./Home";
import PathFinder from "./PathFinder";
import FundsTransfer from "./FundsTransfer";
import AddressChecker from "./AddressChecker";
import TxChecker from "./TxChecker";
import BalanceChecker from "./BalanceChecker";
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
      case "fundsTransfer":
        content = <FundsTransfer />;
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
              onClick={() => this.handleNav("fundsTransfer")}
            >
              Transfer Funds
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
          </Nav>
        </Navbar>
        <div className="Content">{content}</div>
      </div>
    );
  }
}

export default App;
