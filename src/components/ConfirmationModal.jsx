// src/components/ConfirmationModal.jsx
import React from 'react';

function ConfirmationModal({ message, onConfirmYes, onConfirmNo }) {
  return (
    <div id="confirmationModal" className="modal-overlay">
      <div className="modal-content">
        <p className="text-xl" id="modalMessage">{message}</p>
        <div className="modal-buttons">
          <button id="confirmYes" className="btn bg-green-600 hover:bg-green-700" onClick={onConfirmYes}>Sim</button>
          <button id="confirmNo" className="btn bg-red-600 hover:bg-red-700" onClick={onConfirmNo}>Não</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;