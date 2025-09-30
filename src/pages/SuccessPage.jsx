import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Download, Home } from 'lucide-react';

const SuccessPage = () => {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-md mx-auto text-center">
        <div className="card">
          <div className="card-content">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Purchase Successful!
            </h1>
            
            <p className="text-dark-400 mb-6">
              Your beat has been added to your purchases. You can now download it anytime.
            </p>
            
            <div className="space-y-3">
              <Link
                to="/purchases"
                className="btn btn-primary w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                View Purchases
              </Link>
              
              <Link
                to="/"
                className="btn btn-outline w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
