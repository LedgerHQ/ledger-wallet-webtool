import React, { Component } from "react";
import { Button } from "react-bootstrap";
class Home extends Component {
  reset = () => {
    localStorage.removeItem("LedgerPathFinder");
    localStorage.removeItem("LedgerMessageSigner");
    localStorage.removeItem("LedgerBalanceChecker");
    localStorage.removeItem("LedgerMessageChecker");
  };
  render() {
    return (
      <div className="Home">
        <p>
          Please follow the instructions provided by our support. Your browser
          needs to support u2f (Google Chrome or Chromium is recommended)
        </p>
        <p />
        <Button bsSize="large" onClick={this.reset}>
          Erase cache data
        </Button>
      </div>
    );
  }
}

export default Home;
