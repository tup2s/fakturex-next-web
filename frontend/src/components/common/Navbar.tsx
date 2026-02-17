import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">Fakturex Next</Link>
            </div>
            <ul className="navbar-menu">
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
        </nav>
    );
};

export default Navbar;