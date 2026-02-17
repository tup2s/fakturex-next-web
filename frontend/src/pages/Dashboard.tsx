import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css'; // Assuming you have a CSS file for styling

const Dashboard: React.FC = () => {
    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            <div className="dashboard-links">
                <Link to="/invoices">Invoices</Link>
                <Link to="/customers">Customers</Link>
                <Link to="/products">Products</Link>
                <Link to="/settings">Settings</Link>
            </div>
        </div>
    );
};

export default Dashboard;