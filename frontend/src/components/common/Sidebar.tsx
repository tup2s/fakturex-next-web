import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar: React.FC = () => {
    return (
        <div className="sidebar">
            <h2>Fakturex Next</h2>
            <ul>
                <li>
                    <Link to="/dashboard">Dashboard</Link>
                </li>
                <li>
                    <Link to="/invoices">Invoices</Link>
                </li>
                <li>
                    <Link to="/customers">Customers</Link>
                </li>
                <li>
                    <Link to="/products">Products</Link>
                </li>
                <li>
                    <Link to="/settings">Settings</Link>
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;