import React from 'react'
import RateLimitModal from './modals/RateLimitModal'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import ReactModal from 'react-modal'
import AuthErrorModal from './modals/AuthErrorModal'

ReactModal.setAppElement('#app')

const ModalTypes = {
  RATE_LIMIT: 'RATE_LIMIT',
  AUTH_ERROR: 'AUTH_ERROR'
}

const ModalComponents = {
  RATE_LIMIT: RateLimitModal,
  AUTH_ERROR: AuthErrorModal
}

// Handles orchestrating what modals should be shown depending on what
// modal type is dispatched in the modal store
const ModalRoot = ({ isOpen, modalType, modalProps }) => {
  if (!isOpen || !modalType || !ModalComponents[modalType]) {
    return null
  }

  const Modal = ModalComponents[modalType]

  return <Modal {...modalProps} />
}

const mapStateToProps = state => ({
  isOpen: state.modal.isOpen,
  modalType: state.modal.modalType,
  modalProps: state.modal.modalProps
})

ModalRoot.propTypes = {
  modalType: PropTypes.oneOf(Object.keys(ModalComponents)),
  isOpen: PropTypes.bool,
  modalProps: PropTypes.object
}

export { ModalTypes }
export default connect(mapStateToProps)(ModalRoot)