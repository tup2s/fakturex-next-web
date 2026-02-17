import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import Footer from './components/common/Footer';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <div className="main-content">
          <Sidebar />
          <Switch>
            <Route path="/" exact component={Dashboard} />
            <Route path="/invoices" component={Invoices} />
            <Route path="/customers" component={Customers} />
            <Route path="/products" component={Products} />
            <Route path="/settings" component={Settings} />
          </Switch>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;