import React, { Component } from 'react';
import {Button, Checkbox, form, FormControl, FormGroup, ControlLabel, ButtonToolbar } from 'react-bootstrap';

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
        account: 0,
        address: '',
        result: [],
        coin: 0,
        index: 0,
        segwit: false,
      }
    }
    this.handleChangeAccount = this.handleChangeAccount.bind(this)
    this.handleChangeAddress = this.handleChangeAddress.bind(this)
    this.start = this.start.bind(this)
    this.stop = this.stop.bind(this)

    this.reset = this.reset.bind(this)
    this.handleChangeCoin = this.handleChangeCoin.bind(this)
    this.handleChangeIndex = this.handleChangeIndex.bind(this)
    this.handleChangeSegwit = this.handleChangeSegwit.bind(this)
    this.onUpdate = this.onUpdate.bind(this)
    this.onDone = this.onDone.bind(this)
    this.onError = this.onError.bind(this)
  }

  componentWillMount() {
  }

  handleChangeAddress(e) {
    this.setState({ address: e.target.value });
  }

  handleChangeAccount(e) {
    this.setState({ account: e.target.value });
  }

  handleChangeIndex(e) {
    this.setState({ index: e.target.value });
  }

  handleChangeCoin(e) {
    this.setState({ coin: e.target.value });
  }

  handleChangeSegwit(e) {
    this.setState({ segwit: !this.state.segwit });
  }

  onUpdate(e) {
    this.setState({
      index: e.index,
      result: this.state.result.concat([{key: e.index, path: e.path, address: e.address}])
    })
  }

  onDone(e) {
    this.stop()
    this.setState({done: true})
    alert("success")
  }

  onError(e) {
    this.stop()
    alert(e)
  }

  reset() {
    this.setState({account: 0, address: '', index: 0, result: [], paused: false})
  }

  start() {
    this.setState({running: true, paused: false})
    this.terminate = findPath(_.pick(this.state,["address", 'account', 'index', 'coin', 'segwit']),this.onUpdate, this.onDone, this.onError)
  }

  stop() {
    this.terminate()
    this.setState({running: false, paused:true})
  }

  save() {
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
    if (this.state.running) {
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
              disabled={this.state.running|| this.state.paused}
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
              disabled={this.state.running|| this.state.paused}
            />
            <ControlLabel>Start index</ControlLabel>
            <FormControl
              type="text"
              value={this.state.index}
              placeholder="Start index (default = 0)"
              onChange={this.handleChangeIndex}
              disabled={this.state.running|| this.state.paused}
            />
            <Checkbox onChange={this.handleChangeSegwit} disabled={this.state.running|| this.state.paused}>
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
        <div className="progress">Addresses scanned: {this.state.result.length}</div>
        <BootstrapTable data={this.state.result} striped={true} hover={true} pagination exportCSV>
          <TableHeaderColumn dataField="path">Derivation path</TableHeaderColumn>
          <TableHeaderColumn dataField="address" isKey={true}>Address</TableHeaderColumn>
        </BootstrapTable>
      </div>
    );
  }
}

export default PathFinder;