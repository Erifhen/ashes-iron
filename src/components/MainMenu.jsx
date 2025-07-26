// src/components/MainMenu.jsx
import React from 'react';

function MainMenu({ onSelectTutorial, onGoToRoomLobby, onSelectCampaign }) { // Updated props
    return (
        <div className="main-menu flex flex-col items-center justify-center p-4">
            <h1 className="text-5xl font-extrabold mb-8 text-white">Ashes of Iron</h1>

            <div className="bg-gray-700 p-8 rounded-lg shadow-xl w-full max-w-md">
                <button
                    onClick={onSelectTutorial} // Call new prop
                    className="btn w-full mb-4 bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                    Modo Tutorial
                </button>
                <button
                    onClick={onGoToRoomLobby}
                    className="btn w-full mb-4 bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
                >
                    Sala de Treinamento
                </button>
                <button
                    onClick={onSelectCampaign} // Placeholder for future
                    className="btn w-full bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    disabled // Disable for now
                >
                    Campanha (Em Breve)
                </button>
            </div>
        </div>
    );
}

export default MainMenu;
