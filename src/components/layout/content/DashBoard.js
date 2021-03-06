import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import styled from 'styled-components';
import {
  get, size, filter, map, flow, flattenDeep, uniq, compact, isEmpty 
} from 'lodash/fp';
import { HashRouter as Router, NavLink } from 'react-router-dom';

import {
  getSnippets, getStarredCount, getLanguages, getPrivate 
} from 'selectors/snippets';

import {
  baseAppColor, borderColor, headerBgLightest, lightText 
} from 'constants/colors';
import { DEFAULT_SNIPPET_DESCRIPTION } from 'constants/config';

import * as snippetActions from 'actions/snippets';

import Icon from 'components/common/Icon';
import Input from 'components/common/controls/Input';

const DashbordWrapper = styled.div`
  display: grid;
  grid-template-columns: 3fr 3fr 3fr 3fr;
  grid-gap: 30px;
  color: #444;
  height: 100%;
  h3 {
    margin: 9px 0 20px;
    color: ${baseAppColor};
    font-weight: 300;
    font-size: 16px;
  }
`;

const ContainerWithPills = `
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr) ) ;
  color: ${baseAppColor};
  max-height: 50vh;
  overflow: auto;
  font-size: smaller;
  cursor: pointer;
`;

const Box = styled.div`
  background: ${lightText};
  padding: 20px;
  border-radius: 3px;
  box-shadow: 0 0 10px ${borderColor};
`;

const Private = Box.extend`
  grid-column-start: 2;
  grid-column-end: 3;
  grid-row-start: 1;
  grid-row-end: 1;
  
  h3 {
    font-size: 22px;
    margin: 0 0 10px 0;
  }
  
  span {
    font-size: 42px;
    float: right;
    color: ${baseAppColor};
    
    small {
      font-size: 10px;
      float: right;
    }
  }
`;

const Public = Box.extend`
  grid-column-start: 1;
  grid-column-end: 2;
  grid-row-start: 1;
  grid-row-end: 1;
  
  h3 {
    font-size: 22px;
    margin: 0 0 10px 0;
  }
  
  span {
    font-size: 42px;
    float: right;
    color: ${baseAppColor};
    
    small {
      font-size: 10px;
      float: right;
    }
  }
`;

const Starred = Box.extend`
  grid-column-start: 3;
  grid-column-end: 4;
  grid-row-start: 1;
  grid-row-end: 1;
  
  h3 {
    font-size: 22px;
    margin: 0 0 10px 0;
  }
  
  span {
    font-size: 42px;
    float: right;
    color: ${baseAppColor};
    
    small {
      font-size: 10px;
      float: right;
    }
  }
`;

const Untitled = Box.extend`
  grid-column-start: 4;
  grid-column-end: 5;
  grid-row-start: 1;
  grid-row-end: 1;
  
  h3 {
    font-size: 22px;
    margin: 0 0 10px 0;
  }
  
  span {
    font-size: 42px;
    float: right;
    color: ${baseAppColor};
    
    small {
      font-size: 10px;
      float: right;
    }
  }
`;

const Language = Box.extend`
  grid-column-start: 1;
  grid-column-end: 3;
  grid-row-start: 2;
  grid-row-end: 2;
  max-height: 40vh;
  > div {
    ${ContainerWithPills};
    max-height: 35vh;
    overflow: auto;
  }
  
  strong {
    //float: right;
  }
`;

const Stars = Box.extend`
  grid-column-start: 3;
  grid-column-end: 5;
  grid-row-start: 2;
  grid-row-end: 2;
  max-height: 40vh;
  > ul {
    overflow: auto;
    max-height: 35vh;
    list-style-type: none;
    padding: 0;
    margin-top: 0;
    
    li {
      margin: 10px 0;
      position:relative;
      overflow: hidden;
      white-space: nowrap;
      &:after {
      content: "";
      width: 100px;
      height: 50px;
      position: absolute;
      top: 0;
      right: 0;
      background: -webkit-gradient(linear, left top, right top, color-stop(0%, rgba(255, 255, 255, 0)), color-stop(56%, rgba(255, 255, 255, 1)), color-stop(100%, rgba(255, 255, 255, 1)));
      background: -webkit-linear-gradient(left, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 56%, rgba(255, 255, 255, 1) 100%);
    }
    }
  }
`;

const Tags = Box.extend`
  grid-column-start: 1;
  grid-column-end: 5;
  grid-row-start: 3;
  grid-row-end: 3;
  > div {
    ${ContainerWithPills}
  }
`;

const Pill = styled.span`
  border: 1px solid ${headerBgLightest};
  color: ${baseAppColor};
  padding: 5px;
  border-radius: 3px;
  &:hover {
    border: 1px solid ${baseAppColor};
  }
`;

const HeadingWithSearch = styled.span`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
`;

const StyledInput = styled(Input)`
    width: 15vw;
    margin: 0 10px;
`;

const StyledNavLink = styled(NavLink)`
  text-decoration: none;
  color: ${baseAppColor};
`;

