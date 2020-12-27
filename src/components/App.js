import '../style/app.scss'
import React from 'react'
import Editor from './Editor'
import {
  setCSSVar,
  getLanguageFromFileName,
  base64DecodeUnicode
} from '../scripts/util'
import PropTypes from 'prop-types'
import ExplorerPanel from './ExplorerPanel'
import GitHubAPI from '../scripts/github-api'
import { Tab, TabView } from './Tabs'
import debounce from 'lodash/debounce'
import LoadingOverlay from './LoadingOverlay'
import FileRenderer from './FileRenderer'
import ResizePanel from './ResizePanel'

// Don't allow API requests to files that meet/exceed this size
// (in bytes) to avoid network strain and long render times
const MAX_FILE_SIZE = 30_000_000 // 30 MB

class App extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      // Used to make sure the same tab can't be
      // opened multiple times
      openedFilePaths: new Set(),
      openedTabs: [],
      activeTabIndex: 0,
      isLoading: false
    }

    this.onSelectFile = this.onSelectFile.bind(this)
    this.onTabClosed = this.onTabClosed.bind(this)
    this.closeAllTabs = this.closeAllTabs.bind(this)
    this.renderTab = this.renderTab.bind(this)
    this.findTabIndex = this.findTabIndex.bind(this)
    this.setActiveTabIndex = this.setActiveTabIndex.bind(this)
    this.updateViewport = debounce(this.updateViewport.bind(this), 250)
    this.loadFile = this.loadFile.bind(this)
    this.toggleLoadingOverlay = this.toggleLoadingOverlay.bind(this)
    this.onForceRenderEditor = this.onForceRenderEditor.bind(this)
  }

  componentDidMount() {
    this.updateViewport()
    window.addEventListener('resize', this.updateViewport)

    // Lazy load the editor so the Editor component can render quicker
    import('monaco-editor/esm/vs/editor/editor.api.js')
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateViewport)
  }

  updateViewport() {
    // Updates the --vh variable used in the height mixin
    setCSSVar('--vh', window.innerHeight * 0.01 + 'px')
  }

  onSelectFile(node) {
    const { openedFilePaths, openedTabs } = this.state

    // Don't open this file in a new tab since it's already open
    if (openedFilePaths.has(node.path)) {
      this.setActiveTabIndex(this.findTabIndex(node.path))
      return
    }

    const initialTabState = {
      isLoading: true,
      index: openedTabs.length,
      title: node.name,
      path: node.path,
      isTooLarge: false,
      canEditorRender: false,
      content: ''
    }

    // Render a temporary loading tab while we wait for the
    // GitHub API request to finish
    this.setState(
      {
        openedFilePaths: new Set(openedFilePaths.add(node.path)),
        activeTabIndex: openedTabs.length,
        openedTabs: [...openedTabs, initialTabState]
      },
      () => this.loadFile(node)
    )
  }

  loadFile(file) {
    const openedTabs = this.state.openedTabs
    let tabIndex = this.findTabIndex(file.path)

    if (file.size >= MAX_FILE_SIZE) {
      openedTabs[tabIndex].isLoading = false
      openedTabs[tabIndex].isTooLarge = true
      this.setState({ openedTabs })
      return
    }

    GitHubAPI.getFile(file.url).then(content => {
      // Need to find this tab again to make sure it wasn't closed.
      // The index will be -1 if the tab was closed
      // before the request finished loading
      tabIndex = this.findTabIndex(file.path)

      if (tabIndex === -1) {
        return
      }

      try {
        // Try to decode this file to see if it can
        // be rendered by the editor as plaintext
        openedTabs[tabIndex].content = base64DecodeUnicode(content)
        openedTabs[tabIndex].canEditorRender = true
      } catch (e) {
        // If decoding fails, let the FileRenderer render try
        // to render the content
        openedTabs[tabIndex].canEditorRender = false
        openedTabs[tabIndex].content = content
      }

      openedTabs[tabIndex].isLoading = false

      this.setState({ openedTabs: this.state.openedTabs })
    })
  }

  findTabIndex(path) {
    const openedTabs = this.state.openedTabs

    for (let i = 0; i < openedTabs.length; i++) {
      if (openedTabs[i].path === path) {
        return i
      }
    }

    return -1
  }

  renderTab(tab, index) {
    const { title, path, content, isLoading, isTooLarge, canEditorRender } = tab

    if (index !== this.state.activeTabIndex) {
      return <Tab title={title} key={tab.index} hint={title} />
    }

    if (isLoading) {
      return (
        <Tab title={title} key={tab.index} hint={`Loading ${title}`}>
          <LoadingOverlay text={`Loading ${title}...`} />
        </Tab>
      )
    }

    if (isTooLarge) {
      return (
        <Tab title={title} key={tab.index} hint={title}>
          <div className="file-size-warning">
            <p>Sorry, but this file is too large to display.</p>
          </div>
        </Tab>
      )
    }

    const { extension } = getLanguageFromFileName(title)

    return (
      <Tab title={title} key={index} hint={path}>
        {canEditorRender ? (
          <Editor
            fileName={title}
            content={content}
            colorScheme={this.props.mode}
          />
        ) : (
          <FileRenderer
            content={content}
            title={title}
            extension={extension}
            onForceRender={this.onForceRenderEditor}
          />
        )}
      </Tab>
    )
  }

  onForceRenderEditor(editorContent) {
    // Mark this tab as renderable by the editor so we
    // don't get the "unknown text encoding" every time this
    // tab is clicked on
    const { activeTabIndex, openedTabs } = this.state

    openedTabs[activeTabIndex].canEditorRender = true
    openedTabs[activeTabIndex].content = editorContent

    this.setState({ openedTabs })
  }

  onTabClosed(tabIndex) {
    let activeTabIndex = this.state.activeTabIndex
    const openedTabs = this.state.openedTabs.filter((tab, index) => {
      return tabIndex !== index
    })
    const openedFilePaths = new Set(openedTabs.map(node => node.path))

    // If the active tab was closed but there are still tabs left,
    // set the tab to the left of the closed tab as the active tab,
    // but only as long as there are still tabs to the left.
    if (tabIndex === activeTabIndex) {
      activeTabIndex = Math.max(activeTabIndex - 1, 0)
    }

    // Make sure the currently active tab doesn't change when tabs
    // to the left of it are closed
    if (tabIndex < activeTabIndex) {
      activeTabIndex -= 1
    }

    this.setState({
      openedFilePaths,
      openedTabs,
      activeTabIndex
    })
  }

  closeAllTabs() {
    this.setState({
      openedFilePaths: new Set(),
      openedTabs: [],
      isLoading: false
    })
  }

  toggleLoadingOverlay() {
    this.setState({ isLoading: !this.state.isLoading })
  }

  setActiveTabIndex(activeTabIndex) {
    this.setState({ activeTabIndex })
  }

  render() {
    const colorClass = `${this.props.mode}-mode`
    const { activeTabIndex, openedTabs, isLoading } = this.state

    return (
      <div className={`app ${colorClass}`}>
        <ExplorerPanel
          onSelectFile={this.onSelectFile}
          onSearchFinished={this.closeAllTabs}
          onSearchStarted={this.toggleLoadingOverlay}
        />
        <div className="right">
          <ResizePanel />
          {isLoading ? (
            <LoadingOverlay text="Loading repository..." />
          ) : (
            <TabView
              onTabClosed={this.onTabClosed}
              activeTabIndex={activeTabIndex}
              onSelectTab={this.setActiveTabIndex}
              onCloseAllClick={this.closeAllTabs}
            >
              {openedTabs.map(this.renderTab)}
            </TabView>
          )}
        </div>
      </div>
    )
  }
}

App.propTypes = {
  mode: PropTypes.oneOf(['dark', 'light'])
}

App.defaultProps = {
  mode: 'light'
}

export default App
