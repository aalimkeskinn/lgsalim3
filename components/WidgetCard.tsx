import React from "react";

interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode; // opsiyonel: ikon, buton vs.
}

const WidgetCard: React.FC<WidgetCardProps> = ({ title, children, right }) => (
  <div className="bg-white rounded-lg shadow-sm p-3 flex flex-col gap-1 min-w-0">
    <div className="flex items-center justify-between mb-1">
      <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

export default WidgetCard;

