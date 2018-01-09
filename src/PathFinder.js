import React, { Component } from 'react';
import { Button, Checkbox, form, FormControl, FormGroup, ControlLabel, ButtonToolbar } from 'react-bootstrap';

import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import findPath from './PathFinderUtils'
import _ from 'lodash'

class PathFinder extends Component {

  constructor(props) {
    super()
    if (localStorage.getItem('LedgerPathFinder')) {
      this.state = JSON.parse(localStorage.getItem('LedgerPathFinder'))
    } else {
      this.state = {
        done: false,
        paused: false,
        running: false,
        batchSize: 10,
        account: 0,
        address: '',
        result: [],
        coin: 0,
        index: 0,
        segwit: false,
      }
    }
  }

  componentWillUnmount() {
    this.terminate()
    var state = {}
    Object.assign(state, this.state, {running: false, paused: true})
    localStorage.setItem('LedgerPathFinder',JSON.stringify(state))
  }

  handleChangeAddress = (e) => {
    this.setState({ address: e.target.value });
  }

  handleChangeAccount = (e) => {
    this.setState({ account: e.target.value });
  }

  handleChangeIndex = (e) => {
    this.setState({ index: e.target.value });
  }

  handleChangeCoin = (e) => {
    this.setState({ coin: e.target.value });
  }

  handleChangeSegwit = (e) => {
    this.setState({ segwit: !this.state.segwit });
  }

  onUpdate = (e) => {
    this.setState({
      index: e[e.length - 1].index + 1,
      result: this.state.result.concat(e)
    })
  }

  onDone = (e) => {
    this.stop()
    this.setState({ done: true })
  }

  onError = (e) => {
    this.stop()
    alert(e)
  }

  reset = () => {
    this.setState({ account: 0, address: '', index: 0, result: [], paused: false, done: false })
    localStorage.removeItem('LedgerPathFinder')
  }

  start = () => {
    this.setState({ running: true, paused: false })
    this.terminate = findPath(_.pick(this.state, ["address", 'account', 'index', 'coin', 'segwit', 'batchSize']), this.onUpdate, this.onDone, this.onError)
  }

  stop = () => {
    this.terminate()
    this.setState({ running: false, paused: true })
  }

  save = () => {
    localStorage.setItem('LedgerPathFinder', JSON.stringify(this.state))
  }

  render() {
    var startName = "Start"
    if (this.state.paused) {
      startName = "Continue"
    }
    var launchButton = (
      <Button bsStyle="primary" bsSize="large" onClick={this.start}>{startName}</Button>
    )
    if (this.state.running || this.state.done) {
      launchButton = undefined
    }


    return (
      <div className="Finder">
        This is Path finder
        <form>
          <FormGroup
            controlId="pathSearch"
          >
            <ControlLabel>Coin</ControlLabel>
            <FormControl
              type="text"
              value={this.state.coin}
              placeholder="Bitcoin = 0"
              onChange={this.handleChangeCoin}
              disabled={this.state.running || this.state.paused}
            />
            <ControlLabel>Address</ControlLabel>
            <FormControl
              type="text"
              value={this.state.address}
              placeholder="Address (leave empty to list all addresses)"
              onChange={this.handleChangeAddress}
              disabled={this.state.running || this.state.paused}
            />
            <ControlLabel>Account number</ControlLabel>
            <FormControl
              type="text"
              value={this.state.account}
              placeholder="Account number (default = 0)"
              onChange={this.handleChangeAccount}
              disabled={this.state.running || this.state.paused}
            />
            <ControlLabel>Start index</ControlLabel>
            <FormControl
              type="text"
              value={this.state.index}
              placeholder="Start index (default = 0)"
              onChange={this.handleChangeIndex}
              disabled={this.state.running || this.state.paused}
            />
            <Checkbox onChange={this.handleChangeSegwit} disabled={this.state.running || this.state.paused}>
              Segwit
            </Checkbox>
            <FormControl.Feedback />
          </FormGroup>
        </form>
        <ButtonToolbar>
          {launchButton}
          {this.state.running &&
            <Button bsStyle="primary" bsSize="large" onClick={this.stop}>Pause</Button>
          }
          <Button bsSize="large" disabled={this.state.running} onClick={this.reset}>reset</Button>
        </ButtonToolbar>
        {this.state.done && this.state.address.length > 0 &&
          <div className="result">The corresponding path is: {this.state.result[this.state.result.length-1].path}</div>
        }
        <div className="progress">Addresses scanned: {this.state.result.length}</div>
        <BootstrapTable height='400' data={this.state.result} striped={true} hover={true} pagination exportCSV>
          <TableHeaderColumn dataField="path">Derivation path</TableHeaderColumn>
          <TableHeaderColumn dataField="address" isKey={true}>Address</TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

export default PathFinder;