export class DashBoard  extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      searchTags: '',
      searchStarred: ''
    };

    this.languagesRef = React.createRef();
    this.starredRef = React.createRef();
    this.tagsRef = React.createRef();
  }

  componentDidMount() {
    this.props.getRateLimit();
  }


  getStarred = () => {
    const starred = filter({ star: true }, this.props.snippets);

    if (!isEmpty(this.state.searchStarred)) {
      return filter((starredSnippet) => {
        const regex = new RegExp(this.state.searchStarred, 'gi');

        return starredSnippet.description.match(regex);
      }, starred);
    }

    return starred;
  };

  getUntitled = () => flow([
    filter({ description: DEFAULT_SNIPPET_DESCRIPTION }),
    size
  ])(this.props.snippets);

  getTags = () => {
    const tags = map('tags', this.props.snippets);

    const tagList = flow([
      flattenDeep,
      uniq,
      compact
    ])(tags);

    if (!isEmpty(this.state.searchTags)) {
      return filter((tag) => {
        const regex = new RegExp(this.state.searchTags, 'gi');

        return tag.match(regex);
      }, tagList.sort());
    }

    return tagList.sort();
  };

  linearGradient = (percentOf) => {
    const percents = (percentOf / size(this.props.snippets)) * 100;

    return {
      background: `linear-gradient(to right, ${headerBgLightest} ${Math.floor(percents)}%, #fff ${Math.floor(percents)}%)`
    };
  };

  searchTags = (value) => this.setState({
    searchTags: value
  });

  searchStarred = (value) => this.setState({
    searchStarred: value
  });

  calculateMargin = (ref) => {
    return ref.current && ref.current.scrollHeight > ref.current.clientHeight ? '20px' : '0';
  };

  renderLanguages = () => map((languageItem) => {
    const language = get('language', languageItem);
    const filesCount = get('size', languageItem);

    return (
      <Pill style={ this.linearGradient(filesCount) }
              key={ language }
              onClick={ () => this.props.searchByLanguages(language) }>
        {language || 'Other'}
        <br/>
        <strong>{filesCount}</strong> <small>files</small>
      </Pill>
    );
  }, this.props.snippetsLanguages);

  renderTags = () => map((tag) => (
    <Pill key={ tag } onClick={ () => this.props.searchByTags(tag) }>
      { tag }
    </Pill>
  ), this.getTags());

  renderStarred = () => map((snippet) => (
    <li key={ snippet.id }>
      <Icon type={ snippet.public ? 'unlock' : 'lock' } color={ baseAppColor }/>
      &nbsp;
      <Router>
        <StyledNavLink exact
                       className="link"
                       activeClassName="selected"
                       title={ snippet.description }
                       to={ `/snippet/${snippet.id}` }>
          { snippet.description }
        </StyledNavLink>
      </Router>
    </li>
  ), this.getStarred());

  render() {
    const { snippets, privateSnippets, starred } = this.props;
    const publicSnippetsCount = size(snippets) - privateSnippets;

    return (
      <DashbordWrapper>
        { isEmpty(this.state.searchTags) && (
          <React.Fragment>
            <Private style={ this.linearGradient(publicSnippetsCount) }>
              <h3>Public</h3>
              <span>
                { publicSnippetsCount }
              </span>
            </Private>

            <Public style={ this.linearGradient(privateSnippets) }>
              <h3>Private</h3>
              <span>
                { privateSnippets }
              </span>
            </Public>

            <Starred style={ this.linearGradient(starred) }>
              <h3>Starred</h3>
              <span>
                { starred }
              </span>
            </Starred>

            <Untitled style={ this.linearGradient(this.getUntitled()) }>
              <h3>Untitled:</h3>
              <span>
                { this.getUntitled() }
              </span>
            </Untitled>
          </React.Fragment>
        ) }

        { isEmpty(this.state.searchTags) && (
          <Language>
            <h3>Languages:</h3>
            <div ref={ this.languagesRef }
                 style={ { paddingRight: this.calculateMargin(this.languagesRef) } }>
              { this.renderLanguages() }
            </div>
          </Language>
        ) }

        { isEmpty(this.state.searchTags) && (
          <Stars>
            <HeadingWithSearch>
              <h3>Starred:</h3>
              <div>
                <Icon type="search" size="22" color={ baseAppColor }/>
                <StyledInput type="search"
                             placeholder="Search starred"
                             onChange={ (event) => this.searchStarred(event.target.value) }/>
              </div>
            </HeadingWithSearch>
            <ul ref={ this.starredRef }
                style={ { paddingRight: this.calculateMargin(this.starredRef) } }>
              { this.renderStarred() }
            </ul>
          </Stars>
        ) }

        <Tags>
          <HeadingWithSearch>
            <h3>Tags:</h3>
            <div>
              <Icon type="search" size="22" color={ baseAppColor }/>
              <StyledInput type="search"
                           placeholder="Search tags"
                           onChange={ (event) => this.searchTags(event.target.value) }/>
            </div>
          </HeadingWithSearch>
          <div ref={ this.tagsRef }
               style={ { paddingRight: this.calculateMargin(this.tagsRef) } }>
            { this.renderTags() }
          </div>
        </Tags>
      </DashbordWrapper>
    );
  }
}

const mapStateToProps = (state) => ({
  snippets: getSnippets(state),
  starred: getStarredCount(state),
  snippetsLanguages: getLanguages(state),
  privateSnippets: getPrivate(state)
});

DashBoard.propTypes = {
  snippets: PropTypes.object,
  starred: PropTypes.number,
  searchByTags: PropTypes.func,
  searchByLanguages: PropTypes.func,
  getRateLimit: PropTypes.func,
  snippetsLanguages: PropTypes.array,
  privateSnippets: PropTypes.number
};

export default connect(mapStateToProps, {
  searchByTags: snippetActions.filterSnippetsByTags,
  searchByLanguages: snippetActions.filterSnippetsByLanguage,
  getRateLimit: snippetActions.getRateLimit
})(DashBoard);
