import React from 'react';

const MicrosoftLogoIcon: React.FC = () => (
    <div className="flex items-center space-x-1.5">
        <div className="grid grid-cols-2 gap-1">
            <div className="w-5 h-5 bg-[#f25022]"></div>
            <div className="w-5 h-5 bg-[#7fba00]"></div>
            <div className="w-5 h-5 bg-[#00a4ef]"></div>
            <div className="w-5 h-5 bg-[#ffb900]"></div>
        </div>
        <span className="text-xl font-semibold text-gray-600">Microsoft</span>
    </div>
);

export default MicrosoftLogoIcon;
