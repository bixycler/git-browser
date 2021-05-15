import '../style/tree-node.scss'
import React from 'react'
import { FaRegFile, FaFolder, FaFolderOpen } from 'react-icons/fa'
import { FiChevronRight, FiChevronDown } from 'react-icons/fi'
import PropTypes from 'prop-types'
import { withClasses } from '../scripts/util'

const getPaddingLeft = (level, type) => {
  const defaultPadding = 20

  if (level === 0) {
    if (type === 'file') {
      return defaultPadding
    }
    return 8
  }

  let paddingLeft = level * defaultPadding

  if (type === 'file') {
    paddingLeft += defaultPadding
  }

  return paddingLeft
}

const getNodeLabel = node => {
  const path = node.path.split('/').filter(str => !!str.trim())
  return path[path.length - 1]
}

const renderIcon = (type, isOpen) => {
  if (type === 'file') {
    return <FaRegFile />
  }

  if (type === 'folder' && isOpen) {
    return <FaFolderOpen className="folder-icon" />
  }

  return <FaFolder className="folder-icon" />
}

const renderToggleIcon = (type, isOpen) => {
  if (type === 'file') {
    return null
  }

  return type === 'folder' && isOpen ? <FiChevronDown /> : <FiChevronRight />
}

const onSelectNode = (node, props) => {
  if (node.type === 'folder') {
    props.onToggle(node)
  } else {
    props.onSelectNode(node)
  }
}

const TreeNode = props => {
  const { node, getChildren, level, showPath, activeFilePath } = props
  const children = getChildren(node)
  const nodeLabel = getNodeLabel(node)
  const classes = withClasses({
    [props.className]: true,
    'is-active': node.path === activeFilePath
  })

  return (
    <>
      <div
        className={`tree-node ${classes}`}
        title={node.path}
        style={{ paddingLeft: getPaddingLeft(level, node.type) }}
        onClick={onSelectNode.bind(this, node, props)}
      >
        <div className="tree-node__icon toggle">
          {renderToggleIcon(node.type, node.isOpen)}
        </div>
        <div className="tree-node__icon type">
          {renderIcon(node.type, node.isOpen)}
        </div>
        <div className="node-label">
          {nodeLabel} {showPath && <small>{node.path}</small>}
        </div>
      </div>
      {node.isOpen &&
        children.map(childNode => (
          <TreeNode
            {...props}
            node={childNode}
            level={level + 1}
            key={childNode.path}
          />
        ))}
    </>
  )
}

TreeNode.propTypes = {
  onToggle: PropTypes.func,
  showPath: PropTypes.bool,
  className: PropTypes.string,
  activeFilePath: PropTypes.string,
  level: PropTypes.number,
  node: PropTypes.shape({
    type: PropTypes.oneOf(['file', 'folder']),
    name: PropTypes.string,
    path: PropTypes.string,
    url: PropTypes.string,
    isRoot: PropTypes.bool,
    isOpen: PropTypes.bool
  }).isRequired,
  getChildren: PropTypes.func,
  onSelectNode: PropTypes.func.isRequired
}

TreeNode.defaultProps = {
  level: 0,
  onToggle: () => {},
  getChildren: () => {},
  className: '',
  activeFilePath: '',
  showPath: false
}

export default TreeNode