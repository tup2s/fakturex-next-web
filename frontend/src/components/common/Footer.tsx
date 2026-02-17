import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer>
            <div className="container">
                <p>&copy; {new Date().getFullYear()} FAKTUREX NEXT. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;