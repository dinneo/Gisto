import React from 'react';
import PropTypes from 'prop-types';
import styled, { injectGlobal } from 'styled-components';
import * as Mousetrap from 'mousetrap';
import { withRouter } from 'react-router-dom';

import { baseAppColor } from 'constants/colors';
import { isElectron } from 'utils/electron';

import SuperSearch from 'components/layout/SuperSearch';

// eslint-disable-next-line no-unused-expressions
injectGlobal`
  ::-webkit-scrollbar {
    width: 5px;
    margin: 0 20px 0 0;
  }
  
  ::-webkit-scrollbar-track {
    background: #fff;
  }
  
  ::-webkit-scrollbar-thumb {
    background: ${baseAppColor};
  }
`;

const AppWrapper = styled.div`
  display: flex;
  background: #fff;
  flex-direction: column;
  justify-content: flex-start;
  height: 100vh;
  color: ${baseAppColor};
`;

export class App  extends React.Component {
  state = {
    showSuperSearch: false
  };

  componentDidMount() {
    Mousetrap.bind(['shift shift', 'ctrl+f'], this.toggleSuperSesrch);

    // Disallow to drop files
    document.addEventListener('dragover', (event) => event.preventDefault());
    document.addEventListener('dragenter', (event) => event.preventDefault());
    document.addEventListener('dragleave', (event) => event.preventDefault());
    document.addEventListener('drop', (event) => event.preventDefault());

    if (isElectron) {
      const { ipcRenderer } = require('electron');

      // Route if 'routeTo' event sent from main
      ipcRenderer.on('routeTo', (event, routeTo) => {
        this.props.history.push(routeTo);
      });
    }
  }

  componentWillUnmount() {
    Mousetrap.unbind(['shift shift', 'ctrl+f'], this.toggleSuperSesrch);
  }

  toggleSuperSesrch = () => {
    this.setState((prevState) => ({
      showSuperSearch: !prevState.showSuperSearch
    }));
  };

  render() {
    return (
      <AppWrapper>
        { this.props.children }
        { this.state.showSuperSearch && (
          <SuperSearch toggleSuperSesrch={ () => this.toggleSuperSesrch() }/>
        ) }
      </AppWrapper>
    );
  }
}

App.propTypes = {
  children: PropTypes.node,
  history: PropTypes.object
};

export default withRouter(App);
