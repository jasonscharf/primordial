import React from "react";

export interface CardHeaderProps {
    title?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = (props) => {
    const { title } = props;

    return (
        <div className="primo-card-header">
            <h1>{title}</h1>
        </div>
    );
};
